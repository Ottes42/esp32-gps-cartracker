# ESPHome Web Flasher Support

This repository provides pre-built firmware binaries optimized for the BerryBase NodeMCU-ESP32 board, compatible with the [ESPHome Web Flasher](https://web.esphome.io/).

## 📱 Supported Hardware

### Only Supported Board

- **BerryBase NodeMCU-ESP32** (`nodemcu-32s`) - *Only supported board, fully tested and optimized*

## 🚀 Flash Instructions

### Easy Web Flashing (Recommended)

1. **Download Firmware**:
   - Go to [Releases](https://github.com/Ottes42/esp32-gps-cartracker/releases)
   - Download both `firmware-nodemcu-32s.bin` and `firmware-nodemcu-32s-manifest.json` files

2. **Flash via Web**:
   - Visit [ESPHome Web Flasher](https://web.esphome.io/)
   - Click "Choose File" and select the `firmware-nodemcu-32s-manifest.json` file
   - Connect your BerryBase NodeMCU-ESP32 via USB
   - Click "Install" and follow prompts

3. **Alternative Web Flashing**:
   - Visit the [project's web flasher](https://ottes42.github.io/esp32-gps-cartracker/flasher.html)
   - Click "Install GPS Tracker" button
   - Select your USB port when prompted

### Manual Flashing

```bash
# Using esptool.py
pip install esptool
esptool.py --port /dev/ttyUSB0 write_flash 0x0 firmware-nodemcu-32s.bin

# Using ESPHome CLI
pip install esphome
esphome upload firmware-nodemcu-32s.yaml --device /dev/ttyUSB0
```

## 🔧 Board Identification

The firmware is specifically built for the BerryBase NodeMCU-ESP32:

| Board Name | ESPHome Board ID | Chip | SD Card Interface | Status |
|------------|------------------|------|-------------------|---------|
| BerryBase NodeMCU-ESP32 | `nodemcu-32s` | ESP32 | SDMMC (optimal) | ✅ Fully Supported |

## ⚙️ Version Identification

Firmware versions follow semantic versioning:

- `v1.0.0` - Initial release
- `v1.1.0` - Feature updates
- `v1.0.1` - Bug fixes

Each binary includes:

- Board identifier in filename: `firmware-nodemcu-32s.bin`
- Version number in device name
- Compilation timestamp

## 🔄 Automated Builds

Firmware binaries are automatically built on:

- **Tag releases**: `git tag v1.0.0 && git push --tags`
- **Manual dispatch**: Via GitHub Actions workflow

Build is optimized specifically for the BerryBase NodeMCU-ESP32 board configuration.

## 📋 Firmware Features

- ✅ **GPS Tracking**: Real-time location logging with NMEA parsing
- ✅ **SD Card Storage**: Local data buffering via SDMMC interface
- ✅ **WiFi Upload**: Automatic CSV sync to backend server
- ✅ **Web Interface**: Configuration and monitoring via captive portal
- ✅ **Captive Portal**: Easy initial setup with WiFi hotspot
- ✅ **Power Management**: Deep sleep when ACC (ignition) is off
- ✅ **Multi-sensor**: GPS, temperature (DHT11), and humidity monitoring
- ✅ **Time Sync**: GPS time with SNTP fallback for accuracy

## 🆘 Troubleshooting

### Web Flashing Issues

- **Browser Compatibility**: Use Chrome 89+ or Edge 89+ (Safari/Firefox not supported)
- **USB Driver**: Ensure CP2102 drivers are installed for NodeMCU-ESP32
- **Port Access**: On Linux, add user to `dialout` group: `sudo usermod -a -G dialout $USER`

### Common Flash Errors

- **Connection Failed**: Check USB cable, try different port
- **Permission Denied**: Run with sudo or fix port permissions
- **Flash Failed**: Hold BOOT button while flashing if needed

### After Flashing

1. Device creates WiFi AP: `gps-cartracker-setup` (password: `setup-setup`)
2. Connect to AP and navigate to `http://192.168.4.1`
3. Configure server URL and authentication credentials
4. Update `firmware/secrets.yaml` with your WiFi credentials
5. Reflash with production WiFi settings

## 🔗 Links

- **Web Flasher**: [ESPHome Web Flasher](https://web.esphome.io/)
- **Project Flasher**: [GPS Tracker Web Flasher](https://ottes42.github.io/esp32-gps-cartracker/flasher.html)
- **Hardware Guide**: [HARDWARE.MD](HARDWARE.MD)
- **Board Configuration**: [BOARD-CONFIGURATIONS.MD](BOARD-CONFIGURATIONS.MD)
- **API Documentation**: [API.MD](API.MD)

## Why Only One Board?

The firmware has been simplified to support only the BerryBase NodeMCU-ESP32 because:

- **Reliability**: This board has proven SD card support via SDMMC interface
- **Simplicity**: No complex board-specific configurations to maintain
- **Testing**: Thoroughly tested and validated for GPS tracking applications
- **Support**: Better documentation and community support for a single board

Other ESP32 boards had issues with SD card reliability, pin conflicts, or power supply problems that made them unsuitable for reliable GPS car tracking.