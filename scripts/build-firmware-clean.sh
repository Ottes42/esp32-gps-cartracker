#!/bin/bash
# ESPHome GPS Car Tracker - Firmware Builder
# Builds firmware for ESP32 boards with SDMMC SD card support

set -e

# Configuration - Only boards with SDMMC SD card support
ESPHOME_VERSION="2025.8.0"
BOARDS=("nodemcu-32s" "esp32dev" "esp32s3-dev")
BUILD_DIR="build"

# Board information
declare -A BOARD_NAMES=(
    ["nodemcu-32s"]="BerryBase NodeMCU-ESP32"
    ["esp32dev"]="Generic ESP32 Development Board"
    ["esp32s3-dev"]="ESP32-S3 DevKitC-1"
)

declare -A BOARD_CHIPS=(
    ["nodemcu-32s"]="ESP32"
    ["esp32dev"]="ESP32"
    ["esp32s3-dev"]="ESP32-S3"
)

# Mapping from short board names to ESPHome board types
declare -A BOARD_TYPES=(
    ["nodemcu-32s"]="nodemcu-32s"
    ["esp32dev"]="esp32dev"
    ["esp32s3-dev"]="esp32-s3-devkitc-1"
)

# Functions
print_usage() {
    echo "Usage: $0 [board_id|all|validate]"
    echo ""
    echo "Supported boards (with SDMMC SD card support):"
    for board in "${BOARDS[@]}"; do
        echo "  $board - ${BOARD_NAMES[$board]}"
    done
    echo ""
    echo "Options:"
    echo "  all       Build firmware for all supported boards"
    echo "  validate  Validate configuration for all boards (no build)"
    echo "  $0                # Interactive selection"
}

create_secrets() {
    # Ensure we're in the correct directory and firmware dir exists
    if [ ! -d "firmware" ]; then
        echo "Error: firmware/ directory not found. Please run from project root."
        exit 1
    fi
    
    if [ ! -f "firmware/secrets.yaml" ]; then
        echo "Creating default secrets.yaml..."
        if [ -f "firmware/secrets.yaml.template" ]; then
            cp "firmware/secrets.yaml.template" "firmware/secrets.yaml"
            echo "✓ Created firmware/secrets.yaml from template"
        else
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
        fi
        echo "  Note: Device will create WiFi hotspot for initial configuration"
    fi
}

apply_board_pins() {
    local board=$1
    local config_file=$2
    
    case $board in
        "esp32dev")
            # Generic ESP32 - alternative pins to avoid conflicts
            sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO22"/' "$config_file"
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO23"/' "$config_file"
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO2"/' "$config_file"
            ;;
        "esp32s3-dev")
            # ESP32-S3 - high performance with more pins
            sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO47"/' "$config_file"
            sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO48"/' "$config_file"  
            sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO38"/' "$config_file"
            ;;
        "nodemcu-32s")
            # BerryBase NodeMCU-ESP32 - use default pins (no changes needed)
            echo "    Using default pin configuration for NodeMCU-ESP32"
            ;;
        *)
            echo "    Warning: Unknown board '$board', using default pins"
            ;;
    esac
}

