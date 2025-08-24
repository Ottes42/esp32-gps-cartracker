# GPS Car Tracker

Dual-stack IoT GPS car tracker with ESP32-C3 firmware, Node.js backend, and web dashboard.

## Architecture

**Tech Stack**: ESPHome (firmware) → Express.js + SQLite (backend) → Vanilla HTML/JS (frontend) → Docker + Nginx Proxy Manager (deployment)

### Data Flow
1. **ESP32** → Logs GPS to SD card → Uploads CSV via `/upload/:filename` when WiFi available
2. **User** → Uploads receipt photo via `/uploadReceipt` → Gemini OCR → Geocoded → Stored  
3. **Dashboard** → Queries `/api/fuel` and `/api/trips` → Displays maps and statistics

## Firmware Development

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
