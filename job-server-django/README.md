# QualGent Backend (Django)

Django-based job scheduling system for mobile app testing with PostgreSQL persistence and Redis-based distributed locking.

## Features

- **Django ORM**: Robust database management with migrations
- **Django REST Framework**: Full-featured REST API with browsable interface
- **Distributed Locking**: Redis locks prevent race conditions
- **Priority Queueing**: Jobs grouped by app version with priority ordering
- **Agent Management**: Dynamic agent registration with health tracking
- **Retry Logic**: Smart retry with infrastructure vs test failure detection
- **Management Commands**: Django commands for scheduler and maintenance
- **Admin Interface**: Django admin for manual job/agent management

## Installation

```bash
cd job-server-django

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

## Configuration

Create `.env` file with required variables:

```bash
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/qualgentdb

# Redis
REDIS_URL=redis://localhost:6379/0

# BrowserStack
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_key
```

## Running

### Development Server

```bash
# Run Django development server
python manage.py runserver 0.0.0.0:3000

# Run scheduler (in separate terminal)
python manage.py run_scheduler
```

### Production with Gunicorn

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn queueforge.wsgi:application --bind 0.0.0.0:3000 --workers 4

# Run scheduler as background service
python manage.py run_scheduler &
```

### With Docker

```bash
docker build -t qualgent-django .
docker run -p 3000:3000 --env-file .env qualgent-django
```

## API Endpoints

### Jobs
- `POST /jobs/` - Create new job
- `GET /jobs/{job_id}/` - Get job details
- `GET /jobs/{job_id}/status/` - Get job status
- `GET /jobs/` - List jobs (with filters)

### Agents
- `POST /agents/` - Register agent
- `POST /agents/{agent_id}/heartbeat/` - Agent heartbeat
- `GET /agents/` - List agents
- `DELETE /agents/{agent_id}/` - Remove agent

### Queue & Health
- `GET /debug/queue/` - Queue status
- `GET /queue/length/` - Queue length
- `GET /health/` - Health check

## Django Admin

Access admin interface at `http://localhost:3000/admin/`

```bash
# Create superuser
python manage.py createsuperuser

# Login and manage:
# - Jobs
# - Agents
# - View/edit/delete manually
```

## Management Commands

### Run Scheduler

```bash
# Default interval (1s)
python manage.py run_scheduler

# Custom interval
python manage.py run_scheduler --interval 5
```

### Database Operations

```bash
# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Shell
python manage.py shell
```

## Database Schema

### Job Model
- job_id (UUID, PK)
- org_id, app_version_id, test_path
- priority, target, status
- attempts, agent_id, error_message
- created_at, updated_at, started_at, completed_at

### Agent Model
- agent_id (CharField, PK)
- target, busy, current_job (FK)
- last_heartbeat, metadata (JSON)
- created_at, updated_at

## Development

### Project Structure

```
job-server-django/
├── manage.py
├── requirements.txt
├── .env.example
├── queueforge/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── jobs/
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── queue_manager.py
│       ├── agent_manager.py
│       ├── job_executor.py
│       └── management/
│           └── commands/
│               └── run_scheduler.py
```

### Adding New Features

1. Create models in `jobs/models.py`
2. Run `makemigrations` and `migrate`
3. Create serializers in `jobs/serializers.py`
4. Add views to `jobs/views.py`
5. Register URLs in `queueforge/urls.py`

## Testing

```bash
# Run tests
python manage.py test

# Run specific test
python manage.py test queueforge.jobs.tests.test_models

# With coverage
coverage run --source='.' manage.py test
coverage report
```

## Deployment

### Kubernetes

```yaml
# Update deployment to use Django image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: job-server
spec:
  template:
    spec:
      containers:
      - name: job-server
        image: qualgent-django:latest
        command: ["gunicorn"]
        args: ["queueforge.wsgi:application", "--bind", "0.0.0.0:3000"]

      # Scheduler as sidecar
      - name: scheduler
        image: qualgent-django:latest
        command: ["python"]
        args: ["manage.py", "run_scheduler"]
```

### Environment Variables

Required:
- `SECRET_KEY` - Django secret key
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection

Optional:
- `DEBUG` - Debug mode (default: False)
- `ALLOWED_HOSTS` - Comma-separated hosts
- `MAX_RETRIES` - Job retry limit (default: 3)
- `SCHEDULER_INTERVAL` - Polling interval (default: 1)

## Migration from Node Version

Django version maintains API compatibility:

### Same Endpoints
- `POST /jobs` → `POST /jobs/`
- `GET /jobs/:id` → `GET /jobs/{job_id}/`
- `GET /jobs/:id/status` → `GET /jobs/{job_id}/status/`

### New Features
- Browsable API at `http://localhost:3000/jobs/`
- Admin interface at `http://localhost:3000/admin/`
- Database migrations with `manage.py migrate`
- Shell access with `manage.py shell`

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql postgresql://user:pass@localhost:5432/qualgentdb
```

### Redis Connection Error

```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Migration Issues

```bash
# Reset migrations (development only)
python manage.py migrate jobs zero
python manage.py migrate

# Or reset database
dropdb qualgentdb
createdb qualgentdb
python manage.py migrate
```

## Performance Tuning

### Database

```python
# settings.py
DATABASES = {
    'default': {
        'CONN_MAX_AGE': 600,  # Connection pooling
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

### Redis

```python
# Increase connection pool
REDIS_URL = 'redis://localhost:6379/0?max_connections=50'
```

### Gunicorn

```bash
# More workers
gunicorn --workers 8 --threads 2 --worker-class gthread queueforge.wsgi:application
```

## License

Same as Node version
