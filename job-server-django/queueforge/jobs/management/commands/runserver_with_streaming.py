"""Django management command to run server with streaming."""
import asyncio
import logging
from django.core.management.base import BaseCommand
from django.core.management import call_command
import threading
import time

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run Django server with streaming service'

    def add_arguments(self, parser):
        parser.add_argument(
            'addrport',
            nargs='?',
            default='0.0.0.0:3000',
            help='Optional port number, or ipaddr:port'
        )

    def handle(self, *args, **options):
        addrport = options['addrport']

        # Start streaming service in background thread
        def start_streaming():
            from queueforge.jobs.streaming_service import streaming_service

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                loop.run_until_complete(streaming_service.initialize())
                self.stdout.write(
                    self.style.SUCCESS('✓ Streaming service initialized successfully')
                )
                self.stdout.write(
                    self.style.SUCCESS('✓ ws-scrcpy web interface available at: http://localhost:8886')
                )

                # Keep the loop running
                loop.run_forever()
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Streaming service failed to start: {e}')
                )
                self.stdout.write(
                    self.style.WARNING('Streaming functionality will not be available')
                )

        streaming_thread = threading.Thread(target=start_streaming, daemon=True)
        streaming_thread.start()

        # Give streaming service time to start
        time.sleep(2)

        self.stdout.write(
            self.style.SUCCESS(f'Starting Django server on {addrport}...')
        )

        # Start Django development server
        call_command('runserver', addrport)
