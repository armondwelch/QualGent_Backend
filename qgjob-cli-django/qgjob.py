#!/usr/bin/env python3
"""QualGent CLI tool for job submission and status checking."""
import os
import sys
from typing import Optional
import httpx
import click
from rich.console import Console
from rich.table import Table
from rich import print as rprint
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

console = Console()

# Default job server URL
DEFAULT_JOB_SERVER_URL = os.getenv("JOB_SERVER_URL", "http://192.168.49.2:31741")


class JobClient:
    """Client for interacting with the job server API."""

    def __init__(self, base_url: str = DEFAULT_JOB_SERVER_URL):
        """Initialize client with base URL."""
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(timeout=30.0)

    def submit_job(
        self,
        org_id: str,
        app_version_id: str,
        test_path: str,
        priority: int,
        target: str
    ) -> dict:
        """Submit a new job to the server."""
        payload = {
            "org_id": org_id,
            "app_version_id": app_version_id,
            "test_path": test_path,
            "priority": priority,
            "target": target
        }

        response = self.client.post(f"{self.base_url}/jobs/", json=payload)
        response.raise_for_status()

        return response.json()

    def get_job_status(self, job_id: str) -> dict:
        """Get status of a job."""
        response = self.client.get(f"{self.base_url}/jobs/{job_id}/status/")
        response.raise_for_status()

        return response.json()

    def get_job_details(self, job_id: str) -> dict:
        """Get full details of a job."""
        response = self.client.get(f"{self.base_url}/jobs/{job_id}/")
        response.raise_for_status()

        return response.json()

    def list_jobs(
        self,
        status: Optional[str] = None,
        target: Optional[str] = None,
        limit: int = 100
    ) -> list:
        """List jobs with optional filters."""
        params = {"limit": limit}
        if status:
            params["status_filter"] = status
        if target:
            params["target"] = target

        response = self.client.get(f"{self.base_url}/jobs/", params=params)
        response.raise_for_status()

        return response.json()

    def get_queue_status(self) -> dict:
        """Get current queue status."""
        response = self.client.get(f"{self.base_url}/debug/queue/")
        response.raise_for_status()

        return response.json()

    def close(self):
        """Close the HTTP client."""
        self.client.close()


@click.group()
@click.option(
    "--server-url",
    default=DEFAULT_JOB_SERVER_URL,
    envvar="JOB_SERVER_URL",
    help="Job server URL"
)
@click.pass_context
def cli(ctx, server_url: str):
    """QualGent CLI - Submit and manage test jobs."""
    ctx.ensure_object(dict)
    ctx.obj["client"] = JobClient(server_url)


@cli.command()
@click.option("--org-id", required=True, help="Organization ID")
@click.option("--app-version-id", required=True, help="App version ID")
@click.option("--test", "test_path", required=True, help="Path to test file")
@click.option("--priority", type=int, required=True, help="Priority level (1-10)")
@click.option("--target", required=True, type=click.Choice(["android", "ios", "emulator"]), help="Target platform")
@click.pass_context
def submit(ctx, org_id: str, app_version_id: str, test_path: str, priority: int, target: str):
    """Submit a new test job."""
    client: JobClient = ctx.obj["client"]

    try:
        is_ci = os.getenv("CI") == "true"

        if not is_ci:
            console.print(f"[blue]Submitting job...[/blue]")
            console.print(f"  Org ID: {org_id}")
            console.print(f"  App Version: {app_version_id}")
            console.print(f"  Test: {test_path}")
            console.print(f"  Priority: {priority}")
            console.print(f"  Target: {target}")

        result = client.submit_job(org_id, app_version_id, test_path, priority, target)

        job_id = result["job_id"]

        if is_ci:
            print(job_id)
        else:
            console.print(f"[green]✅  Job submitted successfully![/green]")
            console.print(f"[green]Job ID: {job_id}[/green]")

    except httpx.HTTPError as e:
        console.print(f"[red]❌  Failed to submit job: {e}[/red]")
        sys.exit(1)

    finally:
        client.close()


