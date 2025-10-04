"""Django management command to run the job scheduler."""
import asyncio
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from asgiref.sync import sync_to_async
from queueforge.jobs.models import TargetPlatform
from queueforge.jobs.queue_manager import queue_manager
from queueforge.jobs.agent_manager import agent_manager
from queueforge.jobs.job_executor import execute_job

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run the job scheduler'

    def __init__(self):
        super().__init__()
        self.running = False

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=settings.SCHEDULER_INTERVAL,
            help='Scheduler polling interval in seconds'
        )

    def handle(self, *args, **options):
        self.interval = options['interval']
        self.running = True

        self.stdout.write(
            self.style.SUCCESS(
                f'Starting job scheduler with {self.interval}s interval'
            )
        )

        # Run async event loop
        asyncio.run(self.run_scheduler())

    async def run_scheduler(self):
        """Main scheduler loop."""
        while self.running:
            try:
                # Process jobs for each target platform
                for target in [TargetPlatform.ANDROID, TargetPlatform.IOS]:
                    await self._process_target(target)

                # Skip cleanup for static agents (they don't send heartbeats)
                # removed = await sync_to_async(agent_manager.cleanup_stale_agents)()
                # if removed > 0:
                #     logger.info(f"Cleaned up {removed} stale agents")

            except KeyboardInterrupt:
                self.stdout.write(self.style.WARNING('Stopping scheduler...'))
                self.running = False
                break

            except Exception as e:
                logger.error(f"Scheduler error: {e}", exc_info=True)

            # Wait for next cycle
            await asyncio.sleep(self.interval)

    async def _process_target(self, target):
        """Process jobs for a specific target platform."""
        # Get available agent for this target (async-safe)
        agent = await sync_to_async(agent_manager.get_available_agent)(target)

        if not agent:
            logger.debug(f"No available agents for {target}")
            return

        # Dequeue highest priority job for this target (async-safe)
        job = await sync_to_async(queue_manager.dequeue_for_target)(target)

        if not job:
            logger.debug(f"No queued jobs for {target}")
            return

        # Mark agent as busy (async-safe)
        await sync_to_async(agent.set_busy)(job)

        logger.info(
            f"Assigning job {job.job_id} to agent {agent.agent_id} "
            f"(target: {target}, priority: {job.priority})"
        )

        # Execute job asynchronously
        asyncio.create_task(
            self._execute_job_wrapper(job, agent)
        )

    async def _execute_job_wrapper(self, job, agent):
        """Wrapper to execute job and handle agent cleanup."""
        try:
            # Execute the job
            await execute_job(job, agent)

        except Exception as e:
            logger.error(f"Job {job.job_id} execution failed: {e}", exc_info=True)

        finally:
            # Always mark agent as available (async-safe)
            await sync_to_async(agent.set_available)()
            logger.debug(f"Agent {agent.agent_id} marked as available")
