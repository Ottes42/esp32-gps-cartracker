#!/bin/bash

# Build firmware for multiple boards locally
# Usage: ./scripts/build-firmware.sh [board_id]

set -e

# Configuration
ESPHOME_VERSION="2025.8.0"
BOARDS=("nodemcu-32s")
BUILD_DIR="build"

# Board information
declare -A BOARD_NAMES=(
    ["nodemcu-32s"]="BerryBase NodeMCU-ESP32"
)

declare -A BOARD_CHIPS=(
    ["nodemcu-32s"]="ESP32"
)

# Mapping from short board names to ESPHome board types
declare -A BOARD_TYPES=(
    ["nodemcu-32s"]="nodemcu-32s"
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
        "nodemcu-32s")
            # BerryBase NodeMCU-ESP32 - default configuration, no changes needed
            echo "📋 Using standard NodeMCU-32S pin configuration"
            ;;
    esac
    
    # Clean up backup files
    rm -f "$config_file".bak
}

validate_board() {
    local board=$1
    local board_name="${BOARD_NAMES[$board]}"
    local board_type="${BOARD_TYPES[$board]}"
    
    echo "✅ Validating configuration for: $board_name ($board -> $board_type)"
    
    # Create board-specific config
    echo "📝 Creating board-specific configuration..."
    cp firmware/firmware.yaml firmware/firmware-$board.yaml
    
    # Update board in config
    sed -i.bak "s/board: nodemcu-32s$/board: $board_type/" firmware/firmware-$board.yaml
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
    local board_type="${BOARD_TYPES[$board]}"
    local chip="${BOARD_CHIPS[$board]}"
    
    echo "🔨 Building firmware for: $board_name ($board -> $board_type)"
    
    # Create board-specific config
    echo "📝 Creating board-specific configuration..."
    cp firmware/firmware.yaml firmware/firmware-$board.yaml
    
    # Update board in config
    sed -i.bak "s/board: nodemcu-32s$/board: $board_type/" firmware/firmware-$board.yaml
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
