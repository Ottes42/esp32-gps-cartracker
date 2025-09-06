#!/bin/bash

# Build firmware for ESP32-based GPS Car Tracker boards
# Usage: ./scripts/build-firmware.sh [board_id] [sensor_type] [esphome_version]
#        ./scripts/build-firmware.sh [action] [esphome_version]

set -e

# Read supported boards from shared configuration file
mapfile -t BOARDS < "${BASH_SOURCE[0]%/*}/../boards.txt"
TEMP_SENSORS=("DHT11" "DHT22" "NONE")

# Configuration - ESPHome version handling
# For 3-arg calls: board sensor version
# For 2-arg calls: check if 2nd arg is sensor or version
if [ $# -eq 3 ]; then
    ESPHOME_VERSION="${3:-${ESPHOME_VERSION:-2025.8.0}}"
elif [ $# -eq 2 ] && [[ " ${TEMP_SENSORS[@]} " =~ " $2 " ]]; then
    # Second arg is a sensor type
    ESPHOME_VERSION="${ESPHOME_VERSION:-2025.8.0}"
else
    # Second arg is ESPHome version (legacy behavior)
    ESPHOME_VERSION="${2:-${ESPHOME_VERSION:-2025.8.0}}"
fi
BUILD_DIR="build"

# Board information
declare -A BOARD_NAMES=(
    ["nodemcu-32s"]="BerryBase NodeMCU-ESP32"
    ["esp32dev"]="Generic ESP32 DevKit"
    ["esp-wrover-kit"]="ESP32-WROVER-KIT"
    ["esp32-s3-devkitc-1"]="ESP32-S3-DevKitC-1"
    ["esp32-cam"]="ESP32-CAM"
)

declare -A BOARD_CHIPS=(
    ["nodemcu-32s"]="ESP32"
    ["esp32dev"]="ESP32"
    ["esp-wrover-kit"]="ESP32"
    ["esp32-s3-devkitc-1"]="ESP32-S3"
    ["esp32-cam"]="ESP32"
)

# Mapping from short board names to ESPHome board types
declare -A BOARD_TYPES=(
    ["nodemcu-32s"]="nodemcu-32s"
    ["esp32dev"]="esp32dev"
    ["esp-wrover-kit"]="esp-wrover-kit"
    ["esp32-s3-devkitc-1"]="esp32-s3-devkitc-1"
    ["esp32-cam"]="esp32dev"
)

# Mapping from board names to shortened hostname-safe names (≤31 chars total)
declare -A BOARD_SHORT_NAMES=(
    ["nodemcu-32s"]="nmcu32s"
    ["esp32dev"]="esp32d"
    ["esp-wrover-kit"]="wrover"
    ["esp32-s3-devkitc-1"]="s3devkit"
    ["esp32-cam"]="esp32cam"
)

# Helper function to shorten sensor names for hostname compatibility
get_short_sensor_name() {
    local sensor=$1
    case "${sensor,,}" in
        "dht11") echo "d11" ;;
        "dht22") echo "d22" ;;
        "none") echo "no" ;;
        *) echo "${sensor,,}" ;;
    esac
}

