"""Django management command to setup/register configured agents."""
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from queueforge.jobs.models import Agent, TargetPlatform

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Setup agents from environment configuration'

    def handle(self, *args, **options):
        """Register agents based on configured device endpoints."""

        agents_created = []
        agents_updated = []

        # Register Android emulator (ADB connection)
        if settings.ANDROID_EMULATOR_HOST:
            agent, created = Agent.objects.update_or_create(
                agent_id=f'android-{settings.ANDROID_EMULATOR_HOST}',
                defaults={
                    'target': TargetPlatform.ANDROID,
                    'busy': False,
                    'last_heartbeat': timezone.now(),  # Set heartbeat so it's considered healthy
                    'metadata': {
                        'connection_type': 'adb',
                        'host': settings.ANDROID_EMULATOR_HOST,
                        'description': 'ADB-connected Android emulator/device'
                    }
                }
            )
            if created:
                agents_created.append(agent.agent_id)
            else:
                agents_updated.append(agent.agent_id)

        # Register iOS simulator (WebDriver HTTP connection)
        if settings.IOS_SIMULATOR_HOST:
            agent, created = Agent.objects.update_or_create(
                agent_id=f'ios-{settings.IOS_SIMULATOR_HOST}',
                defaults={
                    'target': TargetPlatform.IOS,
                    'busy': False,
                    'last_heartbeat': timezone.now(),  # Set heartbeat so it's considered healthy
                    'metadata': {
                        'connection_type': 'webdriver',
                        'host': settings.IOS_SIMULATOR_HOST,
                        'vnc_host': settings.IOS_SIMULATOR_VNC,
                        'description': 'WebDriver-connected iOS simulator'
                    }
                }
            )
            if created:
                agents_created.append(agent.agent_id)
            else:
                agents_updated.append(agent.agent_id)

        # Output results
        if agents_created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Created agents: {", ".join(agents_created)}'
                )
            )

        if agents_updated:
            self.stdout.write(
                self.style.WARNING(
                    f'↻ Updated agents: {", ".join(agents_updated)}'
                )
            )

        if not agents_created and not agents_updated:
            self.stdout.write(
                self.style.ERROR(
                    '✗ No agents configured. Set ANDROID_EMULATOR_HOST or IOS_SIMULATOR_HOST in .env'
                )
            )

        # Show all registered agents
        all_agents = Agent.objects.all()
        if all_agents:
            self.stdout.write('\nRegistered agents:')
            for agent in all_agents:
                status = '🟢 Available' if not agent.busy else '🔴 Busy'
                self.stdout.write(f'  - {agent.agent_id} ({agent.target}) {status}')
