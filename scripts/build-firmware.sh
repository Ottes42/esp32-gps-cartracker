#!/bin/bash

# Build firmware for multiple boards locally
# Usage: ./scripts/build-firmware.sh [board_id]

set -e

# Configuration
ESPHOME_VERSION="2025.8.0"
BOARDS=("nodemcu-32s" "esp32-c3-devkitm-1" "esp32dev" "ttgo-t-call-v1_4" "wemos_d1_mini32" "esp32-s3-devkitc-1")
BUILD_DIR="build"

# Board information
declare -A BOARD_NAMES=(
    ["nodemcu-32s"]="BerryBase NodeMCU-ESP32"
    ["esp32-c3-devkitm-1"]="ESP32-C3 DevKitM-1"
    ["esp32dev"]="Generic ESP32 Development Board"
    ["ttgo-t-call-v1_4"]="LILYGO TTGO T-Call V1.4"
    ["wemos_d1_mini32"]="WEMOS D1 Mini ESP32"
    ["esp32-s3-devkitc-1"]="ESP32-S3 DevKitC-1"
)

declare -A BOARD_CHIPS=(
    ["nodemcu-32s"]="ESP32"
    ["esp32-c3-devkitm-1"]="ESP32-C3"
    ["esp32dev"]="ESP32"
    ["ttgo-t-call-v1_4"]="ESP32"
    ["wemos_d1_mini32"]="ESP32"
    ["esp32-s3-devkitc-1"]="ESP32-S3"
)

# Functions
print_usage() {
    echo "Usage: $0 [board_id|all|validate]"
    echo ""
    echo "Available boards:"
    for board in "${BOARDS[@]}"; do
        echo "  $board - ${BOARD_NAMES[$board]}"
    done
    echo ""
    echo "Examples:"
    echo "  $0 nodemcu-32s    # Build for specific board"
    echo "  $0 all            # Build for all boards"
    echo "  $0 validate       # Just validate configs without compiling"
    echo "  $0                # Interactive selection"
}

create_secrets() {
    if [ ! -f "firmware/secrets.yaml" ]; then
        echo "Creating default secrets.yaml..."
        cat > firmware/secrets.yaml << EOF
wifi_ssid: "CONFIGURE_ME"
wifi_password: "CONFIGURE_ME"
EOF
    fi
}

apply_board_pins() {
    local board=$1
    local config_file=$2
    
    case $board in
        "esp32-c3-devkitm-1")
            # ESP32-C3 specific pins (fewer available, no SDMMC)
            sed -i.bak 's/PIN_UART_RX: "GPIO16"/PIN_UART_RX: "GPIO20"/' "$config_file"
            sed -i.bak 's/PIN_UART_TX: "GPIO17"/PIN_UART_TX: "GPIO21"/' "$config_file"
            sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO10"/' "$config_file"
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO9"/' "$config_file"
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO8"/' "$config_file"
            
            # Remove SDMMC external component (not available on ESP32-C3)
            sed -i.bak '/^external_components:/,/^    components: \[ sd_mmc_card \]$/d' "$config_file"
            
            # Remove SDMMC card section
            sed -i.bak '/^# SD card custom component configuration/,/^  data3_pin: GPIO13$/d' "$config_file"
            
            # Add SPI and SD card section after esp32 block
            sed -i.bak '/^    sdkconfig_options:/a\
\
# SPI interface for SD card (ESP32-C3 doesn'\''t have SDMMC)\
spi:\
  id: sd_spi\
  clk_pin: GPIO6\
  mosi_pin: GPIO7\
  miso_pin: GPIO2\
