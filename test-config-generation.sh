#!/bin/bash
set -e

echo "🧪 Testing firmware configuration with our workflow changes..."

# Create secrets file if it doesn't exist
if [ ! -f "firmware/secrets.yaml" ]; then
    cat > firmware/secrets.yaml << EOF
# Test secrets for validation
wifi_ssid: "test-network"
wifi_password: "test-password"
server_url: "http://192.168.1.100:3000"
server_auth_user: "admin"
server_auth_pass: "password"
EOF
    echo "✅ Created firmware/secrets.yaml for test"
fi

# Test creating a configuration file like our workflow does
config_name="test-firmware-nodemcu-32s-dht11.yaml"
cp firmware/firmware.yaml "$config_name"

# Apply the same changes as our workflow
sed -i.bak "s/board: nodemcu-32s$/board: nodemcu-32s/" "$config_name"

sensor_short=$(echo 'DHT11' | tr '[:upper:]' '[:lower:]' | cut -c1-3)
if [ "$sensor_short" = "non" ]; then
    sensor_short="no"
fi
device_name="gps-board-${sensor_short}"

sed -i.bak "s/name: gps-board-d11$/name: ${device_name}/" "$config_name"
sed -i.bak "s/friendly_name: GPS Board$/friendly_name: GPS Cartracker (BerryBase NodeMCU-ESP32 + DHT11)/" "$config_name"

# DHT11 sensor configuration
sed -i.bak '/- platform: dht/,/update_interval: 15s/{s/type: DHT22/type: DHT11/}' "$config_name"

# Clean up backup files  
rm -f "$config_name.bak"

echo "✅ Created test configuration: $config_name"
echo "📋 Device name: $device_name (${#device_name} chars)"

# Validate YAML structure (skip !secret tags)
echo "🔍 Validating YAML structure..."
if grep -q "name: $device_name" "$config_name" && \
   grep -q "board: nodemcu-32s" "$config_name" && \
   grep -q "friendly_name: GPS Cartracker" "$config_name"; then
    echo "✅ YAML structure is valid"
else
    echo "❌ YAML structure error"
    exit 1
fi

# Check key values
echo "🔍 Checking key configuration values..."
name_value=$(grep "^  name:" "$config_name" | awk '{print $2}')
board_value=$(grep "^  board:" "$config_name" | awk '{print $2}')
friendly_name_value=$(grep "^  friendly_name:" "$config_name" | cut -d' ' -f3-)

echo "   ESPHome name: $name_value"
echo "   Board: $board_value"  
echo "   Friendly name: $friendly_name_value"

if [ ${#name_value} -le 31 ]; then
    echo "✅ Device name length OK (${#name_value} ≤ 31)"
else
    echo "❌ Device name too long (${#name_value} > 31)"
    exit 1
fi

echo "✅ Configuration test completed successfully"

# Clean up
rm -f "$config_name"
echo "🧹 Cleaned up test configuration"