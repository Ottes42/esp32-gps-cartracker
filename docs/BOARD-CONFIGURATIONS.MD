# ESP32 Board Pin Configurations for GPS Car Tracker

This document contains pin assignments for different ESP32 boards supported by the GPS Car Tracker firmware.

## Pin Requirements

The GPS Car Tracker needs the following connections:

- **GPS Module**: UART (RX/TX)
- **SD Card**: SDMMC interface (6 pins) or SPI (4 pins)
- **DHT Sensor**: Digital pin for temperature/humidity
- **ACC Detection**: Digital input pin
- **Status LED**: Digital output pin

## Supported Board Configurations

### 1. **NodeMCU-ESP32** (nodemcu-32s) - *Current Main Board*

**Board**: BerryBase NodeMCU-ESP32  
**Chip**: ESP32 (240MHz dual-core)  
**Flash**: 4MB  
**RAM**: 520KB  
**USB**: CH340 USB-UART  

```yaml
# GPIO Pin Assignments for BerryBase NodeMCU-ESP32 (standard ESP32)
PIN_UART_RX: "GPIO16"
PIN_UART_TX: "GPIO17" 
PIN_DHT: "GPIO21"     # Safe pin, away from SD card
DHT_MODEL: "DHT11"
PIN_ACC_SENSE: "GPIO18" # Safe pin, away from SD card
PIN_LED: "GPIO19"     # Safe pin, away from SD card

# SD card SDMMC interface (4-bit mode)
sd_mmc_card:
  clk_pin: GPIO14
  cmd_pin: GPIO15  # Strapping pin
  data0_pin: GPIO2  # Strapping pin  
  data1_pin: GPIO4
  data2_pin: GPIO12  # Strapping pin
  data3_pin: GPIO13
```

**Pros**: Excellent pin availability, stable, well-tested  
**Cons**: Larger form factor  
**Best For**: Development, prototyping, permanent installations

---

### 2. **ESP32-C3 DevKitM-1** (esp32-c3-devkitm-1) - *Compact Low-Power*

**Board**: ESP32-C3-DevKitM-1  
**Chip**: ESP32-C3 (160MHz single-core RISC-V)  
**Flash**: 4MB  
**RAM**: 400KB  
**USB**: Native USB  

```yaml
# GPIO Pin Assignments for ESP32-C3 (fewer pins available)
PIN_UART_RX: "GPIO20"
PIN_UART_TX: "GPIO21" 
PIN_DHT: "GPIO10"     # Available GPIO
DHT_MODEL: "DHT11"
PIN_ACC_SENSE: "GPIO9" # Available GPIO
PIN_LED: "GPIO8"      # Available GPIO

# SD card SPI interface (C3 doesn't have SDMMC)
spi:
  clk_pin: GPIO6
  mosi_pin: GPIO7
  miso_pin: GPIO2
  
sd_card:
  cs_pin: GPIO3
```

**Pros**: Low power, small size, native USB, RISC-V architecture  
**Cons**: Fewer GPIO pins, single core, no SDMMC  
**Best For**: Battery-powered applications, space-constrained installations

---

### 3. **Generic ESP32 DevKit** (esp32dev) - *Universal Compatibility*

**Board**: Generic ESP32 DevKit V1  
**Chip**: ESP32 (240MHz dual-core)  
**Flash**: 4MB  
**RAM**: 520KB  
**USB**: CP2102 USB-UART  

```yaml
# GPIO Pin Assignments for Generic ESP32 DevKit
PIN_UART_RX: "GPIO16"
PIN_UART_TX: "GPIO17" 
PIN_DHT: "GPIO22"     # Different pin than NodeMCU
DHT_MODEL: "DHT11"
PIN_ACC_SENSE: "GPIO23" # Different pin than NodeMCU
PIN_LED: "GPIO2"      # Built-in LED on most boards

# SD card SDMMC interface
sd_mmc_card:
  clk_pin: GPIO14
  cmd_pin: GPIO15
  data0_pin: GPIO2   # Conflict with LED - need alternative
  data1_pin: GPIO4
  data2_pin: GPIO12
  data3_pin: GPIO13
```

**Note**: GPIO2 conflict between LED and SD card DATA0. Alternative configurations needed.

**Pros**: Widely available, cheap, compatible with most shields  
**Cons**: Pin conflicts, quality variations between manufacturers  
**Best For**: Budget builds, experimentation, breadboard prototyping

---

### 4. **TTGO T-Call ESP32** (ttgo-t-call-v1_4) - *Built-in Cellular*

**Board**: LILYGO TTGO T-Call V1.4  
**Chip**: ESP32 + SIM800L GSM/GPRS  
**Flash**: 4MB  
**RAM**: 520KB  
**Cellular**: SIM800L built-in  

```yaml
# GPIO Pin Assignments for TTGO T-Call (avoid SIM800L pins)
PIN_UART_RX: "GPIO35"  # Avoid pins 26,27 (SIM800L)
PIN_UART_TX: "GPIO32" 
PIN_DHT: "GPIO33"     # Available pin
DHT_MODEL: "DHT11"
PIN_ACC_SENSE: "GPIO36" # Input only pin
PIN_LED: "GPIO13"     # Available pin

# SD card SPI interface (SDMMC pins used by SIM800L)
spi:
  clk_pin: GPIO18
  mosi_pin: GPIO23
  miso_pin: GPIO19
  
sd_card:
  cs_pin: GPIO5
```

