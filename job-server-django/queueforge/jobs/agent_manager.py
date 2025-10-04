"""Agent management utilities."""
import logging
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from .models import Agent, TargetPlatform

logger = logging.getLogger(__name__)


class AgentManager:
    """Agent management utilities."""

    HEARTBEAT_TIMEOUT = 60  # seconds

    def get_available_agent(self, target):
        """
        Get an available agent for the given target.

        Args:
            target: TargetPlatform value

        Returns:
            Agent instance or None
        """
        cutoff_time = timezone.now() - timedelta(seconds=self.HEARTBEAT_TIMEOUT)

        agent = Agent.objects.filter(
            target=target,
            busy=False,
            last_heartbeat__gte=cutoff_time
        ).first()

        return agent

    def cleanup_stale_agents(self):
        """
        Remove agents that haven't sent heartbeat in 2x timeout period.

        Returns:
            Number of agents removed
        """
        cutoff_time = timezone.now() - timedelta(seconds=self.HEARTBEAT_TIMEOUT * 2)

        stale_agents = Agent.objects.filter(last_heartbeat__lt=cutoff_time)
        count = stale_agents.count()

        for agent in stale_agents:
            logger.warning(f"Removing stale agent {agent.agent_id}")

        stale_agents.delete()

        return count


# Global agent manager instance
agent_manager = AgentManager()
