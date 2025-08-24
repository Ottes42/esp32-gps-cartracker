# Hardware Setup Guide

## Hardware Requirements

### ESP32-C3 Setup

- ESP32-C3 DevKit (tested with esp32-c3-devkitm-1) or any other compatible board, but you have to update the board configuration in the firmware
- GPS module (UART, 9600 baud)
- MicroSD card module (SPI)
- DHT11 temperature/humidity sensor
- Status LED
- ACC voltage sensor circuit

### Pin Configuration

```yaml
PIN_UART_RX:   GPIO20  # GPS RX
PIN_UART_TX:   GPIO21  # GPS TX
PIN_SD_CS:     GPIO10  # SD Card CS
PIN_SPI_SCLK:  GPIO6   # SPI Clock
PIN_SPI_MOSI:  GPIO7   # SPI MOSI
PIN_SPI_MISO:  GPIO2   # SPI MISO
PIN_DHT:       GPIO1   # DHT11 Data
PIN_ACC_SENSE: GPIO4   # ACC Detection
PIN_LED:       GPIO8   # Status LED
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
