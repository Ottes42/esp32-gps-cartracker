# BerryBase NodeMCU-ESP32 Configuration for GPS Car Tracker

This document contains the pin configuration for the BerryBase NodeMCU-ESP32 board, the only board officially supported by the GPS Car Tracker firmware.

## Pin Requirements

The GPS Car Tracker requires the following connections:

- **GPS Module**: UART RX/TX pins for NMEA communication  
- **SD Card**: SDMMC interface for data logging (preferred over SPI)
- **DHT Sensor**: Digital pin for temperature/humidity monitoring
- **ACC Detection**: Analog pin to detect car ignition (12V → 3.3V divider)
- **Status LED**: Digital pin for status indication

## Supported Hardware Configuration

### **BerryBase NodeMCU-ESP32** (nodemcu-32s) - *Only Supported Board*

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
DHT_MODEL: "DHT11"
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

**Why This Board?**:
- **SD Card Reliability**: SDMMC interface provides the most reliable SD card access
- **Pin Availability**: Sufficient GPIO pins for all required connections  
- **Power Stability**: Good power regulation for GPS modules and sensors
- **Documentation**: Extensive community support and documentation
- **Testing**: Thoroughly tested and validated for GPS car tracking

## Implementation Notes

- Pin assignments are defined in `substitutions` section of firmware
- SDMMC interface is preferred for SD cards (faster, more reliable than SPI)
- DHT sensors need pull-up resistors on data pin
- ACC detection requires appropriate voltage divider for 12V car systems
- Status LED provides visual feedback for GPS fix, WiFi connection, and data logging

## Why Only One Board?

Other ESP32 boards have been removed due to:

- **SD Card Issues**: Many boards have unreliable SD card support, especially with SPI interface
- **Pin Conflicts**: Limited GPIO availability causing conflicts between GPS, SD card, and sensors  
- **Power Problems**: Insufficient or unstable power supplies for GPS modules
- **Build Complexity**: Complex board-specific configurations that are hard to maintain
- **Testing Burden**: Impossible to properly test and validate multiple board configurations

The BerryBase NodeMCU-ESP32 provides the optimal balance of reliability, features, and simplicity for GPS car tracking applications.

## Hardware Setup

For complete hardware setup instructions, see [HARDWARE.MD](HARDWARE.MD).

For firmware flashing instructions, see [FIRMWARE-FLASHING.MD](FIRMWARE-FLASHING.MD).