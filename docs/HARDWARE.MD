# Hardware Setup Guide

## Hardware Requirements

### BerryBase NodeMCU-ESP32 Setup

- BerryBase NodeMCU-ESP32 board (only supported hardware)
- GPS module (UART, 9600 baud)  
- MicroSD card (SDMMC interface)
- DHT11/DHT22 temperature/humidity sensor
- Status LED
- ACC voltage sensor circuit for car ignition detection

### Pin Configuration

```yaml
PIN_UART_RX:   GPIO16  # GPS RX
PIN_UART_TX:   GPIO17  # GPS TX
PIN_DHT:       GPIO21  # DHT11/DHT22 Data
PIN_ACC_SENSE: GPIO18  # ACC Detection (12V->3.3V divider)
PIN_LED:       GPIO19  # Status LED

# SD card SDMMC interface (optimal for NodeMCU-ESP32)
sd_mmc_card:
  clk_pin:   GPIO14  # SD Clock
  cmd_pin:   GPIO15  # SD Command
  data0_pin: GPIO2   # SD Data 0
  data1_pin: GPIO4   # SD Data 1
  data2_pin: GPIO12  # SD Data 2
  data3_pin: GPIO13  # SD Data 3
```

## Power Management

The device automatically:

- **Deep sleeps** for 30 minutes when ACC is off
- **Wakes up** immediately when ACC is detected
- **Logs temperature** once before sleeping
- **Prevents sleep** while ACC is on
- **Syncs data** before entering sleep mode

## Firmware Installation

### Option 1: Manual Compilation

```bash
# Install ESPHome
pip install esphome

# Edit firmware/firmware.yaml with your settings first!
# Update WiFi credentials, server URL, and authentication

# Compile firmware
esphome compile firmware/firmware.yaml

# Flash to device
esphome upload firmware/firmware.yaml
```

### Option 2: Use ESPHome Docker Image

```bash
# Compile firmware
docker run --rm -v $(pwd):/config esphome/esphome compile /config/firmware/firmware.yaml

# Flash to device
docker run --rm -v $(pwd):/config esphome/esphome upload /config/firmware/firmware.yaml
```

## Firmware Configuration

Edit `firmware/firmware.yaml`:

```yaml
substitutions:
  # WiFi Configuration
  WIFI_SSID_1: "Your_WiFi_SSID"
  WIFI_PASS_1: "Your_WiFi_Password"
  
  # Server Configuration
  UPLOAD_TARGET: "https://your-domain.com/upload/"
  BASIC_AUTH_USER: "your-device-name"
  BASIC_AUTH_PASS: "your-secure-password"
```

## Hardware Troubleshooting

### Device not connecting to WiFi

- Check WiFi credentials in firmware configuration
- Verify WiFi network compatibility (2.4GHz required)
- Check device logs via ESPHome

### GPS not working

- Verify GPS module connections
- Check antenna placement (needs clear sky view)
- Monitor GPS status in logs

### SD card issues

- Verify SD card formatting (FAT32)
- Check SPI connections
- Ensure adequate power supply

### View ESP32 logs

```bash
# View ESP32 logs
esphome logs firmware/firmware.yaml
```