**Pros**: Built-in cellular, GPS tracking without WiFi, global coverage  
**Cons**: Higher power consumption, requires SIM card/plan  
**Best For**: Remote areas, fleet tracking, backup connectivity

---

### 5. **WEMOS D1 Mini ESP32** (wemos_d1_mini32) - *Arduino Shield Compatible*

**Board**: WEMOS D1 Mini ESP32  
**Chip**: ESP32 (240MHz dual-core)  
**Flash**: 4MB  
**RAM**: 520KB  
**Form Factor**: Arduino D1 Mini compatible  

```yaml
# GPIO Pin Assignments for WEMOS D1 Mini ESP32
PIN_UART_RX: "GPIO16"  # D0
PIN_UART_TX: "GPIO17"  # D1
PIN_DHT: "GPIO5"       # D1 alternative
DHT_MODEL: "DHT11"
PIN_ACC_SENSE: "GPIO4" # D2
PIN_LED: "GPIO2"       # Built-in LED

# SD card SPI interface (limited pins)
spi:
  clk_pin: GPIO18      # D5
  mosi_pin: GPIO23     # D6
  miso_pin: GPIO19     # D7
  
sd_card:
  cs_pin: GPIO21       # D4
```

**Pros**: Small form factor, shield compatibility, breadboard friendly  
**Cons**: Limited pins, pin conflicts  
**Best For**: Compact installations, shield-based designs

---

### 6. **ESP32-S3 DevKitC** (esp32-s3-devkitc-1) - *High Performance*

**Board**: ESP32-S3-DevKitC-1  
**Chip**: ESP32-S3 (240MHz dual-core + AI acceleration)  
**Flash**: 8MB  
**RAM**: 512KB  
**USB**: Native USB + JTAG  

```yaml
# GPIO Pin Assignments for ESP32-S3 (more pins available)
PIN_UART_RX: "GPIO17"
PIN_UART_TX: "GPIO18" 
PIN_DHT: "GPIO21"     # Available pin
DHT_MODEL: "DHT11"
PIN_ACC_SENSE: "GPIO47" # High GPIO numbers available
PIN_LED: "GPIO48"     # RGB LED pin

# SD card SDMMC interface
sd_mmc_card:
  clk_pin: GPIO14
  cmd_pin: GPIO15
  data0_pin: GPIO2
  data1_pin: GPIO4
  data2_pin: GPIO12
  data3_pin: GPIO13
```

**Pros**: High performance, more GPIO pins, AI acceleration, native USB  
**Cons**: Higher cost, overkill for basic GPS tracking  
**Best For**: Advanced features, machine learning, future expansion

---

## Pin Conflict Resolution

### Common Conflicts

1. **Strapping Pins**: GPIO0, GPIO2, GPIO12, GPIO15 have special boot functions
2. **Input-Only Pins**: GPIO34, GPIO35, GPIO36, GPIO39 (ESP32 classic)
3. **Flash Pins**: GPIO6-GPIO11 (usually reserved for flash memory)
4. **UART0**: GPIO1 (TX0), GPIO3 (RX0) (used for programming/debug)

### Solutions

- **Use SPI instead of SDMMC** for SD cards when pins conflict
- **Alternative pin assignments** for different board layouts
- **Disable unused features** to free up pins
- **External I2C expanders** for additional GPIO

## Board Selection Guide

| Use Case | Recommended Board | Reason |
|----------|------------------|---------|
| **Development** | NodeMCU-ESP32 | Most pins, stable, well-documented |
| **Production** | ESP32-DevKitC | Reliable, widely available |
| **Battery Powered** | ESP32-C3 | Low power, small size |
| **Remote/Cellular** | TTGO T-Call | Built-in GSM, works anywhere |
| **Compact Build** | WEMOS D1 Mini | Small, shield compatible |
| **Future Features** | ESP32-S3 | High performance, expansion ready |

## Implementation Notes

- Pin assignments are defined in `substitutions` section
- Board-specific configurations in build script
- SDMMC preferred over SPI for SD cards (faster, fewer pins)
- DHT sensors need pull-up resistors on data pin
- ACC detection needs appropriate voltage divider for 12V car systems

## Testing Status

| Board | Config Status | Validation | Binary Build | Notes |
|-------|--------------|------------|--------------|-------|
| nodemcu-32s | ✅ Complete | ✅ Passed | ✅ Working | Main development board |
| esp32-c3-devkitm-1 | ⚠️ Draft | ❌ Failed | ❌ Not tested | Needs SPI SD card |
| esp32dev | ⚠️ Draft | ❌ Not tested | ❌ Not tested | Pin conflicts |
| ttgo-t-call-v1_4 | 📝 Planned | ❌ Not tested | ❌ Not tested | Cellular integration |
| wemos_d1_mini32 | 📝 Planned | ❌ Not tested | ❌ Not tested | Limited pins |
| esp32-s3-devkitc-1 | 📝 Planned | ❌ Not tested | ❌ Not tested | Advanced features |
