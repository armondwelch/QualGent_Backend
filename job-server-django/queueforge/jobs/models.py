"""Django models for jobs and agents."""
from django.db import models
from django.utils import timezone
import uuid


class JobStatus(models.TextChoices):
    """Job status choices."""
    QUEUED = 'queued', 'Queued'
    RUNNING = 'running', 'Running'
    COMPLETE = 'complete', 'Complete'
    FAILED = 'failed', 'Failed'


class TargetPlatform(models.TextChoices):
    """Target platform choices."""
    ANDROID = 'android', 'Android'
    IOS = 'ios', 'iOS'
    EMULATOR = 'emulator', 'Emulator'


class Job(models.Model):
    """Job model for test execution."""

    job_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    org_id = models.CharField(max_length=255, db_index=True)
    app_version_id = models.CharField(max_length=255, db_index=True)
    test_path = models.TextField()
    priority = models.IntegerField(default=1, db_index=True)
    target = models.CharField(
        max_length=20,
        choices=TargetPlatform.choices,
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=JobStatus.choices,
        default=JobStatus.QUEUED,
        db_index=True
    )
    attempts = models.IntegerField(default=0)
    agent_id = models.CharField(max_length=255, null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['priority', 'created_at']
        indexes = [
            models.Index(fields=['status', 'target']),
            models.Index(fields=['app_version_id', 'priority']),
        ]

    def __str__(self):
        return f"Job {self.job_id} - {self.status}"

    def mark_running(self, agent_id):
        """Mark job as running."""
        self.status = JobStatus.RUNNING
        self.agent_id = agent_id
        if not self.started_at:
            self.started_at = timezone.now()
        self.save(update_fields=['status', 'agent_id', 'started_at', 'updated_at'])

    def mark_complete(self):
        """Mark job as complete."""
        self.status = JobStatus.COMPLETE
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at', 'updated_at'])

    def mark_failed(self, error_message=None):
        """Mark job as failed."""
        self.status = JobStatus.FAILED
        self.completed_at = timezone.now()
        if error_message:
            self.error_message = error_message
        self.save(update_fields=['status', 'completed_at', 'error_message', 'updated_at'])

    def increment_attempts(self):
        """Increment attempt counter."""
        self.attempts += 1
        self.save(update_fields=['attempts', 'updated_at'])


class Agent(models.Model):
    """Agent model for device/executor tracking."""

    agent_id = models.CharField(max_length=255, primary_key=True)
    target = models.CharField(
        max_length=20,
        choices=TargetPlatform.choices,
        db_index=True
    )
    busy = models.BooleanField(default=False, db_index=True)
    current_job = models.ForeignKey(
        Job,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_agent'
    )
    last_heartbeat = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['agent_id']

    def __str__(self):
        return f"Agent {self.agent_id} - {self.target}"

    def heartbeat(self):
        """Update heartbeat timestamp."""
        self.last_heartbeat = timezone.now()
        self.save(update_fields=['last_heartbeat'])

    def set_busy(self, job=None):
        """Mark agent as busy."""
        self.busy = True
        self.current_job = job
        self.last_heartbeat = timezone.now()
        self.save(update_fields=['busy', 'current_job', 'last_heartbeat', 'updated_at'])

    def set_available(self):
        """Mark agent as available."""
        self.busy = False
        self.current_job = None
        self.last_heartbeat = timezone.now()
        self.save(update_fields=['busy', 'current_job', 'last_heartbeat', 'updated_at'])

    @property
    def is_healthy(self):
        """Check if agent is healthy based on heartbeat."""
        if not self.last_heartbeat:
            return False
        from django.conf import settings
        timeout = getattr(settings, 'AGENT_HEARTBEAT_TIMEOUT', 60)
        return (timezone.now() - self.last_heartbeat).total_seconds() < timeout
