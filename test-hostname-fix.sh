#!/bin/bash

# Test hostname length fixes - updated with build script naming scheme
echo "🧪 Testing hostname length fixes (build script naming scheme)..."

sensors=("DHT11" "DHT22" "NONE")

for sensor in "${sensors[@]}"; do
    # Apply the same logic as the workflow
    sensor_short=$(echo "$sensor" | tr '[:upper:]' '[:lower:]' | cut -c1-3)
    if [ "$sensor_short" = "non" ]; then
        sensor_short="no"
    fi
    device_name="gps-board-${sensor_short}"
    
    length=${#device_name}
    
    if [ $length -le 31 ]; then
        echo "✅ $sensor -> $device_name (${length} chars)"
    else
        echo "❌ $sensor -> $device_name (${length} chars) - TOO LONG!"
    fi
done

echo ""
echo "🧪 Testing manifest file names..."
boards=("nodemcu-32s" "esp32dev" "esp-wrover-kit" "esp32-s3-devkitc-1")
sensors_lower=("dht11" "dht22" "none")

for board in "${boards[@]}"; do
    for sensor in "${sensors_lower[@]}"; do
        manifest_name="firmware-${board}-${sensor}.json"
        echo "📋 $manifest_name"
    done
done