# Validate hostname length (ESPHome/mDNS limit is 31 characters)
validate_hostname_length() {
    local hostname=$1
    local max_length=31
    
    if [ ${#hostname} -gt $max_length ]; then
        echo "❌ ERROR: Hostname '$hostname' exceeds maximum length of $max_length characters (${#hostname} chars)"
        echo "   This can cause network connectivity issues and device failures."
        echo "   Consider using shorter board names or sensor abbreviations."
        return 1
    fi
    
    echo "✅ Hostname '$hostname' is valid (${#hostname} chars, ≤$max_length limit)"
    return 0
}

# Functions
print_usage() {
    echo "Usage: $0 [board_id] [sensor_type] [esphome_version]"
    echo "       $0 [action] [esphome_version]"
    echo ""
    echo "Available boards:"
    for board in "${BOARDS[@]}"; do
        echo "  $board - ${BOARD_NAMES[$board]}"
    done
    echo ""
    echo "Available sensors: ${TEMP_SENSORS[*]}"
    echo ""
    echo "Parameters:"
    echo "  board_id        - Board to build for, or action (all/validate)"
    echo "  sensor_type     - Temperature sensor (${TEMP_SENSORS[*]}) (default: DHT11)"
    echo "  esphome_version - ESPHome version to use (default: ${ESPHOME_VERSION})"
    echo ""
    echo "Examples:"
    echo "  $0 nodemcu-32s               # Build for specific board with DHT11 sensor"
    echo "  $0 nodemcu-32s DHT22         # Build for specific board with DHT22 sensor"
    echo "  $0 nodemcu-32s DHT11 2025.9.0 # Build with specific ESPHome version"
    echo "  $0 all                       # Build for all boards with all sensors"
    echo "  $0 validate                  # Just validate configs without compiling"
    echo "  $0                           # Interactive selection"
    echo ""
    echo "Environment variables:"
    echo "  ESPHOME_VERSION - Default ESPHome version (current: ${ESPHOME_VERSION})"
    echo "  KEEP_CONFIG=1   - Keep temporary configuration files for debugging"
    echo "                  # Generated configs saved as firmware-BOARD-SENSOR.yaml"

}

create_secrets() {
    # Ensure we're in the correct directory and firmware dir exists
    if [ ! -d "firmware" ]; then
        echo "Error: firmware/ directory not found. Please run from project root."
        exit 1
    fi
    
    if [ ! -f "firmware/secrets.yaml" ]; then
        echo "Creating default secrets.yaml..."

        cat > firmware/secrets.yaml << EOF
# Default secrets for GPS Car Tracker
# These values will work for initial setup and testing
# For production use, replace with your actual WiFi credentials

wifi_ssid: "gps-cartracker-setup"
wifi_password: "setup-setup"

# Server configuration (will be set via web interface)
server_url: "http://192.168.1.100:3000"
server_auth_user: "admin"
server_auth_pass: "password"
EOF
        echo "✓ Created firmware/secrets.yaml with default values"
        echo "  Note: Device will create WiFi hotspot for initial configuration"
    fi
}

apply_temp_sensor() {
    local config_file=$1
    local temp_sensor=$2
    
    case $temp_sensor in
        "DHT11")
            echo "🌡️ Using DHT11 temperature sensor"
            sed -i.bak 's/DHT_MODEL: "DHT11"/DHT_MODEL: "DHT11"/' "$config_file"
            ;;
        "DHT22")
            echo "🌡️ Using DHT22 temperature sensor"
            sed -i.bak 's/DHT_MODEL: "DHT11"/DHT_MODEL: "DHT22"/' "$config_file"
            ;;
        "NONE")
            echo "🌡️ Disabling temperature sensor - using dummy values"
            # Comment out the DHT sensor and replace with template sensors
            sed -i.bak '/- platform: dht/,/update_interval: 15s/d' "$config_file"
            # Insert template sensors at the end of the sensor section
            sed -i.bak '/^sensor:/a\
  # Temperature sensor disabled - using dummy values\
  - platform: template\
    id: car_temp_c\
    name: "Temperature"\
    unit_of_measurement: "°C"\
    lambda: "return 22.0;"\
    update_interval: 15s\
  - platform: template\
    id: car_hum_pct\
    name: "Humidity"\
    unit_of_measurement: "%"\
    lambda: "return 60.0;"\
    update_interval: 15s' "$config_file"
            ;;
    esac
    
    # Clean up backup files
    rm -f "$config_file".bak
}

