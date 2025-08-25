# GPS Car Tracker

Dual-stack IoT GPS car tracker with ESP32-C3 firmware, Node.js backend, and web dashboard.

## 🌐 Quick Links

- **📖 [Complete Documentation & Web Flasher](https://ottes42.github.io/esp32-gps-cartracker/)** - GitHub Pages site with all documentation and browser-based firmware flashing
- **🚀 [Download Latest Firmware](https://github.com/Ottes42/esp32-gps-cartracker/releases)** - Pre-built binaries for all supported boards
- **💬 [GitHub Issues](https://github.com/Ottes42/esp32-gps-cartracker/issues)** - Report bugs or request features

## Architecture

**Tech Stack**: ESPHome (firmware) → Express.js + SQLite (backend) → Vanilla HTML/JS (frontend) → Docker + Nginx Proxy Manager (deployment)

### Data Flow
1. **ESP32** → Logs GPS to SD card → Uploads CSV via `/upload/:filename` when WiFi available
2. **User** → Uploads receipt photo via `/uploadReceipt` → Gemini OCR → Geocoded → Stored  
3. **Dashboard** → Queries `/api/fuel` and `/api/trips` → Displays maps and statistics

## Firmware Development

### Pre-built Binaries (Easy Installation)
Ready-to-flash firmware binaries are available for multiple ESP32 boards:

**🚀 [Download Latest Firmware](https://github.com/Ottes42/esp32-gps-cartracker/releases)**

**📱 Flash via Web Browser:**
1. Visit [ESPHome Web Flasher](https://web.esphome.io/)
2. Upload the board-specific `.json` manifest file
3. Connect ESP32 via USB and click "Install"

**Supported Boards:**
- `nodemcu-32s` - BerryBase NodeMCU-ESP32 (current main board)
- `esp32-c3-devkitm-1` - ESP32-C3 DevKitM-1 (compact)
- `esp32dev` - Generic ESP32 (universal)

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

- **Board**: ESP32-C3-DevKitM-1
- **GPS**: UART (GPIO20/21, 9600 baud) with TinyGPSPlus
- **SD Card**: 4-pin SD-MMC interface (GPIO 6/7/2)
- **Sensors**: DHT11 temperature/humidity (GPIO1)
- **Power**: ACC detection (GPIO4) for deep sleep

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
