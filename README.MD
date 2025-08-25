# GPS Car Tracker

Dual-stack IoT GPS car tracker with ESP32 firmware, Node.js backend, and web dashboard.

## Architecture

**Tech Stack**: ESPHome (firmware) → Express.js + SQLite (backend) → Vanilla HTML/JS (frontend) → Docker + Nginx Proxy Manager (deployment)

### Data Flow
1. **ESP32** → Logs GPS to SD card → Uploads CSV via `/upload/:filename` when WiFi available
2. **User** → Uploads receipt photo via `/uploadReceipt` → Gemini OCR → Geocoded → Stored  
3. **Dashboard** → Queries `/api/fuel` and `/api/trips` → Displays maps and statistics

## Firmware Development

### Pre-built Binaries (Easy Installation)
Ready-to-flash firmware binaries are available for SDMMC-compatible ESP32 boards:

**🚀 [Download Latest Firmware](https://github.com/Ottes42/esp32-gps-cartracker/releases)**

**📱 Flash via Web Browser:**
1. Visit [ESPHome Web Flasher](https://web.esphome.io/) or use our [built-in flasher](public/flasher.html)
2. Upload the board-specific `.json` manifest file
3. Connect ESP32 via USB and click "Install"

**Supported Boards (SDMMC SD Card):**
- `nodemcu-32s` - BerryBase NodeMCU-ESP32 ✅ **Recommended**
- `esp32dev` - Generic ESP32 Development Board
- `esp32s3-dev` - ESP32-S3 DevKitC-1 (High Performance)

📖 **Full Flashing Guide**: [FIRMWARE-FLASHING.MD](docs/FIRMWARE-FLASHING.MD)

### ESPHome Version
This project uses **ESPHome 2025.8.0** (Docker server version). For local development, compile with Docker:

```bash
# Compile firmware
docker run --rm -v "${PWD}":/config -v "${PWD}/firmware":/config/esphome esphome/esphome:2025.8 compile firmware/firmware.yaml

# Upload to device  
docker run --rm -v "${PWD}":/config -v "${PWD}/firmware":/config/esphome --device=/dev/ttyUSB0 esphome/esphome:2025.8 upload firmware/firmware.yaml

# View logs
docker run --rm -v "${PWD}":/config -v "${PWD}/firmware":/config/esphome --device=/dev/ttyUSB0 esphome/esphome:2025.8 logs firmware/firmware.yaml
```

### Hardware Configuration

- **Board**: ESP32 with SDMMC SD card support (see [supported boards](docs/BOARD-CONFIGURATIONS.MD))
- **GPS**: UART (board-specific pins, 9600 baud) with TinyGPSPlus
- **SD Card**: SDMMC interface (GPIO14/15/2/4/12/13) for reliable GPS data logging
- **Sensors**: DHT11/DHT22 temperature/humidity (board-specific pin)
- **Power**: ACC detection (board-specific pin) for deep sleep

⚠️ **Important**: Only ESP32 boards with SDMMC SD card support are supported. SPI-only boards are not reliable for continuous GPS logging.

## Device Configuration

### Web Interface & Captive Portal

The ESP32 firmware provides a built-in web interface for runtime configuration:

- **WiFi Connected**: Access via device IP (e.g., `http://192.168.1.100`)
- **Setup Mode**: Device creates AP `gps-cartracker-setup` (password: `setup-setup`)
- **Web UI**: Configure server URL, auth credentials, monitor GPS status
- **API**: JSON endpoints for sensor data and configuration updates

**Features**:

- Runtime server/auth configuration (no reflashing needed)
- Real-time GPS, sensor, and system monitoring
- Manual upload triggers and system controls
- Captive portal for easy initial setup

📖 **Full Documentation**: [WEB-INTERFACE.MD](docs/WEB-INTERFACE.MD)

### Secrets Configuration

Create `firmware/secrets.yaml`:

```yaml
wifi_ssid: "YourWiFiSSID"
wifi_password: "YourWiFiPassword"
```

## Quick Start

1. **Hardware**: Connect GPS module, SD card, and sensors per hardware docs
2. **Firmware**: Flash ESPHome firmware with your WiFi credentials  
3. **Setup**: Connect to captive portal to configure server settings
4. **Backend**: Deploy Node.js backend with Docker
5. **Monitor**: Access web dashboard for trips and fuel tracking
