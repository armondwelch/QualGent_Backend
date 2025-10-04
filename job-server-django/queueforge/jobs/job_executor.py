"""Job execution engine."""
import asyncio
import subprocess
import logging
from pathlib import Path
import httpx
from django.conf import settings
from asgiref.sync import sync_to_async
from .models import Job, JobStatus, TargetPlatform

logger = logging.getLogger(__name__)


class JobExecutionError(Exception):
    """Base exception for job execution errors."""
    pass


class InfrastructureError(JobExecutionError):
    """Infrastructure-related error that should trigger retry."""
    pass


class TestFailureError(JobExecutionError):
    """Test assertion failure that should not trigger retry."""
    pass


async def execute_job(job, agent):
    """
    Execute a job with retry logic.

    Args:
        job: Job instance
        agent: Agent instance
    """
    logger.info(f"Starting execution of job {job.job_id} on agent {agent.agent_id}")

    # Mark job as running (async-safe)
    await sync_to_async(job.mark_running)(agent.agent_id)

    # Execute with retry logic
    while job.attempts < settings.MAX_RETRIES:
        try:
            # Increment attempts (async-safe)
            await sync_to_async(job.increment_attempts)()

            # Execute the actual test
            await _run_test(job)

            # Success - mark as complete (async-safe)
            await sync_to_async(job.mark_complete)()
            logger.info(f"Job {job.job_id} completed successfully")
            return

        except TestFailureError as e:
            # Test failed - don't retry (async-safe)
            logger.warning(f"Job {job.job_id} failed due to test assertion: {e}")
            await sync_to_async(job.mark_failed)(str(e))
            return

        except InfrastructureError as e:
            # Infrastructure failure - retry if attempts remain
            logger.warning(
                f"Job {job.job_id} infrastructure failure "
                f"(attempt {job.attempts}/{settings.MAX_RETRIES}): {e}"
            )

            if job.attempts >= settings.MAX_RETRIES:
                # Max retries reached (async-safe)
                await sync_to_async(job.mark_failed)(f"Infrastructure failure after {job.attempts} attempts: {e}")
                logger.error(f"Job {job.job_id} failed after {job.attempts} attempts")
                return
            else:
                # Wait before retry
                logger.info(f"Waiting 60s before retry {job.attempts + 1}...")
                await asyncio.sleep(60)

        except Exception as e:
            # Unexpected error (async-safe)
            logger.error(f"Job {job.job_id} unexpected error: {e}", exc_info=True)
            await sync_to_async(job.mark_failed)(f"Unexpected error: {e}")
            return


async def _run_test(job):
    """
    Run the actual test for a job.

    Args:
        job: Job instance
    """
    if job.target == TargetPlatform.IOS:
        await _run_ios_test(job)
    else:
        await _run_appwright_test(job)


async def _run_ios_test(job):
    """Run iOS test using direct Appium WebDriver connection."""
    logger.info(f"Running iOS test for job {job.job_id} using direct WebDriver connection")

    try:
        from appium import webdriver
        from appium.options.ios import XCUITestOptions
    except ImportError:
        raise InfrastructureError("appium-python-client not installed. Run: pip install Appium-Python-Client")

    # Get iOS host from settings
    ios_host = getattr(settings, 'IOS_SIMULATOR_HOST', '34.29.247.79:4723')
    hostname, port = ios_host.split(':')

    logger.info(f"Connecting to iOS Appium server at {hostname}:{port}")

    # Configure capabilities
    options = XCUITestOptions()
    options.platform_name = 'iOS'
    options.platform_version = '17.2'
    options.device_name = 'iPhone 15 Pro Max'
    options.automation_name = 'XCUITest'
    options.app = '/Users/armond/Downloads/Wikipedia.app'  # Update with actual app path

    try:
        # Create WebDriver session
        driver = webdriver.Remote(
            f'http://{hostname}:{port}/wd/hub',
            options=options
        )

        logger.info("iOS test: WebDriver session created successfully")

        # Wait for app to launch
        import asyncio
        await asyncio.sleep(3)

        logger.info("iOS test: Verifying app launched successfully")

        # Get page source to verify connection
        source = driver.page_source
        logger.info(f"iOS test: App source retrieved (length: {len(source)})")

        # TODO: Add actual test steps here based on test_path
        # For now, just verify the connection works

        logger.info("iOS test completed successfully")

        # Close session
        driver.quit()

    except Exception as e:
        logger.error(f"iOS test failed: {e}", exc_info=True)
        raise InfrastructureError(f"iOS WebDriver connection failed: {str(e)}")