\
# SD card via SPI\
sd_card:\
  id: sd_card\
  spi_id: sd_spi\
  cs_pin: GPIO3' "$config_file"
            
            # Update SD card file operations to use /sd/ instead of /sdcard/
            sed -i.bak 's|/sdcard/|/sd/|g' "$config_file"
            ;;
        "esp32dev")
            # Generic ESP32 - different pins to avoid conflicts
            sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO22"/' "$config_file"
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO23"/' "$config_file"
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO2"/' "$config_file"
            ;;
        "ttgo-t-call-v1_4")
            # TTGO T-Call - avoid SIM800L pins (26,27)
            sed -i.bak 's/PIN_UART_RX: "GPIO16"/PIN_UART_RX: "GPIO35"/' "$config_file"
            sed -i.bak 's/PIN_UART_TX: "GPIO17"/PIN_UART_TX: "GPIO32"/' "$config_file"
            sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO33"/' "$config_file"
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO36"/' "$config_file"
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO13"/' "$config_file"
            
            # Replace SDMMC with SPI for T-Call (SDMMC pins used by SIM800L)
            sed -i.bak '/^sd_mmc_card:/,/^  data3_pin: GPIO13$/d' "$config_file"
            sed -i.bak '/^    components: \[ sd_mmc_card \]$/a\
\
# SPI interface for SD card (SDMMC pins used by SIM800L)\
spi:\
  id: sd_spi\
  clk_pin: GPIO18\
  mosi_pin: GPIO23\
  miso_pin: GPIO19\
\
# SD card via SPI\
sd_card:\
  id: sd_card\
  spi_id: sd_spi\
  cs_pin: GPIO5' "$config_file"
            sed -i.bak 's|/sdcard/|/sd/|g' "$config_file"
            ;;
        "wemos_d1_mini32")
            # WEMOS D1 Mini - limited pins
            sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO5"/' "$config_file"
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO4"/' "$config_file"
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO2"/' "$config_file"
            
            # Replace SDMMC with SPI for D1 Mini (limited pins)
            sed -i.bak '/^sd_mmc_card:/,/^  data3_pin: GPIO13$/d' "$config_file"
            sed -i.bak '/^    components: \[ sd_mmc_card \]$/a\
\
# SPI interface for SD card (limited pins on D1 Mini)\
spi:\
  id: sd_spi\
  clk_pin: GPIO18\
  mosi_pin: GPIO23\
  miso_pin: GPIO19\
\
# SD card via SPI\
sd_card:\
  id: sd_card\
  spi_id: sd_spi\
  cs_pin: GPIO21' "$config_file"
            sed -i.bak 's|/sdcard/|/sd/|g' "$config_file"
            ;;
        "esp32-s3-devkitc-1")
            # ESP32-S3 - more pins available
            sed -i.bak 's/PIN_UART_RX: "GPIO16"/PIN_UART_RX: "GPIO17"/' "$config_file"
            sed -i.bak 's/PIN_UART_TX: "GPIO17"/PIN_UART_TX: "GPIO18"/' "$config_file"
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO47"/' "$config_file"
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO48"/' "$config_file"
            ;;
        "nodemcu-32s")
            # Default configuration - no changes needed
            ;;
    esac
    
    # Clean up backup files
    rm -f "$config_file".bak
}

validate_board() {
    local board=$1
    local board_name="${BOARD_NAMES[$board]}"
    
    echo "✅ Validating configuration for: $board_name ($board)"
    
    # Create board-specific config
    echo "📝 Creating board-specific configuration..."
    cp firmware/firmware.yaml firmware/firmware-$board.yaml
    
    # Update board in config
    sed -i.bak "s/board: nodemcu-32s$/board: $board/" firmware/firmware-$board.yaml
    sed -i.bak "s/name: gps-cartracker-nmcu$/name: gps-cartracker-$board/" firmware/firmware-$board.yaml
    sed -i.bak "s/friendly_name: GPS Cartracker NMCU$/friendly_name: GPS Cartracker ($board_name)/" firmware/firmware-$board.yaml
    sed -i.bak "s/username: gps-cartracker$/username: gps-cartracker-$board/" firmware/firmware-$board.yaml
    rm firmware/firmware-$board.yaml.bak
    
    # Apply board-specific pin configurations
    echo "🔧 Applying board-specific pin configuration..."
    apply_board_pins "$board" "firmware/firmware-$board.yaml"
    
    # Validate config with ESPHome
    echo "🔍 Validating YAML syntax..."
    if docker run --rm \
        -v "${PWD}:/config" \
        "esphome/esphome:$ESPHOME_VERSION" \
        config "firmware/firmware-$board.yaml" > /dev/null 2>&1; then
        echo "✅ Configuration valid for $board"
        
        # Show key changes
        echo "📋 Configuration summary:"
        echo "   Device name: $(grep 'name:' firmware/firmware-$board.yaml | head -1 | cut -d':' -f2 | xargs)"
        echo "   Board type: $(grep 'board:' firmware/firmware-$board.yaml | cut -d':' -f2 | xargs)"
        echo "   Friendly name: $(grep 'friendly_name:' firmware/firmware-$board.yaml | cut -d':' -f2- | xargs)"
        
        # Keep the config file for review
        echo "   Config saved: firmware/firmware-$board.yaml"
        echo ""
        return 0
    else
        echo "❌ Configuration validation failed for $board"
        rm -f firmware/firmware-$board.yaml
        return 1
    fi
}

