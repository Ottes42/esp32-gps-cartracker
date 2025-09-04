# Hardware Setup Guide

## Hardware Requirements

### Supported ESP32 Boards

- **NodeMCU-ESP32** (recommended - most tested)
- **ESP32 DevKit** (generic, widely available)  
- **ESP32-WROVER-KIT** (with PSRAM)
- **ESP32-S3-DevKitC-1** (latest with AI acceleration)

### Required Components

- GPS module (UART, 9600 baud) - e.g., NEO-6M, NEO-8M
- MicroSD card (Class 10 recommended, SDMMC interface)
- Temperature sensor: DHT11, DHT22, or none (dummy values)
- Status LED (any color)
- ACC voltage sensor circuit for car ignition detection
- Voltage divider components (resistors for 12V → 3.3V)
- Power supply: 12V car adapter → 5V USB or direct 5V input

## Hardware Setup Diagrams

### Basic GPS Car Tracker Wiring

```
                    ESP32 Board (NodeMCU-32S example)
                    ┌─────────────────────────────────────┐
                    │                                     │
GPS Module          │  GPIO16 ──────────────────────────  │  ← GPS RX
┌──────────┐       │  GPIO17 ──────────────────────────  │  → GPS TX
│          │       │  GND    ──────────────────────────  │  ⏚ GPS GND
│  NEO-6M  │       │  3V3    ──────────────────────────  │  → GPS VCC
│          │       │                                     │
│  VCC ────┼───────┤                                     │
│  GND ────┼───────┤  GPIO21 ──────────────────────────  │  ↔ DHT11/22 Data
│  RX  ────┼───────┤  GPIO18 ──────────────────────────  │  ← ACC Sense (12V div)
│  TX  ────┼───────┤  GPIO19 ──────────────────────────  │  → Status LED
└──────────┘       │                                     │
                    │  GPIO14 ──┐                        │  → SD CLK
DHT Sensor          │  GPIO15 ──┤   MicroSD Card Slot    │  → SD CMD  
┌──────────┐       │  GPIO2  ──┤   ┌─────────────────┐   │  ↔ SD DATA0
│   DHT11  │       │  GPIO4  ──┤   │    [microSD]    │   │  ↔ SD DATA1
│   /DHT22 │       │  GPIO12 ──┤   │                 │   │  ↔ SD DATA2
│          │       │  GPIO13 ──┘   └─────────────────┘   │  ↔ SD DATA3
│  VCC ────┼───────┤  3V3                               │
│  DATA ───┼───────┤                                     │
│  GND ────┼───────┤  GND                               │
└──────────┘       └─────────────────────────────────────┘

Status LED: GPIO19 ──→ [LED] ──→ 220Ω ──→ GND
```

### Car Power and ACC Detection Circuit

```
Car 12V System Integration
───────────────────────────

                12V Car Battery
                      │
                      │ (Fused)
              ┌───────┼───────┐
              │     ACC       │
              │   Switch      │ (Ignition controlled)
              └───────┼───────┘
                      │
                ┌─────┼─────┐
                │    12V    │ ← ACC 12V (ignition controlled)  
                │           │
                │  ┌─────┐  │
                │  │ 10kΩ│  │ ← Voltage Divider for ESP32
                │  │     │  │   (12V → 3.3V safe level)
                │  └──┬──┘  │
                │     │     │
                │  ┌─────┐  │
                │  │ 2.2kΩ│ │ 
                │  │     │  │   12V × (2.2kΩ/(10kΩ+2.2kΩ)) = 2.16V
                │  └──┬──┘  │   (Safe for ESP32 GPIO max 3.3V)
                └─────┼─────┘
                      │
                      ├──────→ ESP32 GPIO18 (ACC_SENSE)
                      │
                     GND

Power Supply Options:

Option 1: USB Power Bank (Recommended for Testing)
┌─────────────────┐    USB-A     ┌─────────────────┐
│   Power Bank    ├──────────────→│   ESP32 Board   │
│   (5V output)   │    Cable     │  (USB powered)  │  
└─────────────────┘              └─────────────────┘
       ↑
   12V Car Adapter (keeps power bank charged)

Option 2: 12V to 5V Converter (Direct)
      12V ACC ──→ [12V→5V Buck] ──→ ESP32 VIN (5V)
                   Converter

Option 3: Dual Supply (Recommended for Production)  
      12V ACC ──→ [12V→5V Buck] ──→ ESP32 VIN (5V)
                   Converter
      12V BAT ──→ [Power Bank] ──→ ESP32 USB (backup)
                  (via charger)
```

### Complete Car Installation Layout