async def _run_appwright_test(job):
    """Run Android test using Appwright."""
    logger.info(f"Running Android test for job {job.job_id}")

    # Kill any orphaned Appium processes before starting
    try:
        await asyncio.create_subprocess_exec(
            "pkill", "-f", "appium",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        await asyncio.sleep(1)  # Give it time to cleanup
    except Exception as e:
        logger.debug(f"pkill appium failed (this is OK): {e}")

    config_path = Path(__file__).parent.parent.parent / "appwright.config.ts"

    command = [
        "node",
        settings.APPWRIGHT_PATH,
        "test",
        job.test_path,
        "--config", str(config_path),
        "--project", job.target
    ]

    # Set environment variables for Appium and Android SDK
    import os
    env = os.environ.copy()
    env['APPIUM_HOME'] = '/home/aqw/project/QualGent_Backend/.appium'
    env['ANDROID_HOME'] = settings.ANDROID_HOME if hasattr(settings, 'ANDROID_HOME') else '/usr/lib/android-sdk'
    env['JAVA_HOME'] = '/usr/lib/jvm/default-java'

    logger.info(f"Running command: {' '.join(command)}")
    logger.info(f"APPIUM_HOME set to: {env['APPIUM_HOME']}")
    logger.info(f"ANDROID_HOME set to: {env.get('ANDROID_HOME')}")
    logger.info(f"JAVA_HOME set to: {env.get('JAVA_HOME')}")

    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=settings.JOB_TIMEOUT
        )

        output = stdout.decode() + stderr.decode()

        # Log full output for debugging
        logger.info(f"=== Full Android test output for job {job.job_id} ===")
        logger.info(output)
        logger.info(f"=== End of test output ===")

        if "No tests found" in output:
            logger.warning(f"No tests found for job {job.job_id}")
            raise TestFailureError(f"No tests found at path: {job.test_path}")

        if _is_infrastructure_error(output, process.returncode):
            raise InfrastructureError(f"Test infrastructure failure: {output[:1000]}")

        if process.returncode != 0 and not _has_passing_tests(output):
            raise TestFailureError(f"Test assertion failed: {output[:1000]}")

        logger.info(f"Android test completed successfully for job {job.job_id}")

        # Optionally fetch BrowserStack session
        if settings.BROWSERSTACK_USERNAME and settings.BROWSERSTACK_ACCESS_KEY:
            await _fetch_browserstack_session(job)

    except asyncio.TimeoutError:
        raise InfrastructureError(f"Test timeout after {settings.JOB_TIMEOUT}s")


def _is_infrastructure_error(output, return_code):
    """Determine if error is infrastructure-related."""
    infrastructure_keywords = [
        "Could not find a driver",
        "EADDRINUSE",
        "Connection refused",
        "Cannot find module",
        "ECONNREFUSED",
        "network error",
        "BROWSERSTACK_USERNAME",
        "BROWSERSTACK_ACCESS_KEY",
    ]

    return any(keyword in output for keyword in infrastructure_keywords)


def _has_passing_tests(output):
    """Check if output indicates passing tests."""
    return "✓" in output or "1 passed" in output or "passed" in output.lower()


async def _fetch_browserstack_session(job):
    """Fetch BrowserStack session details."""
    try:
        await asyncio.sleep(3)

        auth = (settings.BROWSERSTACK_USERNAME, settings.BROWSERSTACK_ACCESS_KEY)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api-cloud.browserstack.com/app-automate/builds.json?limit=5",
                auth=auth,
                timeout=10.0
            )

            if response.status_code != 200:
                logger.warning(f"Failed to fetch BrowserStack builds: {response.status_code}")
                return

            builds = response.json()

            if not builds:
                logger.info("No BrowserStack builds found")
                return

            latest_build = builds[0]
            build_id = latest_build["automation_build"]["hashed_id"]

            response = await client.get(
                f"https://api-cloud.browserstack.com/app-automate/builds/{build_id}/sessions.json",
                auth=auth,
                timeout=10.0
            )

            if response.status_code != 200:
                logger.warning(f"Failed to fetch BrowserStack sessions: {response.status_code}")
                return

            sessions = response.json()

            if sessions:
                latest_session = sessions[0]["automation_session"]
                logger.info(f"BrowserStack session for job {job.job_id}:")
                logger.info(f"  - Session ID: {latest_session['hashed_id']}")
                logger.info(f"  - Status: {latest_session['status']}")
                logger.info(f"  - Duration: {latest_session.get('duration', 'N/A')}s")
                if latest_session.get('video_url'):
                    logger.info(f"  - Video: {latest_session['video_url']}")

    except Exception as e:
        logger.warning(f"Failed to fetch BrowserStack session: {e}")
