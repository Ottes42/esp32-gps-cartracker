# GPS Car Tracker - Docker Hub Overview

Dual-stack IoT GPS car tracker with ESP32 firmware, Node.js backend, and web dashboard.

**Tech Stack**: ESPHome (firmware) → Express.js + SQLite (backend) → Vanilla HTML/JS (frontend) → Docker + Nginx Proxy Manager (deployment)

## Features

- **GPS Tracking**: ESP32-based device logs GPS data to SD card, uploads via WiFi
- **Fuel Consumption**: Upload receipt photos for automatic OCR parsing with Google Gemini AI
- **Web Dashboard**: View trips, fuel statistics, and interactive maps
- **Rate Limiting**: Built-in protection against abuse (30 req/min for device uploads, 60 req/min for API)
- **Multi-user Support**: HTTP Basic Authentication via reverse proxy
- **SQLite Database**: Lightweight, file-based storage

## Quick Start

### 1. Create Environment File

Create a `.env` file with your configuration:

```bash
# Required: Google Gemini API for receipt parsing
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Custom model (default: gemini-1.5-flash)
GEMINI_MODEL=gemini-1.5-flash

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

### 2. Docker Compose Configuration

Create a `docker-compose.yaml` file:

```yaml
networks:
  gps_net:

services:
  cartracker:
    image: ottes/gps-cartracker:latest
    container_name: cartracker
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./data/gps:/data
    networks:
      - gps_net
    ports:
      - "8080:8080" # only for dev situations, use NPM as reverse proxy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: Nginx Proxy Manager for production (recommended)
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - "80:80"
      - "81:81" # NPM admin UI
      - "443:443"
    volumes:
      - ./data/npm/data:/data
      - ./data/npm/letsencrypt:/etc/letsencrypt
    networks:
      - gps_net
```

### 3. Deploy

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f cartracker

# Health check
curl http://localhost:8080/health
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | **Yes** | - | Google Gemini AI API key for receipt OCR parsing |
| `GEMINI_MODEL` | No | `gemini-1.5-flash` | Gemini AI model to use for OCR |
| `DATA_PATH` | No | `/data/` | Directory for persistent data storage |
| `DB_FILE` | No | `cartracker.db` | SQLite database filename |
| `GEOCACHE` | No | `geocache.json` | Geocoding cache filename |
| `UPLOAD_DIR` | No | `uploads/` | Directory for receipt photo uploads |
| `PORT` | No | `8080` | HTTP server port |

## Production Deployment

For production use, it's **strongly recommended** to:

1. **Use Nginx Proxy Manager** (included in docker-compose example)
2. **Configure HTTP Basic Authentication** with header: `proxy_set_header X-Auth-User $remote_user;`
3. **Enable SSL/TLS certificates**
4. **Configure rate limiting** (built-in protection included)
5. **Set up proper backups** for the `/data` volume

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /upload/:filename` - GPS data upload (device only, 30 req/min)
- `POST /uploadReceipt` - Upload fuel receipt photo (10 req/min)
- `GET /api/trips` - Get GPS trips data (60 req/min)
- `GET /api/fuel` - Get fuel consumption data (60 req/min)

## Hardware Requirements

To use this system, you'll also need:

- **ESP32 device** with GPS module, SD card, and sensors
- **Pre-built firmware** available from [GitHub Releases](https://github.com/Ottes42/esp32-gps-cartracker/releases)
- **Web flasher** available at project documentation site

## Documentation

- **📖 [Complete Documentation & Web Flasher](https://ottes42.github.io/esp32-gps-cartracker/)** - Comprehensive setup guide
- **🚀 [Download Firmware](https://github.com/Ottes42/esp32-gps-cartracker/releases)** - Pre-built ESP32 binaries
- **💬 [GitHub Issues](https://github.com/Ottes42/esp32-gps-cartracker/issues)** - Support and bug reports
- **📋 [Full README](https://github.com/Ottes42/esp32-gps-cartracker/blob/main/README.MD)** - Project overview

## Support

For detailed setup instructions, hardware wiring diagrams, security configuration, and troubleshooting, visit the [complete documentation](https://ottes42.github.io/esp32-gps-cartracker/).

---

**Docker Image**: `ottes/gps-cartracker`  
**Source Code**: https://github.com/Ottes42/esp32-gps-cartracker  
**License**: MIT