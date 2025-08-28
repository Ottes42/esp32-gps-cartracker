# ESP32 Board Configurations for GPS Car Tracker

This document contains the pin configurations for ESP32 boards supported by the GPS Car Tracker firmware.

## Pin Requirements

The GPS Car Tracker requires the following connections:

- **GPS Module**: UART RX/TX pins for NMEA communication  
- **SD Card**: SDMMC interface for data logging (preferred over SPI)
- **DHT Sensor**: Digital pin for temperature/humidity monitoring (DHT11, DHT22, or disabled)
- **ACC Detection**: Analog pin to detect car ignition (12V → 3.3V divider)
- **Status LED**: Digital pin for status indication

## Supported Hardware Configurations

### **BerryBase NodeMCU-ESP32** (nodemcu-32s) - *Primary Recommended Board*

**Board**: NodeMCU-32S  
**Chip**: ESP32 (240MHz dual-core)  
**Flash**: 4MB  
**RAM**: 520KB  
**USB**: CP2102 UART bridge  

```yaml
# GPIO Pin Assignments for NodeMCU-ESP32
PIN_UART_RX: "GPIO16"
PIN_UART_TX: "GPIO17" 
PIN_DHT: "GPIO21"
DHT_MODEL: "DHT11|DHT22|NONE"
PIN_ACC_SENSE: "GPIO18"
PIN_LED: "GPIO19"

# SD card SDMMC interface (optimal for NodeMCU-ESP32)
sd_mmc_card:
  clk_pin: GPIO14
  cmd_pin: GPIO15
  data0_pin: GPIO2
  data1_pin: GPIO4
  data2_pin: GPIO12
  data3_pin: GPIO13
```

**Features**:
- ✅ Full SDMMC SD card support (fast, reliable)
- ✅ All required GPIO pins available
- ✅ Stable power supply via USB or VIN
- ✅ Well-documented pinout
- ✅ Proven reliability in GPS tracking applications

### **Generic ESP32 DevKit** (esp32dev)

**Board**: ESP32 DevKit  
**Chip**: ESP32 (240MHz dual-core)  
**Flash**: 4MB  
**RAM**: 520KB  
**USB**: CP2102/CH340 UART bridge  

```yaml
# GPIO Pin Assignments for ESP32 DevKit
PIN_UART_RX: "GPIO16"
PIN_UART_TX: "GPIO17" 
PIN_DHT: "GPIO22"
DHT_MODEL: "DHT11|DHT22|NONE"
PIN_ACC_SENSE: "GPIO35"
PIN_LED: "GPIO23"

# SD card SDMMC interface
sd_mmc_card:
  clk_pin: GPIO14
  cmd_pin: GPIO15
  data0_pin: GPIO2
  data1_pin: GPIO4
  data2_pin: GPIO12
  data3_pin: GPIO13
```

**Features**:
- ✅ SDMMC SD card support
- ✅ Widely available and affordable
- ✅ Good pin availability
- ⚠️ Quality varies by manufacturer

### **ESP32-WROVER-KIT** (esp-wrover-kit)

**Board**: ESP32-WROVER-KIT  
**Chip**: ESP32 (240MHz dual-core)  
**Flash**: 4MB  
**PSRAM**: 8MB  
**RAM**: 520KB + 8MB PSRAM  

```yaml
# GPIO Pin Assignments for ESP32-WROVER-KIT
PIN_UART_RX: "GPIO25"
PIN_UART_TX: "GPIO26" 
PIN_DHT: "GPIO27"
DHT_MODEL: "DHT11|DHT22|NONE"
PIN_ACC_SENSE: "GPIO39"
PIN_LED: "GPIO5"

# SD card SDMMC interface
sd_mmc_card:
  clk_pin: GPIO14
  cmd_pin: GPIO15
  data0_pin: GPIO2
  data1_pin: GPIO4
  data2_pin: GPIO12
  data3_pin: GPIO13
```

**Features**:
- ✅ SDMMC SD card support
- ✅ Additional PSRAM for complex operations
- ✅ Built-in LCD and camera connectors
- ⚠️ Some pins used by onboard peripherals

