# ESPHome Web Flasher Support

This repository provides pre-built firmware binaries that are compatible with the [ESPHome Web Flasher](https://web.esphome.io/).

## 📱 Supported Boards

### Current Boards

- **BerryBase NodeMCU-ESP32** (`nodemcu-32s`) - *Main supported board*
- **ESP32-C3 DevKitM-1** (`esp32-c3-devkitm-1`) - *Compact option*
- **Generic ESP32** (`esp32dev`) - *Universal compatibility*

### Future Boards (Planned)

- **ESP32-S3 DevKitC** (`esp32-s3-devkitc-1`)
- **LilyGO T-SIM7000G** (`ttgo-t1`) - *Built-in cellular*
- **WEMOS D1 Mini ESP32** (`wemos_d1_mini32`)

## 🚀 Flash Instructions

### Easy Web Flashing (Recommended)

1. **Download Firmware**:
   - Go to [Releases](https://github.com/Ottes42/esp32-gps-cartracker/releases)
   - Download both `.bin` and `.json` files for your board

2. **Flash via Web**:
   - Visit [ESPHome Web Flasher](https://web.esphome.io/)
   - Click "Choose File" and select the `.json` file
   - Connect your ESP32 via USB
   - Click "Install" and follow prompts

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

Each firmware is labeled with the board ID for easy identification:

| Board Name | ESPHome Board ID | Chip | Notes |
|------------|------------------|------|-------|
| BerryBase NodeMCU-ESP32 | `nodemcu-32s` | ESP32 | Main development board |
| ESP32-C3 DevKitM-1 | `esp32-c3-devkitm-1` | ESP32-C3 | Low power, smaller form factor |
| Generic ESP32 | `esp32dev` | ESP32 | Universal compatibility |

## ⚙️ Version Identification

Firmware versions follow semantic versioning:

- `v1.0.0` - Initial release
- `v1.1.0` - Feature updates
- `v1.0.1` - Bug fixes

Each binary includes:

- Board identifier in filename
- Version number in device name
- Compilation timestamp

## 🔄 Automated Builds

Firmware binaries are automatically built on:

- **Tag releases**: `git tag v1.0.0 && git push --tags`
- **Manual dispatch**: Via GitHub Actions workflow

Build matrix includes all supported boards with board-specific configurations.

## 📋 Firmware Features

- ✅ **GPS Tracking**: Real-time location logging
- ✅ **SD Card Storage**: Local data buffering
- ✅ **WiFi Upload**: Automatic CSV sync
- ✅ **Web Interface**: Configuration and monitoring
- ✅ **Captive Portal**: Easy initial setup
- ✅ **Power Management**: Deep sleep when ACC off
- ✅ **Multi-sensor**: GPS, temperature, humidity
- ✅ **Time Sync**: GPS time with SNTP fallback

## 🆘 Troubleshooting

### Web Flasher Issues

- **Chrome/Edge required**: Safari and Firefox have limited Web Serial support
- **USB drivers**: Install CH340/CP210x drivers if device not detected
- **Boot mode**: Hold BOOT button while connecting for some boards

### Board Selection

- **Wrong board**: Device may boot but hardware won't work correctly
- **Pin conflicts**: Check hardware documentation for your specific board
- **Power issues**: Some boards need external power during flashing

### After Flashing

- **Setup AP**: Look for `gps-cartracker-setup` WiFi network
- **Serial logs**: Use ESPHome logs to debug connection issues
- **Factory reset**: Hold BOOT for 10s to clear configuration

## 🔗 Links

- 🌐 [ESPHome Web Flasher](https://web.esphome.io/)
- 📖 [Hardware Documentation](docs/HARDWARE.MD)
- 🌍 [Web Interface Guide](docs/WEB-INTERFACE.MD)
- 🐛 [Issue Tracker](https://github.com/Ottes42/esp32-gps-cartracker/issues)
