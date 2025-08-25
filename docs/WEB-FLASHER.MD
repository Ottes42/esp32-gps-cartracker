# 🔧 Web Flasher Interface

The GPS Car Tracker provides a web-based firmware flashing interface that makes it easy to install firmware on your BerryBase NodeMCU-ESP32 board without any additional software.

## 🌐 Accessing the Web Flasher

1. **GitHub Pages**: Visit [GPS Tracker Web Flasher](https://ottes42.github.io/esp32-gps-cartracker/flasher.html)
2. **ESPHome Web Flasher**: [web.esphome.io](https://web.esphome.io/) with the manifest file
3. **Local Development**: Navigate to `http://localhost:3000/flasher.html`

## 🖥️ Browser Requirements

The web flasher uses the WebSerial API and requires:

- **Chrome 89+** or **Edge 89+** browser
- **Safari and Firefox are not supported** (missing WebSerial API)
- **USB connection** to the ESP32 board

## 📱 Supported Hardware

The web flasher is optimized for the only supported board:

### 🌟 BerryBase NodeMCU-ESP32 (Only Supported Board)
- **Chip**: ESP32 (dual-core, 240MHz)
- **SD Card**: SDMMC interface (fast, reliable)
- **Features**: WiFi, Bluetooth, 30 GPIO pins
- **Use Case**: All GPS tracking applications
- **Status**: ✅ Fully tested and supported

## Why Only One Board?

Other ESP32 boards have been removed due to:
- **SD Card Issues**: Unreliable SD card support, especially with SPI interface
- **Pin Conflicts**: Limited GPIO availability causing conflicts
- **Power Problems**: Insufficient or unstable power supplies
- **Build Complexity**: Hard to maintain board-specific configurations
- **Testing Burden**: Difficult to properly validate different configurations

## 🔄 Flashing Process

### Step 1: Hardware Connection
1. Connect your BerryBase NodeMCU-ESP32 to your computer via USB
2. Ensure the board is powered on
3. The board enters download mode automatically

### Step 2: Web Flashing
1. Visit the [Web Flasher](https://ottes42.github.io/esp32-gps-cartracker/flasher.html)
2. Click the **"Install GPS Tracker"** button
3. Select the correct USB port in the browser popup
4. The firmware will be downloaded and flashed automatically
5. Wait for the "Installation complete" message

### Step 3: Initial Configuration
After successful flashing:
1. The device will restart and create a WiFi hotspot: `gps-cartracker-setup`
2. Connect to this network (password: `setup-setup`)
3. Navigate to `http://192.168.4.1` in your browser
4. Configure your server URL and authentication credentials

## 🛠️ Troubleshooting

### Flash Errors
- **Port not detected**: Try a different USB cable or port
- **Permission denied**: On Linux, add your user to the `dialout` group
- **Flash timeout**: Press and hold the BOOT button during flashing

### Browser Issues
- **WebSerial not supported**: Use Chrome 89+ or Edge 89+
- **Connection failed**: Refresh the page and try again
- **Download timeout**: Check your internet connection

### Hardware Issues
- **No response**: Check USB cable and power supply
- **Board not recognized**: Install CP210x drivers if needed
- **Constant reset**: Check power supply stability

## 🔗 Alternative Methods

If web flashing doesn't work:

### ESPHome CLI
```bash
esphome run firmware.yaml --device /dev/ttyUSB0
```

### Manual Download and Flash
1. Download firmware from [GitHub Releases](https://github.com/Ottes42/esp32-gps-cartracker/releases)
2. Use esptool.py:
```bash
esptool.py --port /dev/ttyUSB0 write_flash 0x0 firmware-nodemcu-32s.bin
```

### ESP32 Flash Download Tools
1. Download the `.bin` file from releases
2. Use Espressif's flash tool with offset 0x0

## 📋 Firmware Features

The firmware includes:
- **GPS tracking** with 1-minute data logging
- **SD card buffering** with automatic upload via SDMMC
- **Web configuration interface**
- **Captive portal** for initial setup
- **Deep sleep power management**
- **Temperature and humidity monitoring**
- **Time synchronization** with GPS and SNTP

## 🔄 Updates

The web flasher always uses the latest firmware release. To update:
1. Visit the flasher page
2. Flash the new firmware (will overwrite existing)
3. Reconfigure if needed (settings are preserved in most cases)

## 🐛 Getting Help

- 📖 [Hardware Setup Guide](HARDWARE.MD)
- 📱 [Board Configuration](BOARD-CONFIGURATIONS.MD)  
- 🌐 [Web Interface Documentation](WEB-INTERFACE.MD)
- 🔧 [Firmware Configuration](DEVELOPMENT.MD)
- 🚀 [GitHub Issues](https://github.com/Ottes42/esp32-gps-cartracker/issues)