@cli.command()
@click.option("--job-id", required=True, help="Job ID to check")
@click.option("--verbose", "-v", is_flag=True, help="Show full job details")
@click.pass_context
def status(ctx, job_id: str, verbose: bool):
    """Check job status."""
    client: JobClient = ctx.obj["client"]

    try:
        if verbose:
            result = client.get_job_details(job_id)

            table = Table(title=f"Job Details: {job_id}")
            table.add_column("Field", style="cyan")
            table.add_column("Value", style="white")

            table.add_row("Status", result["status"])
            table.add_row("Target", result["target"])
            table.add_row("Priority", str(result["priority"]))
            table.add_row("Attempts", str(result["attempts"]))
            table.add_row("Org ID", result["org_id"])
            table.add_row("App Version", result["app_version_id"])
            table.add_row("Test Path", result["test_path"])
            table.add_row("Created", result["created_at"])

            if result.get("agent_id"):
                table.add_row("Agent ID", result["agent_id"])
            if result.get("started_at"):
                table.add_row("Started", result["started_at"])
            if result.get("completed_at"):
                table.add_row("Completed", result["completed_at"])
            if result.get("error_message"):
                table.add_row("Error", result["error_message"])

            console.print(table)
        else:
            result = client.get_job_status(job_id)

            status_color = {
                "queued": "yellow",
                "running": "blue",
                "complete": "green",
                "failed": "red"
            }.get(result["status"], "white")

            console.print(f"Job ID: [cyan]{job_id}[/cyan]")
            console.print(f"Status: [{status_color}]{result['status']}[/{status_color}]")
            console.print(f"Attempts: {result['attempts']}")

            if result.get("error_message"):
                console.print(f"[red]Error: {result['error_message']}[/red]")

    except httpx.HTTPError as e:
        console.print(f"[red]❌  Failed to get job status: {e}[/red]")
        sys.exit(1)

    finally:
        client.close()


@cli.command()
@click.option("--status-filter", help="Filter by status (queued/running/complete/failed)")
@click.option("--target", help="Filter by target (android/ios/emulator)")
@click.option("--limit", type=int, default=20, help="Maximum number of jobs to display")
@click.pass_context
def list(ctx, status_filter: Optional[str], target: Optional[str], limit: int):
    """List jobs with optional filters."""
    client: JobClient = ctx.obj["client"]

    try:
        jobs = client.list_jobs(status_filter, target, limit)

        if not jobs:
            console.print("[yellow]No jobs found[/yellow]")
            return

        table = Table(title="Jobs")
        table.add_column("Job ID", style="cyan")
        table.add_column("Status", style="white")
        table.add_column("Target", style="magenta")
        table.add_column("Priority", style="yellow")
        table.add_column("App Version", style="green")
        table.add_column("Created", style="blue")

        for job in jobs:
            status_emoji = {
                "queued": "⏳",
                "running": "🔄",
                "complete": "✅",
                "failed": "❌"
            }.get(job["status"], "❓")

            table.add_row(
                str(job["job_id"])[:12] + "...",
                f"{status_emoji} {job['status']}",
                job["target"],
                str(job["priority"]),
                job["app_version_id"],
                job["created_at"][:19]
            )

        console.print(table)

    except httpx.HTTPError as e:
        console.print(f"[red]❌  Failed to list jobs: {e}[/red]")
        sys.exit(1)

    finally:
        client.close()


@cli.command()
@click.pass_context
def queue(ctx):
    """Show current queue status."""
    client: JobClient = ctx.obj["client"]

    try:
        queue_status = client.get_queue_status()

        if not queue_status:
            console.print("[yellow]Queue is empty[/yellow]")
            return

        for app_version, jobs in queue_status.items():
            table = Table(title=f"App Version: {app_version}")
            table.add_column("Job ID", style="cyan")
            table.add_column("Priority", style="yellow")
            table.add_column("Target", style="magenta")
            table.add_column("Attempts", style="white")
            table.add_column("Created", style="blue")

            for job in jobs:
                table.add_row(
                    job["job_id"][:12] + "...",
                    str(job["priority"]),
                    job["target"],
                    str(job["attempts"]),
                    job["created_at"][:19]
                )

            console.print(table)
            console.print()

    except httpx.HTTPError as e:
        console.print(f"[red]❌  Failed to get queue status: {e}[/red]")
        sys.exit(1)

    finally:
        client.close()


if __name__ == "__main__":
    cli(obj={})
