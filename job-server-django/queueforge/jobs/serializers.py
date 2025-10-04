"""DRF serializers for jobs and agents."""
from rest_framework import serializers
from .models import Job, Agent, JobStatus, TargetPlatform


class JobSerializer(serializers.ModelSerializer):
    """Serializer for Job model."""

    class Meta:
        model = Job
        fields = [
            'job_id', 'org_id', 'app_version_id', 'test_path',
            'priority', 'target', 'status', 'attempts',
            'agent_id', 'error_message',
            'created_at', 'updated_at', 'started_at', 'completed_at'
        ]
        read_only_fields = [
            'job_id', 'status', 'attempts', 'agent_id',
            'error_message', 'created_at', 'updated_at',
            'started_at', 'completed_at'
        ]


class JobCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating jobs."""

    class Meta:
        model = Job
        fields = ['org_id', 'app_version_id', 'test_path', 'priority', 'target']

    def validate_priority(self, value):
        """Validate priority is between 1-10."""
        if value < 1 or value > 10:
            raise serializers.ValidationError("Priority must be between 1 and 10")
        return value


class JobStatusSerializer(serializers.ModelSerializer):
    """Serializer for job status response."""

    class Meta:
        model = Job
        fields = ['job_id', 'status', 'attempts', 'error_message']
        read_only_fields = fields


class AgentSerializer(serializers.ModelSerializer):
    """Serializer for Agent model."""

    current_job_id = serializers.UUIDField(source='current_job.job_id', read_only=True)

    class Meta:
        model = Agent
        fields = [
            'agent_id', 'target', 'busy', 'current_job_id',
            'last_heartbeat', 'metadata', 'created_at'
        ]
        read_only_fields = ['busy', 'current_job_id', 'last_heartbeat', 'created_at']


class AgentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/registering agents."""

    class Meta:
        model = Agent
        fields = ['agent_id', 'target', 'metadata']


class HealthCheckSerializer(serializers.Serializer):
    """Serializer for health check response."""
    status = serializers.CharField()
    timestamp = serializers.DateTimeField()
    database = serializers.BooleanField()
    redis = serializers.BooleanField()
