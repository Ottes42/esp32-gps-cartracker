# ESP32 Board Configurations for GPS Car Tracker

This document contains the pin configurations for ESP32 boards supported by the GPS Car Tracker firmware.

## Hostname Generation

All firmware builds use **validated short hostnames ≤ 31 characters** to ensure network compatibility:

| Temperature Sensor | Generated Hostname | Length |
|--------------------|-------------------|---------|
| DHT11 | `gps-board-d11` | 13 chars ✅ |
| DHT22 | `gps-board-d22` | 13 chars ✅ |
| None | `gps-board-no` | 12 chars ✅ |

**Note**: All ESP32 boards now use the same simplified hostname pattern for maximum compatibility.

See [docs/HOSTNAME-VALIDATION.md](HOSTNAME-VALIDATION.md) for complete hostname generation rules.

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

### **ESP32-S3-DevKitC-1** (esp32-s3-devkitc-1) - *Enhanced Networking*

**Board**: ESP32-S3-DevKitC-1  
**Chip**: ESP32-S3 (240MHz dual-core, AI acceleration)  
**Flash**: 16MB (enhanced configuration)
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

# ESP32-S3 Enhanced Configuration
esphome:
  platformio_options:
    board_build.flash_mode: dio
    board_upload.maximum_size: 16777216

esp32:
  variant: esp32s3
  flash_size: 16MB
  framework:
    type: esp-idf
    sdkconfig_options:
      # Enhanced WiFi/TCP performance for GPS data uploads
      CONFIG_ESP32_WIFI_STATIC_RX_BUFFER_NUM: "16"
      CONFIG_ESP32_WIFI_DYNAMIC_RX_BUFFER_NUM: "512"
      CONFIG_TCPIP_RECVMBOX_SIZE: "512"
      CONFIG_TCP_SND_BUF_DEFAULT: "65535"
      CONFIG_TCP_WND_DEFAULT: "512000"
      CONFIG_TCP_RECVMBOX_SIZE: "512"

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
- ✅ SDMMC SD card support with S3-specific pin mapping
- ✅ Latest ESP32-S3 with AI acceleration capabilities
- ✅ Native USB support for debugging and firmware updates
- ✅ **Enhanced networking**: Optimized WiFi and TCP buffers for faster GPS data uploads
- ✅ **16MB flash**: Larger flash size for extended firmware features
- ✅ **DIO flash mode**: Optimized flash access for better performance
- ✅ More GPIO pins available than standard ESP32
- ⚠️ Different pin layout than ESP32 - requires S3-specific wiring

### **ESP32-CAM** (esp32-cam)

**Board**: ESP32-CAM  
**Chip**: ESP32 (240MHz dual-core)  
**Flash**: 4MB  
**RAM**: 520KB  
**Camera**: OV2640 2MP  

```yaml
# GPIO Pin Assignments for ESP32-CAM
PIN_UART_RX: "GPIO16"
PIN_UART_TX: "GPIO17" 
PIN_DHT: "GPIO3"
DHT_MODEL: "DHT11|DHT22|NONE"
PIN_ACC_SENSE: "GPIO33"
PIN_LED: "GPIO32"

# SD card SDMMC interface (same as standard ESP32)
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
- ✅ Built-in camera module
- ✅ Compact form factor
- ⚠️ Limited available GPIO pins due to camera usage
- ⚠️ GPIO3 (DHT sensor) shares with UART RX - disable serial debug when using DHT sensor

**Pin Usage Notes**:
- **Camera pins are reserved**: GPIO 0, 2, 4, 5, 12, 13, 14, 15, 18, 19, 25, 26, 27
- **GPIO16/17**: UART for GPS module (safe, not used by camera)
- **GPIO3**: DHT sensor (RX pin, safe when serial debugging disabled)
- **GPIO33**: ACC detection (analog capable, not used by camera)
- **GPIO32**: Status LED (safe, not used by camera)
- **SD Card**: Uses same SDMMC pins as standard ESP32, some overlap with camera

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
- `gps-cartracker-esp32-cam-dht11.bin`
- `gps-cartracker-esp32-cam-dht22.bin`
- `gps-cartracker-esp32-cam-none.bin`
- ... and so on for all boards

## Implementation Notes

- Pin assignments are defined in `substitutions` section of firmware
- SDMMC interface is preferred for SD cards (faster, more reliable than SPI)
- DHT sensors need pull-up resistors on data pin (usually built into modules)
- ACC detection requires appropriate voltage divider for 12V car systems
- Status LED provides visual feedback for GPS fix, WiFi connection, and data logging
- ESP32-S3 uses different GPIO pins due to chip architecture differences
- **ESP32-CAM specific**: GPIO3 (DHT sensor) shares with serial debug - disable serial monitor when using temperature sensor

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

**Choose ESP32-CAM** if:
- You already have an ESP32-CAM board
- You want a compact form factor
- You plan to add camera features later
- You don't mind limited GPIO pins

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