### **ESP32-S3-DevKitC-1** (esp32-s3-devkitc-1)

**Board**: ESP32-S3-DevKitC-1  
**Chip**: ESP32-S3 (240MHz dual-core, AI acceleration)  
**Flash**: 8MB  
**RAM**: 512KB  
**USB**: USB-C with native USB support  

```yaml
# GPIO Pin Assignments for ESP32-S3-DevKitC-1
PIN_UART_RX: "GPIO44"
PIN_UART_TX: "GPIO43" 
PIN_DHT: "GPIO21"
DHT_MODEL: "DHT11|DHT22|NONE"
PIN_ACC_SENSE: "GPIO4"
PIN_LED: "GPIO48"

# SD card SDMMC interface (S3-specific pins)
sd_mmc_card:
  clk_pin: GPIO39
  cmd_pin: GPIO38
  data0_pin: GPIO40
  data1_pin: GPIO41
  data2_pin: GPIO42
  data3_pin: GPIO1
```

**Features**:
- ✅ SDMMC SD card support
- ✅ Latest ESP32-S3 with AI acceleration
- ✅ Native USB support
- ✅ More GPIO pins available
- ⚠️ Different pin layout than ESP32

## Temperature Sensor Options

The firmware supports three temperature sensor configurations:

### DHT11 (Default)
- **Type**: Digital temperature and humidity sensor
- **Accuracy**: ±2°C, ±5% RH
- **Range**: 0-50°C, 20-90% RH
- **Cost**: Low
- **Recommended for**: Basic temperature monitoring

### DHT22 (AM2302)
- **Type**: Digital temperature and humidity sensor  
- **Accuracy**: ±0.5°C, ±2% RH
- **Range**: -40 to 80°C, 0-100% RH
- **Cost**: Medium
- **Recommended for**: Precise temperature monitoring

### None (Dummy Values)
- **Type**: Software-generated dummy values
- **Values**: Fixed 22°C, 60% humidity
- **Cost**: Free
- **Recommended for**: Minimal builds or when temperature is not needed

## Firmware Builds

Each board can be built with any temperature sensor option:

- `gps-cartracker-nodemcu-32s-dht11.bin`
- `gps-cartracker-nodemcu-32s-dht22.bin`  
- `gps-cartracker-nodemcu-32s-none.bin`
- `gps-cartracker-esp32dev-dht11.bin`
- `gps-cartracker-esp32dev-dht22.bin`
- `gps-cartracker-esp32dev-none.bin`
- ... and so on for all boards

## Implementation Notes

- Pin assignments are defined in `substitutions` section of firmware
- SDMMC interface is preferred for SD cards (faster, more reliable than SPI)
- DHT sensors need pull-up resistors on data pin (usually built into modules)
- ACC detection requires appropriate voltage divider for 12V car systems
- Status LED provides visual feedback for GPS fix, WiFi connection, and data logging
- ESP32-S3 uses different GPIO pins due to chip architecture differences

## Board Selection Guidelines

**Choose NodeMCU-ESP32** if:
- You want the most tested and reliable option
- You're new to ESP32 development
- You need proven SD card reliability

**Choose ESP32 DevKit** if:
- You want the most affordable option
- You're comfortable with generic boards
- You need basic functionality

**Choose ESP32-WROVER-KIT** if:
- You need extra PSRAM for future features
- You want built-in peripherals
- You're doing advanced development

**Choose ESP32-S3-DevKitC-1** if:
- You want the latest ESP32 technology
- You need AI acceleration features
- You want native USB support

## Why Multiple Boards Now?

The project now supports multiple boards because:

- **Community Demand**: Users requested support for their existing ESP32 boards
- **Improved Tooling**: Better build scripts can handle board-specific configurations
- **Proven Patterns**: Pin configurations have been validated across multiple board types
- **SDMMC Focus**: All supported boards use reliable SDMMC SD card interface
- **Automated Testing**: Build process validates all board configurations

## Hardware Setup

For complete hardware setup instructions, see [HARDWARE.MD](HARDWARE.MD).

For firmware flashing instructions, see [FIRMWARE-FLASHING.MD](FIRMWARE-FLASHING.MD).