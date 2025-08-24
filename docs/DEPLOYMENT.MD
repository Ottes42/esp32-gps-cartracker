# Deployment Guide

## Using Docker Compose (Recommended)

1. **Use published image (Production)**

   ```bash
   # docker-compose.yaml uses: ottes/gps-cartracker:latest (Docker Hub)
   docker-compose up -d
   ```

2. **Build locally (Development)**

   ```bash
   # Uncomment "build: ." in docker-compose.yaml
   docker-compose up --build
   ```

3. **Use specific version**

   ```bash
   # Pull specific release from Docker Hub (recommended)
   docker pull ottes/gps-cartracker:v1.2.3
   
   # Update docker-compose.yaml image tag
   image: ottes/gps-cartracker:v1.2.3
   ```

## Available Docker Repositories

The GPS Car Tracker is available from this Docker repository:

- **Docker Hub (recommended)**: `ottes/gps-cartracker`

## Manual Deployment

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Environment Configuration

### Environment Variables

Create a `.env` file with:

```bash
# Required: Google Gemini API for receipt parsing
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Custom model (default: gemini-1.5-pro-vision-latest)
GEMINI_MODEL=gemini-1.5-pro-vision-latest

# Optional: Data storage path (default: /data/)
DATA_PATH=/data/

# Optional: Database filename (default: cartracker.db)
DB_FILE=cartracker.db

# Optional: Geocoding cache file (default: geocache.json)
GEOCACHE=geocache.json

# Optional: Upload directory (default: uploads)
UPLOAD_DIR=uploads

# Optional: Server port (default: 8080)
PORT=8080
```

### Quick Setup

```bash
# Copy example configuration
cp .env.example .env

# Edit with your settings
nano .env
```

## Production Deployment

For production deployment, you'll need:

1. **Reverse proxy with HTTP Basic Authentication**
2. **SSL/TLS certificates**
3. **Rate limiting configuration**
4. **File size limits**

See **[Security Guide](SECURITY.MD)** for detailed security configuration.

## Monitoring and Logs

```bash
# View container logs
docker-compose logs -f cartracker

# Monitor all services
docker-compose logs -f
```
