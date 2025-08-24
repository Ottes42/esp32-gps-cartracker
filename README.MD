# GPS Car Tracker

A comprehensive GPS tracking solution for cars using ESP32-C3, featuring real-time location logging, fuel consumption tracking with AI-powered receipt parsing, and a web dashboard.

## Features

### Hardware Tracking

- **Real-time GPS tracking** with 1-second intervals when ACC is on
- **Temperature and humidity monitoring** using DHT11 sensor
- **Automatic power management** with deep sleep when ACC is off
- **SD card logging** for offline data storage
- **Automatic data upload** when WiFi is available
- **Status LED** for visual feedback

### Software Features

- **Fuel tracking** with AI-powered receipt parsing using Google Gemini
- **Trip analysis** with automatic trip detection
- **Monthly consumption reports**
- **RESTful API** for data access
- **Basic HTTP authentication** for secure access
- **Geocoding** for fuel station locations
- **Web dashboard** (coming soon)

## Hardware Requirements

### ESP32-C3 Setup

- ESP32-C3 DevKit (tested with esp32-c3-devkitm-1) or any other compatible board, but you have to update the board configuration in the firmware
- GPS module (UART, 9600 baud)
- MicroSD card module (SPI)
- DHT11 temperature/humidity sensor
- Status LED
- ACC voltage sensor circuit

### Pin Configuration

```yaml
PIN_UART_RX:   GPIO20  # GPS RX
PIN_UART_TX:   GPIO21  # GPS TX
PIN_SD_CS:     GPIO10  # SD Card CS
PIN_SPI_SCLK:  GPIO6   # SPI Clock
PIN_SPI_MOSI:  GPIO7   # SPI MOSI
PIN_SPI_MISO:  GPIO2   # SPI MISO
PIN_DHT:       GPIO1   # DHT11 Data
PIN_ACC_SENSE: GPIO4   # ACC Detection
PIN_LED:       GPIO8   # Status LED
```

## Software Setup

### Prerequisites

- Node.js 20+  
- Docker & Docker Compose
- ESPHome CLI (for firmware compilation)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/gps-car-tracker.git
   cd gps-car-tracker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Configure firmware**

   ```bash
   # Edit firmware/firmware.yaml
   # Update WiFi credentials, upload URL, and auth credentials
   ```

### Environment Variables

Create a `.env` file with:

```bash
# Google Gemini API for receipt parsing
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Custom model (default: gemini-1.5-pro-vision-latest)
GEMINI_MODEL=gemini-1.5-pro-vision-latest
```

### Firmware Configuration

Edit `firmware/firmware.yaml`:

```yaml
substitutions:
  # WiFi Configuration
  WIFI_SSID_1: "Your_WiFi_SSID"
  WIFI_PASS_1: "Your_WiFi_Password"
  
  # Server Configuration
  UPLOAD_TARGET: "https://your-domain.com/upload/"
  BASIC_AUTH_USER: "your-device-name"
  BASIC_AUTH_PASS: "your-secure-password"
```

## Deployment

### Using Docker Compose

1. **Start the services**

```bash
   docker-compose up -d
```