build_board() {
    local board=$1
    local esphome_board=${BOARD_TYPES[$board]}
    local board_name=${BOARD_NAMES[$board]}
    local chip=${BOARD_CHIPS[$board]}
    
    echo "🔨 Building firmware for: $board_name ($board -> $esphome_board)"
    
    # Create board-specific config
    echo "📝 Creating board-specific configuration..."
    cp firmware/firmware.yaml "firmware/firmware-$board.yaml"
    
    # Update board type in config
    sed -i.bak "s/board: nodemcu-32s/board: $esphome_board/" "firmware/firmware-$board.yaml"
    sed -i.bak "s/name: gps-cartracker/name: gps-cartracker-$board/" "firmware/firmware-$board.yaml"
    sed -i.bak "s/friendly_name: GPS Cartracker/friendly_name: GPS Cartracker ($board_name)/" "firmware/firmware-$board.yaml"
    
    # Apply board-specific pin configuration
    echo "🔧 Applying board-specific pin configuration..."
    apply_board_pins "$board" "firmware/firmware-$board.yaml"
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Build firmware using ESPHome
    echo "⚙️  Compiling firmware..."
    if esphome compile "firmware/firmware-$board.yaml"; then
        # Find and copy the compiled binary
        binary_path=".esphome/build/gps-cartracker-$board/.pioenvs/gps-cartracker-$board/firmware.bin"
        if [ -f "$binary_path" ]; then
            cp "$binary_path" "$BUILD_DIR/firmware-$board.bin"
            echo "✅ Firmware build successful: $BUILD_DIR/firmware-$board.bin"
            
            # Create manifest for web flasher
            cat > "$BUILD_DIR/firmware-$board-manifest.json" << EOF
{
  "name": "$board_name GPS Car Tracker",
  "version": "$(date +%Y%m%d-%H%M%S)",
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
            echo "✅ Web flasher manifest created: $BUILD_DIR/firmware-$board-manifest.json"
        else
            echo "❌ Binary not found at: $binary_path"
            return 1
        fi
    else
        echo "❌ Compilation failed for $board"
        return 1
    fi
    
    # Cleanup temporary files
    rm -f "firmware/firmware-$board.yaml.bak"
    rm -f "firmware/firmware-$board.yaml"
    
    echo ""
}

validate_board() {
    local board=$1
    local esphome_board=${BOARD_TYPES[$board]}
    local board_name=${BOARD_NAMES[$board]}
    
    echo "✅ Validating configuration for: $board_name ($esphome_board)"
    
    # Create board-specific config
    echo "📝 Creating board-specific configuration..."
    cp firmware/firmware.yaml "firmware/firmware-$board.yaml"
    
    # Update board type in config
    sed -i.bak "s/board: nodemcu-32s/board: $esphome_board/" "firmware/firmware-$board.yaml"
    sed -i.bak "s/name: gps-cartracker/name: gps-cartracker-$board/" "firmware/firmware-$board.yaml"
    sed -i.bak "s/friendly_name: GPS Cartracker/friendly_name: GPS Cartracker ($board_name)/" "firmware/firmware-$board.yaml"
    
    # Apply board-specific pin configuration
    echo "🔧 Applying board-specific pin configuration..."
    apply_board_pins "$board" "firmware/firmware-$board.yaml"
    
    # Validate configuration
    echo "🔍 Validating YAML syntax..."
    if esphome config "firmware/firmware-$board.yaml" > /dev/null 2>&1; then
        echo "✅ Configuration valid for $board"
        echo "📋 Configuration summary:"
        echo "   Device name: gps-cartracker-$board"
        echo "   Board type: $esphome_board"
        echo "   Friendly name: GPS Cartracker ($board_name)"
        echo "   Config saved: firmware/firmware-$board.yaml"
    else
        echo "❌ Configuration validation failed for $board"
        echo "🔍 Running detailed validation..."
        esphome config "firmware/firmware-$board.yaml"
        return 1
    fi
    
    # Cleanup backup files
    rm -f "firmware/firmware-$board.yaml.bak"
    
    echo ""
}

# Check if Docker is available (preferred) or ESPHome is installed locally
if command -v docker >/dev/null 2>&1; then
    echo "🐳 Using Docker for ESPHome builds"
    
    # Function to run ESPHome in Docker
    esphome() {
        docker run --rm -it \
            -v "$PWD":/config \
            -v "$PWD/.esphome":/config/.esphome \
            --device=/dev/ttyUSB0:/dev/ttyUSB0 2>/dev/null || true \
            --device=/dev/ttyACM0:/dev/ttyACM0 2>/dev/null || true \
            "esphome/esphome:${ESPHOME_VERSION}" "$@"
    }
elif command -v esphome >/dev/null 2>&1; then
    echo "🏠 Using local ESPHome installation"
    echo "   Version: $(esphome version 2>/dev/null || echo 'unknown')"
else
    echo "❌ ESPHome not found!"
    echo ""
    echo "Please install ESPHome using one of these methods:"
    echo ""
    echo "🐳 Docker (recommended):"
    echo "   curl -fsSL https://get.docker.com | sh"
    echo ""
    echo "🐍 Python pip:"
    echo "   pip install esphome"
    echo ""
    echo "For more installation options, visit: https://esphome.io"
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
                echo "Goodbye!"
                exit 0
                ;;
            "")
                echo "Invalid selection. Please try again."
                ;;
            *)
                build_board "$board"
                break
                ;;
        esac
    done
else
    case $1 in
        "all")
            echo "🚗 GPS Car Tracker Firmware Builder"
            echo "=================================="
            for board in "${BOARDS[@]}"; do
                build_board "$board"
            done
            ;;
        "validate")
            echo "🚗 GPS Car Tracker Firmware Builder"
            echo "=================================="
            for board in "${BOARDS[@]}"; do
                validate_board "$board"
            done
            ;;
        "--help"|"-h")
            print_usage
            ;;
        *)
            # Check if board is supported
            if [[ " ${BOARDS[@]} " =~ " $1 " ]]; then
                echo "🚗 GPS Car Tracker Firmware Builder"
                echo "=================================="
                build_board "$1"
            else
                echo "❌ Unsupported board: $1"
                echo ""
                print_usage
                exit 1
            fi
            ;;
    esac
fi

echo "🎉 Build process completed!"
