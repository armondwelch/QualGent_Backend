"""DRF views for jobs and agents API."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import connection
from asgiref.sync import async_to_sync
import redis
import logging

from .models import Job, Agent, JobStatus, TargetPlatform
from .serializers import (
    JobSerializer, JobCreateSerializer, JobStatusSerializer,
    AgentSerializer, AgentCreateSerializer, HealthCheckSerializer
)
from .queue_manager import queue_manager
from .streaming_service import streaming_service

logger = logging.getLogger(__name__)


class JobViewSet(viewsets.ModelViewSet):
    """ViewSet for Job CRUD operations."""

    queryset = Job.objects.all()
    lookup_field = 'job_id'

    def get_serializer_class(self):
        if self.action == 'create':
            return JobCreateSerializer
        elif self.action == 'status':
            return JobStatusSerializer
        return JobSerializer

    def create(self, request, *args, **kwargs):
        """Create a new job and enqueue it."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create job
        job = serializer.save()

        # Enqueue job
        queue_manager.enqueue(job)

        logger.info(
            f"Job {job.job_id} created: org={job.org_id}, "
            f"app_version={job.app_version_id}, target={job.target}"
        )

        return Response(
            JobSerializer(job).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get'])
    def status(self, request, job_id=None):
        """Get job status."""
        job = self.get_object()
        serializer = JobStatusSerializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post', 'delete'])
    def stream(self, request, job_id=None):
        """Start or stop streaming for this job (Android devices)."""
        job = self.get_object()

        if job.target != TargetPlatform.ANDROID:
            return Response(
                {'error': 'Streaming is only supported for Android devices'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Start stream (POST)
        if request.method == 'POST':
            try:
                # Get device ID from request or use default
                device_id = request.data.get('device_id')
                if not device_id:
                    from django.conf import settings
                    device_id = getattr(settings, 'ANDROID_EMULATOR_HOST', '35.192.2.213:5555')

                stream_info = async_to_sync(streaming_service.start_device_stream)(
                    str(job.job_id),
                    device_id
                )

                return Response({
                    'job_id': str(job.job_id),
                    'stream_info': stream_info,
                    'message': 'ws-scrcpy stream started successfully',
                    'instructions': {
                        'web_interface': f"Open {stream_info['web_url']} in your browser to view and control the device",
                        'direct_stream': f"Connect to {stream_info['ws_url']} for raw H264 stream"
                    }
                })

            except Exception as e:
                logger.error(f"Error starting stream for job {job_id}: {e}", exc_info=True)
                return Response(
                    {'error': 'Failed to start stream', 'details': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Stop stream (DELETE)
        elif request.method == 'DELETE':
            try:
                stopped = async_to_sync(streaming_service.stop_device_stream)(str(job.job_id))

                if stopped:
                    return Response({
                        'job_id': str(job.job_id),
                        'message': 'Stream stopped'
                    })
                else:
                    return Response(
                        {'error': 'No active stream found for this job'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            except Exception as e:
                logger.error(f"Error stopping stream for job {job_id}: {e}", exc_info=True)
                return Response(
                    {'error': 'Failed to stop stream', 'details': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

    def get_queryset(self):
        """Filter queryset based on query parameters."""
        queryset = Job.objects.all()

        # Filter by status
        status_filter = self.request.query_params.get('status_filter')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by target
        target = self.request.query_params.get('target')
        if target:
            queryset = queryset.filter(target=target)

        return queryset


class AgentViewSet(viewsets.ModelViewSet):
    """ViewSet for Agent CRUD operations."""

    queryset = Agent.objects.all()
    lookup_field = 'agent_id'

    def get_serializer_class(self):
        if self.action == 'create':
            return AgentCreateSerializer
        return AgentSerializer

    def create(self, request, *args, **kwargs):
        """Register a new agent."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create or update agent
        agent, created = Agent.objects.update_or_create(
            agent_id=serializer.validated_data['agent_id'],
            defaults={
                'target': serializer.validated_data['target'],
                'metadata': serializer.validated_data.get('metadata'),
                'last_heartbeat': timezone.now()
            }
        )

        action_text = "registered" if created else "updated"
        logger.info(f"Agent {agent.agent_id} {action_text} for {agent.target}")

        return Response(
            AgentSerializer(agent).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def heartbeat(self, request, agent_id=None):
        """Update agent heartbeat."""
        agent = self.get_object()
        agent.heartbeat()

        return Response(AgentSerializer(agent).data)

    def get_queryset(self):
        """Filter queryset based on query parameters."""
        queryset = Agent.objects.all()

        # Filter unhealthy agents
        include_unhealthy = self.request.query_params.get('include_unhealthy', 'false')
        if include_unhealthy.lower() != 'true':
            # Only return agents with recent heartbeats
            from django.conf import settings
            timeout = getattr(settings, 'AGENT_HEARTBEAT_TIMEOUT', 60)
            cutoff = timezone.now() - timezone.timedelta(seconds=timeout)
            queryset = queryset.filter(last_heartbeat__gte=cutoff)

        return queryset


@action(detail=False, methods=['get'])
def queue_status(request):
    """Get current queue status grouped by app_version_id."""
    status_data = queue_manager.get_queue_status()
    return Response(status_data)


@action(detail=False, methods=['get'])
def queue_length(request):
    """Get queue length."""
    target_param = request.query_params.get('target')
    target = target_param if target_param else None

    length = queue_manager.get_queue_length(target)

    return Response({
        'queue_length': length,
        'target': target if target else 'all'
    })


@action(detail=False, methods=['get'])
def streams(request):
    """List all active streams."""
    active_streams = streaming_service.get_active_streams()

    return Response({
        'streams': active_streams,
        'total_streams': len(active_streams)
    })


@action(detail=False, methods=['get'])
def devices(request):
    """Get list of connected ADB devices."""
    try:
        device_list = async_to_sync(streaming_service.get_device_list)()

        return Response({
            'devices': device_list,
            'total_devices': len(device_list)
        })
    except Exception as e:
        logger.error(f"Failed to get device list: {e}", exc_info=True)
        return Response(
            {'error': 'Failed to get device list', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@action(detail=False, methods=['get'])
def health_check(request):
    """Health check endpoint."""
    # Check database
    try:
        connection.ensure_connection()
        db_healthy = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_healthy = False

    # Check Redis
    try:
        redis_healthy = queue_manager.check_redis_connection()
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        redis_healthy = False

    data = {
        'status': 'healthy' if (db_healthy and redis_healthy) else 'degraded',
        'timestamp': timezone.now(),
        'database': db_healthy,
        'redis': redis_healthy
    }

    serializer = HealthCheckSerializer(data)
    return Response(serializer.data)