1. **Configure Nginx Proxy Manager**
   - Access NPM at `http://localhost:81`
   - Default credentials: `admin@example.com` / `changeme`
   - Create a proxy host for your domain
   - Configure SSL certificate (Let's Encrypt recommended)
   - Set up HTTP Basic Auth with username matching your ESP32 device name
   - **Important**: Add this custom header to your proxy host:

```bash
     proxy_set_header X-Auth-User $remote_user;
```

### Manual Deployment

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Firmware Installation

### Option 1: Manual Compilation

```bash
# Install ESPHome
pip install esphome

# Edit firmware/firmware.yaml with your settings first!
# Update WiFi credentials, server URL, and authentication

# Compile firmware
esphome compile firmware/firmware.yaml

# Flash to device
esphome upload firmware/firmware.yaml
```

### Option 2: use ESPHome Docker image

```bash
# Compile firmware
docker run --rm -v $(pwd):/config esphome/esphome compile /config/firmware/firmware.yaml

# Flash to device
docker run --rm -v $(pwd):/config esphome/esphome upload /config/firmware/firmware.yaml
```

## API Documentation

### Authentication

All API endpoints require HTTP Basic Authentication. The proxy must inject the `X-Auth-User` header containing the authenticated username.

### Endpoints

#### Data Upload

```http
POST /upload/:filename
Content-Type: text/csv
Authorization: Basic <base64_credentials>

# CSV format: timestamp,lat,lon,alt,speed,hdop,sats,course,temp,humidity
```

#### Fuel Tracking

```http
# Upload fuel receipt
POST /uploadReceipt
Content-Type: multipart/form-data
Body: photo file

# Retry failed receipt parsing
POST /retryReceipt/:id
```

#### Data Retrieval

```http
# Get fuel records
GET /api/fuel?limit=50&offset=0

# Get monthly fuel statistics
GET /api/fuel/months

# Get trips
GET /api/trips?limit=20&offset=0

# Get trip details
GET /api/trip/:start_timestamp
```

## Data Format

### GPS Tracking Data

Each GPS log entry contains:

- Timestamp (ISO 8601)
- Latitude/Longitude (decimal degrees)
- Altitude (meters)
- Speed (km/h)
- GPS accuracy (HDOP)
- Satellite count
- Course (degrees)
- Temperature (°C)
- Humidity (%)

### Fuel Data

Fuel records include:

- Timestamp
- Volume (liters)
- Price per liter
- Fuel amount and total cost
- Station information (name, address, location)
- Photo path and OCR text
- Consumption calculation

## Power Management

The device automatically:

- **Deep sleeps** for 30 minutes when ACC is off
- **Wakes up** immediately when ACC is detected
- **Logs temperature** once before sleeping
- **Prevents sleep** while ACC is on
- **Syncs data** before entering sleep mode

## Development

### Code Style

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Test Data Generation

Generate test GPS tracking data for development and testing:

```bash
# Generate test CSV file locally
node generateTestCSV.js --start=2025-08-18 --weeks=1 --outfile=example_drives.csv

# Generate and directly upload to server
node generateTestCSV.js \
  --start=2025-08-18 --weeks=1 \
  --outfile=example_drives.csv \
  --server=https://gps.example.org \
  --uploadName=example_drives.csv \
  --auth='gps-esp32:supersecret'

# Use environment variable for authentication
export BASIC_AUTH='gps-esp32:supersecret'
node generateTestCSV.js --server=https://gps.example.org

# Use npm script shortcut
npm run testCsv -- --start=2025-08-18 --weeks=2
```

### Database Schema

The application uses SQLite with two main tables:

- `car_track`: GPS tracking data
- `fuel`: Fuel consumption records

## Troubleshooting

### Common Issues

#### Device not connecting to WiFi

- Check WiFi credentials in firmware configuration
- Verify WiFi network compatibility (2.4GHz required)
- Check device logs via ESPHome

#### Data not uploading

- Verify server URL and authentication
- Check network connectivity
- Ensure proxy is configured with correct headers

#### GPS not working

- Verify GPS module connections
- Check antenna placement (needs clear sky view)
- Monitor GPS status in logs

#### SD card issues

- Verify SD card formatting (FAT32)
- Check SPI connections
- Ensure adequate power supply

### Logs

```bash
# View container logs
docker-compose logs -f cartracker

# View ESP32 logs
esphome logs firmware/firmware.yaml
```

## Nginx Proxy Manager Configuration

### Basic Proxy Host Setup

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

### Advanced Configuration

#### Custom Nginx Configuration

Add to the "Advanced" tab of your proxy host:

```nginx
# Rate Limiting
limit_req_zone $binary_remote_addr zone=gps_upload:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=receipt_upload:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_calls:10m rate=60r/m;

# File size limits for different endpoints
location ~ ^/upload/ {
    limit_req zone=gps_upload burst=5 nodelay;
    client_max_body_size 10M;  # CSV files
    proxy_set_header X-Auth-User $remote_user;
    proxy_pass http://cartracker:8080;
}

location /uploadReceipt {
    limit_req zone=receipt_upload burst=2 nodelay;
    client_max_body_size 50M;  # Phone camera photos
    proxy_read_timeout 60s;    # OCR processing time
    proxy_set_header X-Auth-User $remote_user;
    proxy_pass http://cartracker:8080;
}

location /api/ {
    limit_req zone=api_calls burst=10 nodelay;
    proxy_set_header X-Auth-User $remote_user;
    proxy_pass http://cartracker:8080;
}

# Default for dashboard and static files
location / {
    limit_req zone=api_calls burst=20 nodelay;
    proxy_set_header X-Auth-User $remote_user;
    proxy_pass http://cartracker:8080;
}
```

#### Rate Limiting Explained

- **GPS Upload**: 30 requests/minute (ESP32 uploads every 1-2 minutes)
- **Receipt Upload**: 10 requests/minute (manual user uploads)
- **API Calls**: 60 requests/minute (dashboard queries)
- **Burst**: Allows temporary spikes above the rate limit

#### File Size Limits

- **GPS CSV uploads**: 10MB (large trip files)
- **Receipt photos**: 50MB (modern phone cameras: 12-48MP photos)
- **General requests**: 1MB (API calls, small data)

### Troubleshooting Rate Limits

#### Common HTTP Status Codes

- `429 Too Many Requests`: Rate limit exceeded
- `413 Request Entity Too Large`: File size limit exceeded
- `408 Request Timeout`: Upload took too long

#### Monitoring Rate Limits

Check Nginx error logs for rate limit violations:

```bash
docker-compose logs npm | grep "limiting requests"
```

#### Adjusting Limits for Development

For testing, temporarily increase limits:

```nginx
# Development: More permissive limits
limit_req_zone $binary_remote_addr zone=dev_upload:10m rate=120r/m;
```

## Contributing

We welcome contributions to the project! Please follow these steps:

1. **Fork the Repository**: Create your own fork of the repository on GitHub.

2. **Create a Branch**: Create a new branch for your feature or bug fix:

   ```bash
   git checkout -b my-feature-branch
   ```

3. **Make Changes**: Make your changes in the codebase.

4. **Test Your Changes**: Ensure that your changes work as expected and do not break existing functionality.

5. **Commit Your Changes**: Commit your changes with a descriptive commit message:

   ```bash
   git commit -m "Add my feature"
   ```

6. **Push to Your Fork**: Push your changes to your fork on GitHub:

   ```bash
   git push origin my-feature-branch
   ```

7. **Create a Pull Request**: Go to the original repository and create a pull request from your branch.

Thank you for your contributions!