build_board() {
    local board=$1
    local board_name="${BOARD_NAMES[$board]}"
    local chip="${BOARD_CHIPS[$board]}"
    
    echo "🔨 Building firmware for: $board_name ($board)"
    
    # Create board-specific config
    echo "📝 Creating board-specific configuration..."
    cp firmware/firmware.yaml firmware/firmware-$board.yaml
    
    # Update board in config
    sed -i.bak "s/board: nodemcu-32s$/board: $board/" firmware/firmware-$board.yaml
    sed -i.bak "s/name: gps-cartracker-nmcu$/name: gps-cartracker-$board/" firmware/firmware-$board.yaml
    sed -i.bak "s/friendly_name: GPS Cartracker NMCU$/friendly_name: GPS Cartracker ($board_name)/" firmware/firmware-$board.yaml
    sed -i.bak "s/username: gps-cartracker$/username: gps-cartracker-$board/" firmware/firmware-$board.yaml
    rm firmware/firmware-$board.yaml.bak
    
    # Apply board-specific pin configurations
    echo "🔧 Applying board-specific pin configuration..."
    apply_board_pins "$board" "firmware/firmware-$board.yaml"
    
    # Compile with Docker
    echo "⚙️  Compiling firmware..."
    if ! docker run --rm \
        -v "${PWD}:/config" \
        "esphome/esphome:$ESPHOME_VERSION" \
        compile "firmware/firmware-$board.yaml"; then
        echo "❌ Compilation failed for $board"
        rm -f firmware/firmware-$board.yaml
        return 1
    fi
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Find and copy binary
    echo "📦 Copying firmware binary..."
    binary_found=false
    for binary in firmware/.esphome/build/gps-cartracker-$board/*.bin; do
        if [ -f "$binary" ]; then
            cp "$binary" "$BUILD_DIR/firmware-$board.bin"
            binary_found=true
            echo "   Binary: $(basename "$binary")"
            break
        fi
    done
    
    if [ "$binary_found" = false ]; then
        echo "❌ No binary found for $board"
        rm -f firmware/firmware-$board.yaml
        return 1
    fi
    
    # Create manifest for ESPHome Web Flasher
    echo "📋 Creating Web Flasher manifest..."
    cat > "$BUILD_DIR/firmware-$board.json" << EOF
{
  "name": "$board_name GPS Car Tracker",
  "version": "$(git describe --tags --always --dirty)",
  "home_assistant_domain": "esphome",
  "new_install_prompt_erase": true,
  "builds": [
    {
      "chipFamily": "$chip",
      "parts": [
        {
          "path": "firmware-$board.bin",
          "offset": 0
        }
      ]
    }
  ]
}
EOF
    
    # Cleanup temp config
    rm -f firmware/firmware-$board.yaml
    
    echo "✅ Build complete: $BUILD_DIR/firmware-$board.bin"
    echo "   Web Flasher: $BUILD_DIR/firmware-$board.json"
    echo ""
}

# Main script
echo "🚗 GPS Car Tracker Firmware Builder"
echo "=================================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    echo "   Please install Docker and try again."
    exit 1
fi

# Create secrets if needed
create_secrets

# Parse arguments
if [ $# -eq 0 ]; then
    # Interactive mode
    echo "Select board to build:"
    select board in "${BOARDS[@]}" "all" "validate" "quit"; do
        case $board in
            "all")
                for b in "${BOARDS[@]}"; do
                    build_board "$b"
                done
                break
                ;;
            "validate")
                for b in "${BOARDS[@]}"; do
                    validate_board "$b"
                done
                break
                ;;
            "quit")
                echo "Cancelled."
                exit 0
                ;;
            "")
                echo "Invalid selection."
                ;;
            *)
                build_board "$board"
                break
                ;;
        esac
    done
elif [ "$1" = "all" ]; then
    # Build all boards
    for board in "${BOARDS[@]}"; do
        build_board "$board"
    done
elif [ "$1" = "validate" ]; then
    # Validate all board configs
    for board in "${BOARDS[@]}"; do
        validate_board "$board"
    done
elif [[ " ${BOARDS[@]} " =~ " $1 " ]]; then
    # Build specific board
    build_board "$1"
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    print_usage
else
    echo "❌ Unknown board: $1"
    echo ""
    print_usage
    exit 1
fi

echo "🎉 Build completed successfully!"
echo ""
echo "📁 Output files in: $BUILD_DIR/"
echo "🌐 Flash via web: https://web.esphome.io/"
echo "📖 Flashing guide: docs/FIRMWARE-FLASHING.MD"