```
Car Dashboard/Console Installation
──────────────────────────────────

                     Windshield
    ═══════════════════════════════════════════
                          │
              ┌───────────┴───────────┐  
              │     GPS Antenna       │ ← External GPS antenna
              │    (dash mount)       │   (best signal reception)
              └───────────────────────┘
                          │ Cable
                          │
         Dashboard        │
    ┏━━━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃                     │                      ┃
    ┃    ┌─────────────────┴─────────────┐       ┃
    ┃    │          ESP32 Module         │       ┃ 
    ┃    │  ┌─────┐  ┌──────┐  ┌──────┐ │       ┃
    ┃    │  │ LED │  │ DHT  │  │ SD   │ │       ┃
    ┃    │  │     │  │ 11/22│  │ Card │ │       ┃
    ┃    │  └─────┘  └──────┘  └──────┘ │       ┃
    ┃    └───────────────┬─────────────┘       ┃
    ┃                    │ Cables               ┃
    ┗━━━━━━━━━━━━━━━━━━━━┿━━━━━━━━━━━━━━━━━━━━━━━┛
                          │
                          │ Behind Dashboard
                          │
              ┌───────────┴────────────┐
              │    Power Distribution   │
              │                        │
              │  12V ACC ──→ [Buck Conv] ── 5V to ESP32
              │              │          │
              │  12V BAT ──→ [Charger] ─── Power Bank
              │                        │
              └────────────────────────┘

Under Hood Connection (12V sources):
╔════════════════════════════════════════╗
║                Battery                  ║  
║    [+] ───── 12V BAT (always on)      ║ → Power bank charger  
║    [-] ───── GND                      ║ → Ground reference
║                                       ║
║         Fuse Box                      ║
║    ACC ───── 12V ACC (ignition on)    ║ → ESP32 power + sense
╚════════════════════════════════════════╝
```

### Voltage Divider Calculator

For ACC detection (12V → 3.3V safe input):

```
Target: 12V × (R2 / (R1 + R2)) = 2.1V (safe margin below 3.3V)

Recommended values:
- R1 = 10kΩ (high side)
- R2 = 2.2kΩ (low side to ESP32)

Calculation: 12V × (2.2kΩ / 12.2kΩ) = 2.16V ✓

Alternative values:
- R1 = 4.7kΩ, R2 = 1.5kΩ → 2.9V
- R1 = 15kΩ, R2 = 3.3kΩ → 2.15V  
- R1 = 20kΩ, R2 = 4.7kΩ → 2.3V

⚠️  NEVER connect 12V directly to ESP32 GPIO pins!
```

## Power Management

The device automatically:

- **Deep sleeps** for 30 minutes when ACC is off
- **Wakes up** immediately when ACC is detected
- **Logs temperature** once before sleeping
- **Prevents sleep** while ACC is on
- **Syncs data** before entering sleep mode

### Power Supply Configurations

#### Option 1: Power Bank + Car Charger (Recommended)

**Advantages:**
- ✅ Continuous operation even when car is off
- ✅ Clean power supply (no car electrical noise)
- ✅ Easy installation and removal
- ✅ No risk of draining car battery

**Setup:**
```
12V Car Outlet → USB Car Charger → Power Bank → ESP32 (via USB)
     │                                   ↑
     └─── ACC Detection Circuit ─────────┘ (parallel connection)
```

**Requirements:**
- Power bank: 10,000+ mAh capacity
- Car charger: 2A+ output capability  
- ACC-controlled 12V outlet (cigarette lighter)
- Power bank should support pass-through charging

#### Option 2: Direct 12V → 5V Conversion

**Advantages:**  
- ✅ Simpler wiring
- ✅ No battery capacity limitations
- ✅ Always powered when car is on

**Disadvantages:**
- ❌ No power when car is off
- ❌ Power supply noise from car electrical system
- ❌ Risk of voltage spikes

**Setup:**
```  
12V ACC → Buck Converter (12V→5V) → ESP32 VIN
  │
  └─── Voltage Divider → ESP32 GPIO18 (ACC detection)
```

#### Option 3: Dual Power (Best for Production)

**Advantages:**
- ✅ Primary power from ACC (efficient)
- ✅ Backup power from always-on source
- ✅ Longest operation time
- ✅ Graceful shutdown when car battery is low

**Setup:**
```
12V ACC ──→ Buck Converter ──→ ESP32 VIN (primary)
             │
             └──→ ACC Detection Circuit
             
12V BAT ──→ Power Bank Charger ──→ Power Bank ──→ ESP32 USB (backup)
```

**Implementation:**
- ESP32 automatically switches between VIN and USB power
- Power bank charges when ACC is on
- Provides backup power when ACC is off
- Connect ACC detection to both 12V sources via diode OR circuit

### Power Consumption Guidelines

**Active Logging (ACC ON):**
- ESP32: ~160mA
- GPS Module: ~45mA  
- SD Card: ~10mA (writing)
- DHT Sensor: ~1mA
- **Total: ~220mA @ 5V = 1.1W**

**Deep Sleep (ACC OFF):**
- ESP32: ~10μA
- GPS Module: Powered down via GPIO control
- SD Card: Powered down
- DHT Sensor: ~50μA  
- **Total: ~100μA @ 5V = 0.5mW**

**Power Bank Sizing:**
- 10,000mAh power bank = ~37Wh capacity
- Deep sleep consumption: 37Wh / 0.5mW = 74,000 hours = ~8.5 years
- Active consumption: 37Wh / 1.1W = ~34 hours continuous
- **Practical capacity: 2-4 weeks with normal driving patterns**

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

### Option 3: Use Build Script (Recommended)

The build script automates firmware compilation for all supported boards with hostname validation:

```bash
# Validate all board configurations (fast)
./scripts/build-firmware.sh validate

# Build firmware for specific board
./scripts/build-firmware.sh nodemcu-32s

# Build firmware for all boards (takes 60-180 minutes)
./scripts/build-firmware.sh all
```

The build script automatically:
- ✅ **Validates hostname length** (≤31 characters for network compatibility)
- ✅ **Applies board-specific pin configurations** 
- ✅ **Generates optimized hostnames** using shortened board names
- ✅ **Creates web flasher manifests** for easy installation

See [docs/HOSTNAME-VALIDATION.md](HOSTNAME-VALIDATION.md) for details on hostname generation rules.

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