apply_board_pins() {
    local board=$1
    local config_file=$2
    
    case $board in
        "nodemcu-32s")
            # BerryBase NodeMCU-ESP32 - default configuration, no changes needed
            echo "📋 Using standard NodeMCU-32S pin configuration"
            ;;
        "esp32dev")
            # Generic ESP32 DevKit - adjust pins to avoid conflicts
            echo "📋 Applying ESP32 DevKit pin configuration"
            sed -i.bak 's/PIN_UART_RX: "GPIO16"/PIN_UART_RX: "GPIO16"/' "$config_file"
            sed -i.bak 's/PIN_UART_TX: "GPIO17"/PIN_UART_TX: "GPIO17"/' "$config_file"
            sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO22"/' "$config_file"
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO35"/' "$config_file"
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO23"/' "$config_file"
            ;;
        "esp-wrover-kit")
            # ESP32-WROVER-KIT - use different pins due to built-in peripherals
            echo "📋 Applying ESP32-WROVER-KIT pin configuration"
            sed -i.bak 's/PIN_UART_RX: "GPIO16"/PIN_UART_RX: "GPIO25"/' "$config_file"
            sed -i.bak 's/PIN_UART_TX: "GPIO17"/PIN_UART_TX: "GPIO26"/' "$config_file"
            sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO27"/' "$config_file"
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO39"/' "$config_file"
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO5"/' "$config_file"
            ;;
        "esp32-s3-devkitc-1")
            # ESP32-S3-DevKitC-1 - S3 specific pin mappings
            echo "📋 Applying ESP32-S3-DevKitC-1 pin configuration"
            sed -i.bak 's/PIN_UART_RX: "GPIO16"/PIN_UART_RX: "GPIO44"/' "$config_file"
            sed -i.bak 's/PIN_UART_TX: "GPIO17"/PIN_UART_TX: "GPIO43"/' "$config_file"
            sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO21"/' "$config_file"
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO4"/' "$config_file"
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO48"/' "$config_file"
            # ESP32-S3 has different SD card pins
            sed -i.bak 's/clk_pin: GPIO14/clk_pin: GPIO39/' "$config_file"
            sed -i.bak 's/cmd_pin: GPIO15/cmd_pin: GPIO38/' "$config_file"
            sed -i.bak 's/data0_pin: GPIO2/data0_pin: GPIO40/' "$config_file"
            sed -i.bak 's/data1_pin: GPIO4/data1_pin: GPIO41/' "$config_file"
            sed -i.bak 's/data2_pin: GPIO12/data2_pin: GPIO42/' "$config_file"
            sed -i.bak 's/data3_pin: GPIO13/data3_pin: GPIO1/' "$config_file"
            # Update ESP32 framework to ESP32-S3
            sed -i.bak '/^esp32:/a\
  variant: esp32s3' "$config_file"
            ;;
        "esp32-cam")
            # ESP32-CAM - avoid pins used by camera module
            echo "📋 Applying ESP32-CAM pin configuration"
            # Use GPIO 16/17 for UART (safe, not used by camera)
            sed -i.bak 's/PIN_UART_RX: "GPIO16"/PIN_UART_RX: "GPIO16"/' "$config_file"
            sed -i.bak 's/PIN_UART_TX: "GPIO17"/PIN_UART_TX: "GPIO17"/' "$config_file"
            # Use GPIO 3 for DHT sensor (RX pin, safe when not using serial debug)
            sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO3"/' "$config_file"
            # Use GPIO 33 for ACC sense (analog capable, not used by camera)
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO33"/' "$config_file"
            # Use GPIO 32 for LED (safe, not used by camera)
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO32"/' "$config_file"
            # ESP32-CAM typically uses SPI for SD card due to camera pin conflicts
            # Keep SDMMC pins for now - user can modify if needed
            ;;
    esac
    
    # Clean up backup files
    rm -f "$config_file".bak
}

validate_board_variant() {
    local board=$1
    local temp_sensor=${2:-"DHT11"}
    local board_name="${BOARD_NAMES[$board]}"
    local board_type="${BOARD_TYPES[$board]}"
    local board_short="${BOARD_SHORT_NAMES[$board]}"
    local sensor_short=$(get_short_sensor_name "$temp_sensor")
    
    echo "✅ Validating configuration for: $board_name ($board -> $board_type) with $temp_sensor"
    
    # Generate hostname and validate length (ESPHome/mDNS limit is 31 characters)
    local hostname="gps-board-$sensor_short"
    if ! validate_hostname_length "$hostname"; then
        return 1
    fi
    
    # Create board-specific config with temperature sensor variant  
    local config_name="firmware-$board-${temp_sensor,,}.yaml"
    cp firmware/firmware.yaml "$config_name"
    
    # Update board in config using shortened names for hostname compliance (≤31 chars)
    sed -i.bak "s/board: nodemcu-32s$/board: $board_type/" "$config_name"
    sed -i.bak "s/^  name: gps-board-.*/  name: $hostname/" "$config_name"
    sed -i.bak "s/friendly_name: GPS Board$/friendly_name: GPS Board ($board_name + $temp_sensor)/" "$config_name"
    sed -i.bak "s/username: gps-cartracker$/username: $hostname/" "$config_name"
    rm "$config_name.bak"
    
    # Apply board-specific pin configurations
    apply_board_pins "$board" "$config_name"
    
    # Apply temperature sensor configuration
    apply_temp_sensor "$config_name" "$temp_sensor"
    
    # Validate config with Python validator (faster, works without Docker)
    echo "🔍 Validating YAML syntax with Python..."
    if python3 scripts/validate_esphome.py "$config_name"; then
        echo "✅ Python validation passed for $board with $temp_sensor"
        
        # Show key changes
        echo "📋 Configuration summary:"
        echo "   Device name: $(grep 'name:' "$config_name" | head -1 | cut -d':' -f2 | xargs)"
        echo "   Board type: $(grep 'board:' "$config_name" | cut -d':' -f2 | xargs)"
        echo "   Friendly name: $(grep 'friendly_name:' "$config_name" | cut -d':' -f2- | xargs)"
        echo "   Temperature sensor: $temp_sensor"
        
        # Keep the config file for review if requested, otherwise clean up
        if [ "${KEEP_CONFIG:-}" != "1" ]; then
            rm -f "$config_name"
        else
            echo "   Config saved: $config_name"
        fi
        echo ""
        return 0
    else
        echo "❌ Configuration validation failed for $board with $temp_sensor"
        rm -f "$config_name"
        return 1
    fi
}

