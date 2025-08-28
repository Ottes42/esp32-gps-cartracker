# Release v0.7.0 - Multi-Board Support & Enhanced Documentation

## 🎉 Major Features

### 🔧 Multiple ESP32 Board Support
- **4 ESP32 boards now supported** (previously only NodeMCU-ESP32)
- **NodeMCU-ESP32** (nodemcu-32s) - Primary recommended board
- **ESP32 DevKit** (esp32dev) - Generic, widely available
- **ESP32-WROVER-KIT** (esp-wrover-kit) - With PSRAM support
- **ESP32-S3-DevKitC-1** (esp32-s3-devkitc-1) - Latest ESP32-S3 with AI acceleration

### 🌡️ Temperature Sensor Options
- **DHT11** - Basic, affordable temperature/humidity sensing
- **DHT22** - Higher accuracy temperature/humidity sensing
- **None** - Dummy values for minimal builds
- **12 firmware variants** total (4 boards × 3 sensor options)

### 📚 Enhanced Documentation
- **Hardware setup diagrams** with ASCII art wiring diagrams
- **Car installation guide** with power management options
- **Power bank + dual supply** configuration documentation
- **Voltage divider calculator** for ACC detection
- **Board selection guidelines** to help choose the right hardware

## 🔧 Technical Improvements

### ✅ Test Suite Fixes
- Fixed module export issues preventing tests from running
- Improved test directory handling to prevent conflicts
- All 53 tests now pass successfully

### 🏗️ Build System Enhancements
- **Enhanced build script** with multi-board and multi-sensor support
- **Board-specific pin configurations** automatically applied
- **Temperature sensor variants** with dummy sensor support
- **Automated validation** for all board/sensor combinations

### 🌐 GitHub Pages Optimization
- **Selective deployment** - only triggers when content changes
- **Improved performance** by avoiding unnecessary rebuilds
- **Better content organization** with enhanced navigation

## 📦 Firmware Builds

Each supported board now has 3 firmware variants:

### NodeMCU-ESP32 (Primary Recommended)
- `gps-cartracker-nodemcu-32s-dht11.bin` - With DHT11 sensor
- `gps-cartracker-nodemcu-32s-dht22.bin` - With DHT22 sensor  
- `gps-cartracker-nodemcu-32s-none.bin` - No temperature sensor

### ESP32 DevKit (Generic)
- `gps-cartracker-esp32dev-dht11.bin` - With DHT11 sensor
- `gps-cartracker-esp32dev-dht22.bin` - With DHT22 sensor
- `gps-cartracker-esp32dev-none.bin` - No temperature sensor

### ESP32-WROVER-KIT (With PSRAM)
- `gps-cartracker-esp-wrover-kit-dht11.bin` - With DHT11 sensor
- `gps-cartracker-esp-wrover-kit-dht22.bin` - With DHT22 sensor
- `gps-cartracker-esp-wrover-kit-none.bin` - No temperature sensor

### ESP32-S3-DevKitC-1 (Latest)
- `gps-cartracker-esp32-s3-devkitc-1-dht11.bin` - With DHT11 sensor
- `gps-cartracker-esp32-s3-devkitc-1-dht22.bin` - With DHT22 sensor
- `gps-cartracker-esp32-s3-devkitc-1-none.bin` - No temperature sensor

## 🔗 Pin Configurations

All boards use optimized pin configurations with reliable SDMMC SD card interface:

| Component | NodeMCU-32S | ESP32 DevKit | WROVER-KIT | ESP32-S3 |
|-----------|-------------|--------------|------------|----------|
| GPS RX | GPIO16 | GPIO16 | GPIO25 | GPIO44 |
| GPS TX | GPIO17 | GPIO17 | GPIO26 | GPIO43 |
| DHT Sensor | GPIO21 | GPIO22 | GPIO27 | GPIO21 |
| ACC Sense | GPIO18 | GPIO35 | GPIO39 | GPIO4 |
| Status LED | GPIO19 | GPIO23 | GPIO5 | GPIO48 |

## ⚡ Power Management

### Three Power Supply Options Documented:

1. **Power Bank + Car Charger** (Recommended)
   - Continuous operation even when car is off
   - Clean power supply with no electrical noise
   - 2-4 weeks operation with normal driving patterns

2. **Direct 12V → 5V Conversion**
   - Simpler wiring
   - No battery capacity limitations
   - Powered when car is on only

3. **Dual Power** (Best for Production)
   - Primary power from ACC (efficient)
   - Backup power from always-on source
   - Longest operation time

## 🛠️ Installation & Usage

### Quick Start
1. **Choose your ESP32 board** from the 4 supported options
2. **Select firmware variant** based on your temperature sensor needs
3. **Flash firmware** using the [Web Flasher](https://ottes42.github.io/esp32-gps-cartracker/flasher.html)
4. **Follow hardware setup** guide with wiring diagrams
5. **Install in car** using the power management guide

### Building from Source
```bash
# Build all boards with all sensor variants
./scripts/build-firmware.sh all

# Build specific board with specific sensor
./scripts/build-firmware.sh nodemcu-32s  # DHT11 default

# Validate all configurations  
./scripts/build-firmware.sh validate
```

## 🔍 Testing

- **53/53 tests passing** ✅
- **All board configurations validated** ✅  
- **Build process tested** ✅
- **Documentation verified** ✅

## 📈 Statistics

- **4 ESP32 boards** supported (was 1)
- **12 firmware variants** (was 1)
- **3 temperature sensor options** (was 1 fixed)
- **Enhanced documentation** with ASCII diagrams
- **Optimized build system** with validation
- **Improved test coverage** and reliability

## 🆕 What's New for Users

- **More hardware choices** - use the ESP32 board you already have
- **Flexible sensor options** - choose DHT11, DHT22, or no sensor
- **Better documentation** - clear wiring diagrams and installation guides
- **Easier deployment** - optimized GitHub Pages with selective builds
- **Comprehensive power options** - detailed guide for car installation

## 📋 Migration Guide

### From v0.6.0

- **Existing NodeMCU-ESP32 users**: Continue using your setup - full backward compatibility
- **New users**: Choose from 4 supported boards and 3 sensor options
- **Documentation**: Updated guides with enhanced hardware setup information

### Board Selection
- **Beginners**: NodeMCU-ESP32 (most tested and reliable)
- **Budget-conscious**: ESP32 DevKit (widely available, affordable)
- **Advanced features**: ESP32-WROVER-KIT (PSRAM) or ESP32-S3 (AI acceleration)

## 🎯 Next Steps

This release addresses the core requirements for multi-board support while maintaining backward compatibility and adding comprehensive documentation. Future releases will focus on additional sensor integrations and advanced tracking features.

---

**Full Changelog**: https://github.com/Ottes42/esp32-gps-cartracker/compare/v0.6.0...v0.7.0