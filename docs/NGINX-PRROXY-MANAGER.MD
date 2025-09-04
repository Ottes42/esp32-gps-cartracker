# Nginx Proxy Manager Configuration

## Basic Proxy Host Setup

1. **Create new Proxy Host**:
   - Domain: `gps.yourdomain.com`
   - Scheme: `http`
   - Forward Hostname: `cartracker`
   - Forward Port: `8080`

2. **SSL Certificate**:
   - Enable "Force SSL"
   - Use Let's Encrypt or upload custom certificate
   - Enable "HTTP/2 Support"

3. **Access List** (Basic Auth):
   - Create new Access List with your device credentials
   - Username must match ESP32 device name (e.g., `gps-cartracker-a1b2c3`)
