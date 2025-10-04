"""Queue manager with Redis distributed locking."""
import redis
import logging
from django.conf import settings
from django.db import transaction
from .models import Job, JobStatus, TargetPlatform

logger = logging.getLogger(__name__)


class QueueManager:
    """Queue manager with Redis-based distributed locking."""

    def __init__(self):
        """Initialize Redis connection."""
        self.redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True
        )
        self.max_attempts = settings.MAX_RETRIES

    def enqueue(self, job):
        """
        Enqueue a job (already saved to database).

        Args:
            job: Job instance
        """
        logger.info(
            f"Job {job.job_id} enqueued for {job.target} "
            f"(app_version: {job.app_version_id}, priority: {job.priority})"
        )

    def dequeue_for_target(self, target):
        """
        Dequeue highest-priority job for target with distributed locking.

        Args:
            target: TargetPlatform value

        Returns:
            Job instance or None
        """
        # Try to use Redis lock if available
        lock = None
        try:
            lock_name = f"queue:dequeue:{target}"
            lock = self.redis_client.lock(lock_name, timeout=5, blocking_timeout=1)
            if not lock.acquire(blocking=False):
                logger.debug(f"Could not acquire lock for {target} dequeue")
                return None
        except Exception as e:
            # Redis not available - continue without lock (single instance mode)
            logger.debug(f"Redis lock unavailable, proceeding without lock: {e}")

        try:
            # Get highest priority queued job for target
            with transaction.atomic():
                job = Job.objects.select_for_update().filter(
                    status=JobStatus.QUEUED,
                    target=target
                ).order_by('priority', 'created_at').first()

                if job:
                    logger.info(
                        f"Dequeued job {job.job_id} for {target} "
                        f"(priority: {job.priority}, app_version: {job.app_version_id})"
                    )

                return job

        finally:
            if lock:
                try:
                    lock.release()
                except:
                    pass

    def requeue_if_retryable(self, job):
        """
        Requeue job if it hasn't exceeded max attempts.

        Args:
            job: Job instance

        Returns:
            True if requeued, False otherwise
        """
        if job.attempts < self.max_attempts:
            job.status = JobStatus.QUEUED
            job.error_message = None
            job.save(update_fields=['status', 'error_message', 'updated_at'])

            logger.info(
                f"Job {job.job_id} requeued (attempt {job.attempts}/{self.max_attempts})"
            )
            return True
        else:
            logger.warning(
                f"Job {job.job_id} exceeded max attempts ({self.max_attempts}), not requeuing"
            )
            return False

    def get_queue_status(self):
        """
        Get queue status grouped by app_version_id.

        Returns:
            Dictionary mapping app_version_id to list of jobs
        """
        queued_jobs = Job.objects.filter(
            status=JobStatus.QUEUED
        ).order_by('app_version_id', 'priority', 'created_at')

        grouped = {}
        for job in queued_jobs:
            if job.app_version_id not in grouped:
                grouped[job.app_version_id] = []

            grouped[job.app_version_id].append({
                'job_id': str(job.job_id),
                'priority': job.priority,
                'target': job.target,
                'attempts': job.attempts,
                'created_at': job.created_at.isoformat(),
            })

        return grouped

    def get_queue_length(self, target=None):
        """
        Get number of queued jobs.

        Args:
            target: Optional target platform filter

        Returns:
            Number of queued jobs
        """
        query = Job.objects.filter(status=JobStatus.QUEUED)

        if target:
            query = query.filter(target=target)

        return query.count()

    def check_redis_connection(self):
        """Check if Redis connection is healthy."""
        try:
            self.redis_client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False


# Global queue manager instance
queue_manager = QueueManager()
