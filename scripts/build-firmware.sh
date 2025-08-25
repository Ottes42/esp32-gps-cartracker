#!/bin/bash

# Build firmware for multiple boards locally
# Usage: ./scripts/build-firmware.sh [board_id]

set -e

# Configuration
ESPHOME_VERSION="2025.8.0"
BOARDS=("nodemcu-32s" "esp32-c3-devkitm-1" "esp32dev")
BUILD_DIR="build"

# Board information
declare -A BOARD_NAMES=(
    ["nodemcu-32s"]="BerryBase NodeMCU-ESP32"
    ["esp32-c3-devkitm-1"]="ESP32-C3 DevKitM-1"
    ["esp32dev"]="Generic ESP32 Development Board"
)

declare -A BOARD_CHIPS=(
    ["nodemcu-32s"]="ESP32"
    ["esp32-c3-devkitm-1"]="ESP32-C3"
    ["esp32dev"]="ESP32"
)

# Functions
print_usage() {
    echo "Usage: $0 [board_id|all]"
    echo ""
    echo "Available boards:"
    for board in "${BOARDS[@]}"; do
        echo "  $board - ${BOARD_NAMES[$board]}"
    done
    echo ""
    echo "Examples:"
    echo "  $0 nodemcu-32s    # Build for specific board"
    echo "  $0 all            # Build for all boards"
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

build_board() {
    local board=$1
    local board_name="${BOARD_NAMES[$board]}"
    local chip="${BOARD_CHIPS[$board]}"
    
    echo "🔨 Building firmware for: $board_name ($board)"
    
    # Create board-specific config
    echo "📝 Creating board-specific configuration..."
    cp firmware/firmware.yaml firmware/firmware-$board.yaml
    
    # Update board in config
    sed -i.bak "s/board: nodemcu-32s/board: $board/" firmware/firmware-$board.yaml
    sed -i.bak "s/name: gps-cartracker/name: gps-cartracker-$board/" firmware/firmware-$board.yaml
    sed -i.bak "s/friendly_name: GPS Cartracker/friendly_name: GPS Cartracker ($board_name)/" firmware/firmware-$board.yaml
    rm firmware/firmware-$board.yaml.bak
    
    # Compile with Docker
    echo "⚙️  Compiling firmware..."
    docker run --rm \
        -v "${PWD}:/config" \
        "esphome/esphome:$ESPHOME_VERSION" \
        compile "firmware/firmware-$board.yaml"
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Find and copy binary
    echo "📦 Copying firmware binary..."
    find "firmware/.esphome/build/gps-cartracker-$board/" -name "*.bin" -exec cp {} "$BUILD_DIR/firmware-$board.bin" \;
    
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
    select board in "${BOARDS[@]}" "all" "quit"; do
        case $board in
            "all")
                for b in "${BOARDS[@]}"; do
                    build_board "$b"
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
