# GPS Car Tracker

A comprehensive GPS tracking solution for cars using ESP32-C3, featuring real-time location logging, fuel consumption tracking with AI-powered receipt parsing, and a web dashboard.

## 📖 Documentation

- **[Hardware Setup](docs/HARDWARE.MD)** - ESP32-C3 setup and pin configuration
- **[Deployment Guide](docs/DEPLOYMENT.MD)** - Docker and manual deployment instructions
- **[API Documentation](docs/API.MD)** - Complete API reference and testing
- **[Development Guide](docs/DEVELOPMENT.MD)** - Development setup and contribution guidelines
- **[Security Model](docs/SECURITY.MD)** - Authentication and security configuration
- **[Nginx Configuration](docs/NGINX.MD)** - Reverse proxy setup instructions
- **[Nginx Proxy Manager](docs/NGINX-PRROXY-MANAGER.MD)** - Step-by-step NPM configuration

## ✨ Features

### Hardware Tracking
- **Real-time GPS tracking** with 1-second intervals when ACC is on
- **Temperature and humidity monitoring** using DHT11 sensor
- **Automatic power management** with deep sleep when ACC is off
- **SD card logging** for offline data storage
- **Automatic data upload** when WiFi is available

### Software Features
- **Fuel tracking** with AI-powered receipt parsing using Google Gemini

- **Trip analysis** with automatic trip detection
- **Monthly consumption reports**
- **RESTful API** for data access
- **Web dashboard** with interactive maps and statistics
- **Secure authentication** with rate limiting

## 🚀 Quick Start

### 1. Software Setup

```bash
# Clone and setup
git clone https://github.com/yourusername/gps-car-tracker.git
cd gps-car-tracker
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Gemini API key and settings

# Start development server
npm run dev
```

### 2. Hardware Setup

See **[Hardware Setup Guide](docs/HARDWARE.MD)** for detailed ESP32-C3 configuration.

### 3. Production Deployment

```bash
# Using Docker Compose (recommended)
docker-compose up -d
```

See **[Deployment Guide](docs/DEPLOYMENT.MD)** for complete deployment instructions.

## 📱 Usage

1. **Install ESP32 firmware** following the [Hardware Guide](docs/HARDWARE.MD)
2. **Configure WiFi and server settings** in firmware
3. **Deploy backend server** using [Deployment Guide](docs/DEPLOYMENT.MD)
4. **Set up reverse proxy** following [Security Guide](docs/SECURITY.MD)
5. **Access web dashboard** at your configured domain

## 🔧 Development

```bash
# Available commands
npm run dev          # Development server with .env loading
npm run testCsv      # Generate GPS test data
npm run testFuel     # Generate fuel test data
npm run lint         # Check code style
```

See **[Development Guide](docs/DEVELOPMENT.MD)** for detailed development setup.

## 📊 API

The system provides RESTful APIs for:

- GPS data upload from ESP32
- Fuel receipt processing with AI
- Trip and consumption data retrieval
- Web dashboard data queries

See **[API Documentation](docs/API.MD)** for complete API reference.

## 🔒 Security

- HTTP Basic Authentication for all endpoints
- Rate limiting per endpoint type
- SSL/TLS encryption in production
- Development mode with localhost-only access

See **[Security Model](docs/SECURITY.MD)** for detailed security configuration.

## 📄 License

MIT License - see LICENSE file for details.