# Backwards compatibility wrapper - builds with default DHT11 sensor
build_board() {
    build_board_variant "$1" "DHT11"
}

# Backwards compatibility wrapper - validates with default DHT11 sensor  
validate_board() {
    validate_board_variant "$1" "DHT11"
}

build_board_variant() {
    local board=$1
    local temp_sensor=${2:-"DHT11"}
    local board_name="${BOARD_NAMES[$board]}"
    local board_type="${BOARD_TYPES[$board]}"
    local board_short="${BOARD_SHORT_NAMES[$board]}"
    local sensor_short=$(get_short_sensor_name "$temp_sensor")
    local chip="${BOARD_CHIPS[$board]}"
    
    echo "🔨 Building firmware for: $board_name ($board -> $board_type) with $temp_sensor sensor"
    
    # Generate hostname and validate length (ESPHome/mDNS limit is 31 characters)
    local hostname="gps-board-$sensor_short"
    if ! validate_hostname_length "$hostname"; then
        return 1
    fi
    
    # Create board-specific config with temperature sensor variant
    local config_name="firmware-$board-${temp_sensor,,}.yaml"  # lowercase sensor name
    echo "📝 Creating board-specific configuration: $config_name"
    cp firmware/firmware.yaml "$config_name"
    
    # Update board in config using shortened names for hostname compliance (≤31 chars)
    sed -i.bak "s/board: nodemcu-32s$/board: $board_type/" "$config_name"
    sed -i.bak "s/^[[:space:]]*name: gps-board-.*/  name: $hostname/" "$config_name"
    sed -i.bak "s/friendly_name: GPS Board$/friendly_name: GPS Cartracker ($board_name + $temp_sensor)/" "$config_name"
    sed -i.bak "s/username: gps-cartracker$/username: $hostname/" "$config_name"
    rm "$config_name.bak"
    
    # Apply board-specific pin configurations
    echo "🔧 Applying board-specific pin configuration..."
    apply_board_pins "$board" "$config_name"
    
    # Apply temperature sensor configuration
    echo "🌡️ Applying temperature sensor configuration..."
    apply_temp_sensor "$config_name" "$temp_sensor"
    
    # Copy secrets.yaml to root directory for ESPHome compilation
    # ESPHome expects secrets.yaml in the same directory as the config being compiled
    if [ -f "firmware/secrets.yaml" ]; then
        cp "firmware/secrets.yaml" "secrets.yaml"
        echo "✅ Copied secrets.yaml to root directory for ESPHome"
    else
        echo "❌ secrets.yaml not found in firmware directory"
        rm -f "$config_name"
        return 1
    fi
    
    # Compile with Docker
    echo "⚙️  Compiling firmware..."
    if ! docker run --rm \
        -v "${PWD}:/config" \
        "esphome/esphome:$ESPHOME_VERSION" \
        compile "$config_name"; then
        echo "❌ Compilation failed for $board with $temp_sensor"
        rm -f "$config_name"
        return 1
    fi
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Find and copy binary
    echo "📦 Copying firmware binary..."
    binary_found=false
    # ESPHome uses the 'name' field from the YAML, not the filename
    # Use the same hostname that was set in the config
    for binary in .esphome/build/$hostname/*.bin; do
        if [ -f "$binary" ]; then
            cp "$binary" "$BUILD_DIR/firmware-$board-${temp_sensor,,}.bin"
            binary_found=true
            echo "   Binary: $(basename "$binary")"
            break
        fi
    done
    
    if [ "$binary_found" = false ]; then
        echo "❌ No binary found for $board with $temp_sensor"
        echo "Expected binary in: .esphome/build/$hostname/*.bin"
        ls -la ".esphome/build/" 2>/dev/null || echo "Build directory not found"
        rm -f "$config_name"
        return 1
    fi
    
    # Create manifest for ESPHome Web Flasher
    echo "📋 Creating Web Flasher manifest..."
    cat > "$BUILD_DIR/firmware-$board-${temp_sensor,,}.json" << EOF
{
  "name": "$board_name GPS Car Tracker ($temp_sensor)",
  "version": "$(git describe --tags --always --dirty)",
  "home_assistant_domain": "esphome",
  "new_install_prompt_erase": true,
  "builds": [
    {
      "chipFamily": "$chip",
      "parts": [
        {
          "path": "firmware-$board-${temp_sensor,,}.bin",
          "offset": 0
        }
      ]
    }
  ]
}
EOF
    
    # Clean up temporary secrets file
    rm -f "secrets.yaml"
    echo "🧹 Cleaned up temporary secrets.yaml file"
    
    # Cleanup temp config or keep for debugging
    if [ "${KEEP_CONFIG}" = "1" ]; then
        echo "   Config kept for debugging: $config_name (KEEP_CONFIG=1)"
    else
        rm -f "$config_name"
    fi
    
    echo "✅ Build complete: $BUILD_DIR/firmware-$board-${temp_sensor,,}.bin"
    echo "   Web Flasher: $BUILD_DIR/firmware-$board-${temp_sensor,,}.json"
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
                echo "Building all boards with all temperature sensor variants..."
                for b in "${BOARDS[@]}"; do
                    for t in "${TEMP_SENSORS[@]}"; do
                        build_board_variant "$b" "$t"
                    done
                done
                break
                ;;
            "validate")
                echo "Validating all board configurations..."
                for b in "${BOARDS[@]}"; do
                    for t in "${TEMP_SENSORS[@]}"; do
                        validate_board_variant "$b" "$t"
                    done
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
    # Build all boards with all temperature sensor variants
    echo "Building all boards with all temperature sensor variants..."
    for board in "${BOARDS[@]}"; do
        for temp_sensor in "${TEMP_SENSORS[@]}"; do
            build_board_variant "$board" "$temp_sensor"
        done
    done
elif [ "$1" = "validate" ]; then
    # Validate specific board and sensor, or all if no specific args
    if [ -n "$2" ] && [ -n "$3" ]; then
        # Validate specific board and sensor combination
        if [[ " ${BOARDS[@]} " =~ " $2 " ]] && [[ " ${TEMP_SENSORS[@]} " =~ " $3 " ]]; then
            echo "Validating specific configuration: $2 with $3 sensor..."
            validate_board_variant "$2" "$3"
        else
            echo "❌ Invalid board '$2' or sensor '$3'"
            echo "Available boards: ${BOARDS[*]}"
            echo "Available sensors: ${TEMP_SENSORS[*]}"
            exit 1
        fi
    elif [ -n "$2" ]; then
        # Validate specific board with default DHT11 sensor
        if [[ " ${BOARDS[@]} " =~ " $2 " ]]; then
            echo "Validating specific configuration: $2 with DHT11 sensor..."
            validate_board_variant "$2" "DHT11"
        else
            echo "❌ Invalid board '$2'"
            echo "Available boards: ${BOARDS[*]}"
            exit 1
        fi
    else
        # Validate all board configs with all temperature sensors
        echo "Validating all board configurations..."
        for board in "${BOARDS[@]}"; do
            for temp_sensor in "${TEMP_SENSORS[@]}"; do
                validate_board_variant "$board" "$temp_sensor"
            done
        done
    fi
elif [[ " ${BOARDS[@]} " =~ " $1 " ]]; then
    # Build specific board - check if sensor type is specified
    if [ -n "$2" ] && [[ " ${TEMP_SENSORS[@]} " =~ " $2 " ]]; then
        # Build specific board with specific sensor
        echo "Building specific configuration: $1 with $2 sensor..."
        build_board_variant "$1" "$2"
    else
        # Build specific board with default sensor (backward compatibility)
        build_board "$1"
    fi
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
