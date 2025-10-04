"""URL configuration for QueueForge project."""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from queueforge.jobs import views

# Create router for ViewSets
router = routers.DefaultRouter()
router.register(r'jobs', views.JobViewSet, basename='job')
router.register(r'agents', views.AgentViewSet, basename='agent')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include(router.urls)),

    # Additional custom endpoints
    path('debug/queue/', views.queue_status, name='queue-status'),
    path('queue/length/', views.queue_length, name='queue-length'),
    path('health/', views.health_check, name='health-check'),

    # Streaming endpoints
    path('streams/', views.streams, name='streams'),
    path('devices/', views.devices, name='devices'),
]
