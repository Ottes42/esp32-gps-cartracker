# 🔧 Web Flasher Interface

The GPS Car Tracker provides a web-based firmware flashing interface that makes it easy to install firmware on your ESP32 boards without any additional software.

## 🌐 Accessing the Web Flasher

1. **Local Development**: Navigate to `http://localhost:3000/flasher.html`
2. **Production**: Available at `https://your-domain.com/flasher.html`

## 🖥️ Browser Requirements

The web flasher uses the WebSerial API and requires:

- **Chrome 89+** or **Edge 89+** browser
- **Safari and Firefox are not supported** (missing WebSerial API)
- **USB connection** to the ESP32 board

## 📱 Supported Boards

The web flasher supports all board variants with automatic firmware selection:

### 🌟 BerryBase NodeMCU-ESP32 (Recommended)
- **Chip**: ESP32 (dual-core)
- **SD Card**: SDMMC interface
- **Features**: WiFi, Bluetooth, 30 GPIO pins
- **Use Case**: General-purpose GPS tracking, well-documented

### 🔋 ESP32-C3 DevKitM-1
- **Chip**: ESP32-C3 (single-core RISC-V)
- **SD Card**: SPI interface
- **Features**: Low power consumption, compact size
- **Use Case**: Battery-powered applications

### 🔧 Generic ESP32 Development Board
- **Chip**: ESP32 (dual-core)
- **SD Card**: SDMMC interface
- **Features**: Universal compatibility
- **Use Case**: Compatible with most ESP32 boards

### 📡 LILYGO TTGO T-Call V1.4
- **Chip**: ESP32 with SIM800L cellular module
- **SD Card**: SPI interface
- **Features**: GSM/GPRS connectivity
- **Use Case**: GPS tracking in areas without WiFi

### 📦 WEMOS D1 Mini ESP32
- **Chip**: ESP32 in compact form factor
- **SD Card**: SPI interface
- **Features**: Arduino D1 Mini compatible
- **Use Case**: Space-constrained installations

### 🚀 ESP32-S3 DevKitC-1
- **Chip**: ESP32-S3 with AI acceleration
- **SD Card**: SDMMC interface
- **Features**: High performance, machine learning
- **Use Case**: Advanced GPS tracking with ML features

## 🔄 Flashing Process

### Step 1: Board Selection
Choose your ESP32 board from the list above. Each board has a dedicated firmware build with optimized pin configurations.

### Step 2: Hardware Connection
1. Connect your ESP32 board to your computer via USB
2. Ensure the board is powered on
3. Most boards enter download mode automatically

### Step 3: Web Flashing
1. Click the **"Install GPS Tracker"** button for your board
2. Select the correct USB port in the browser popup
3. The firmware will be downloaded and flashed automatically
4. Wait for the "Installation complete" message

### Step 4: Initial Configuration
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
- **Board not recognized**: Install CP210x or CH340 drivers if needed
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
esptool.py --port /dev/ttyUSB0 write_flash 0x0 firmware-{board}.bin
```

### Arduino IDE
1. Download the `.bin` file for your board
2. Use Tools > ESP32 Sketch Data Upload

## 📋 Firmware Information

Each firmware build includes:
- **GPS tracking** with 1-minute data logging
- **SD card buffering** with automatic upload
- **Web configuration interface**
- **Captive portal** for initial setup
- **Deep sleep power management**
- **Temperature and humidity monitoring**

## 🔄 Updates

The web flasher always uses the latest firmware release. To update:
1. Visit the flasher page
2. Flash the new firmware (will overwrite existing)
3. Reconfigure if needed (settings are preserved in most cases)

## 🐛 Getting Help

- 📖 [Hardware Setup Guide](HARDWARE.MD)
- 🌐 [Web Interface Documentation](WEB-INTERFACE.MD)
- 🔧 [Firmware Configuration](DEVELOPMENT.MD)
- 🚀 [GitHub Issues](https://github.com/Ottes42/esp32-gps-cartracker/issues)
