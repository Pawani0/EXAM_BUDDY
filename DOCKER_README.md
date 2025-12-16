# Exam Buddy - Docker Setup

## Prerequisites

- Docker Desktop installed
- Docker Compose installed

## Quick Start

1. **Clone the repository and navigate to the project directory**

```bash
cd exam_buddy
```

2. **Create environment file**

```bash
cp .env.example .env
```

Edit `.env` file and add your API keys and configuration:
- Set `GROQ_API_KEY` to your Groq API key
- Adjust database credentials if needed

3. **Build and start all services**

```bash
docker-compose up --build
```

Or run in detached mode:

```bash
docker-compose up -d --build
```

4. **Access the application**

- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Docker Commands

### Start services
```bash
docker-compose up
```

### Start services in background
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop services and remove volumes (clean slate)
```bash
docker-compose down -v
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Rebuild containers
```bash
docker-compose up --build
```

### Check service status
```bash
docker-compose ps
```

### Execute commands in containers
```bash
# Backend shell
docker-compose exec backend bash

# Database shell
docker-compose exec db psql -U postgres -d exam_buddy

# Frontend shell
docker-compose exec frontend sh
```

## Development Mode

For development with hot reload:

### Backend Development
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
bun install
bun run dev
```

## Production Deployment

1. Update `.env` file with production values:
   - Set `ENVIRONMENT=production`
   - Set `DEBUG=false`
   - Use strong database passwords
   - Update `VITE_API_URL` to your production API URL

2. Build and start:
```bash
docker-compose up -d --build
```

## Database Initialization

The database will be automatically created when you first start the services. To initialize with data:

```bash
# Access backend container
docker-compose exec backend bash

# Run initialization scripts
python scripts/create_tables.py
python scripts/create_admin.py
python scripts/create_university_data.py
```

## Troubleshooting

### Port already in use
If ports 80, 8000, or 5432 are already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3000:80"  # Change frontend port
  - "8001:8000"  # Change backend port
  - "5433:5432"  # Change database port
```

### Database connection issues
Ensure the database service is healthy:
```bash
docker-compose ps db
```

### Clear cache and rebuild
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## Architecture

- **Frontend**: React + Vite + TypeScript served by Nginx
- **Backend**: FastAPI + Python 3.11
- **Database**: PostgreSQL 15
- **Network**: All services communicate through `exam_buddy_network`

## Volume Mounts

- `postgres_data`: Persistent database storage
- `backend_cache`: Python cache files
- Hot reload enabled for backend development (./backend:/app)
