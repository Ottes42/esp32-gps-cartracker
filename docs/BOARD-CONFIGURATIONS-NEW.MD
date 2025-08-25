# 📋 Supported Board Configurations

**GPS Car Tracker** firmware is available for ESP32 boards with **SDMMC SD card support** for reliable GPS data logging.

## ✅ Supported Boards (SDMMC Compatible)

### 🌟 BerryBase NodeMCU-ESP32 (Recommended)
- **Board ID**: `nodemcu-32s`  
- **Chip**: ESP32 (dual-core, 240MHz)
- **SD Card**: SDMMC interface (GPIO14, GPIO15, GPIO2, GPIO4, GPIO12, GPIO13)
- **Status**: ✅ **Fully tested and recommended**
- **Use Case**: General-purpose GPS tracking, excellent documentation

**Pin Assignment:**
```yaml
PIN_UART_RX: GPIO16    # GPS module RX
PIN_UART_TX: GPIO17    # GPS module TX  
PIN_DHT: GPIO21        # Temperature/humidity sensor
PIN_ACC_SENSE: GPIO18  # ACC/ignition detection
PIN_LED: GPIO19        # Status LED
```

### 🔧 Generic ESP32 Development Board  
- **Board ID**: `esp32dev`
- **Chip**: ESP32 (dual-core, 240MHz)
- **SD Card**: SDMMC interface (standard ESP32 pins)
- **Status**: ✅ **Well supported**
- **Use Case**: Universal compatibility with most ESP32 boards

**Pin Assignment:**
```yaml  
PIN_UART_RX: GPIO16    # GPS module RX
PIN_UART_TX: GPIO17    # GPS module TX
PIN_DHT: GPIO22        # Temperature/humidity sensor (alt. pin)
PIN_ACC_SENSE: GPIO23  # ACC/ignition detection (alt. pin)
PIN_LED: GPIO2         # Status LED (alt. pin)
```

### 🚀 ESP32-S3 DevKitC-1
- **Board ID**: `esp32s3-dev` 
- **Chip**: ESP32-S3 (dual-core, 240MHz, AI acceleration)
- **SD Card**: SDMMC interface (same as ESP32)
- **Status**: ✅ **High performance option**
- **Use Case**: Advanced GPS tracking with machine learning potential

**Pin Assignment:**
```yaml
PIN_UART_RX: GPIO16    # GPS module RX
PIN_UART_TX: GPIO17    # GPS module TX  
PIN_DHT: GPIO47        # Temperature/humidity sensor
PIN_ACC_SENSE: GPIO48  # ACC/ignition detection  
PIN_LED: GPIO38        # Status LED
```

## ❌ Unsupported Boards (No SDMMC)

The following boards are **not supported** due to SD card limitations:

### ESP32-C3 DevKitM-1
- **Issue**: No SDMMC hardware - only SPI available
- **Problem**: ESPHome SD card component requires SDMMC
- **Alternative**: Direct WiFi upload (unreliable for GPS logging)

### LILYGO TTGO T-Call V1.4  
- **Issue**: SDMMC pins occupied by SIM800L cellular module
- **Problem**: Pin conflicts prevent SD card operation
- **Alternative**: SPI SD card (not supported by current component)

### WEMOS D1 Mini ESP32
- **Issue**: Limited pins and no SDMMC routing  
- **Problem**: Insufficient GPIO pins for SDMMC + GPS + sensors
- **Alternative**: Pin-constrained SPI setup (unreliable)

## 🔧 Hardware Requirements

All supported boards require:

### SD Card Interface (SDMMC)
- **CLK**: GPIO14 - Clock signal
- **CMD**: GPIO15 - Command/response (strapping pin)  
- **DATA0**: GPIO2 - Data bit 0 (strapping pin)
- **DATA1**: GPIO4 - Data bit 1
- **DATA2**: GPIO12 - Data bit 2 (strapping pin) 
- **DATA3**: GPIO13 - Data bit 3

⚠️ **Strapping pins** (GPIO15, GPIO2, GPIO12) are used by the SD card interface. This is standard and accepted for SD card functionality.

### GPS Module Connection
- **UART**: Any available GPIO pins (board-specific)
- **Baud Rate**: 9600 (default for most GPS modules)
- **Power**: 3.3V or 5V depending on module

### Additional Sensors
- **DHT11/DHT22**: Temperature and humidity monitoring
- **ACC Detection**: Automotive ignition sensing (optional)
- **Status LED**: Visual feedback (optional)

## 📦 Firmware Features

All supported boards include:

- ✅ **GPS tracking** with 1-minute data logging
- ✅ **SD card buffering** with automatic upload when WiFi available  
- ✅ **Web configuration interface** via captive portal
- ✅ **Deep sleep power management** when ACC is off
- ✅ **Temperature and humidity monitoring**  
- ✅ **Real-time GPS time synchronization**
- ✅ **OTA firmware updates**

## 🛠️ Board Selection Guide

### Choose **BerryBase NodeMCU-ESP32** if:
- ✅ You want the most tested and documented option
- ✅ You're new to ESP32 development  
- ✅ You need reliable, proven performance
- ✅ Community support is important

### Choose **Generic ESP32** if:
- ✅ You already have an ESP32 development board
- ✅ You want universal compatibility
- ✅ You're comfortable with standard ESP32 pinouts

### Choose **ESP32-S3** if:
- ✅ You need high performance GPS processing
- ✅ You want future-proof hardware with AI capabilities
- ✅ You have advanced feature requirements
- ✅ Performance is more important than cost

## 🔗 Getting Started

1. **Choose your board** from the supported list above
2. **Flash firmware** using the [Web Flasher](../public/flasher.html)
3. **Connect hardware** according to the pin assignments
4. **Initial setup** via WiFi captive portal
5. **Configure server** for GPS data upload

For detailed instructions, see:
- [Firmware Flashing Guide](FIRMWARE-FLASHING.MD)  
- [Hardware Setup Guide](HARDWARE.MD)
- [Web Interface Documentation](WEB-INTERFACE.MD)
