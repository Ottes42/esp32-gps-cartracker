#!/bin/bash
set -e

echo "🧪 Testing GPIO pulldown fix for esp32dev board..."

# Test creating a configuration file for esp32dev (the problematic board)
config_name="test-firmware-esp32dev-dht11.yaml"
cp firmware/firmware.yaml "$config_name"

# Apply the same changes as our workflow for esp32dev
sed -i.bak "s/board: nodemcu-32s$/board: esp32dev/" "$config_name"

# Apply esp32dev pin configuration fixes
echo "📋 Applying ESP32 DevKit pin configuration fixes..."
sed -i.bak 's/PIN_DHT: "GPIO21"/PIN_DHT: "GPIO22"/' "$config_name"
sed -i.bak 's/PIN_ACC_SENSE: "GPIO18"/PIN_ACC_SENSE: "GPIO32"/' "$config_name"  # Fixed: GPIO32 instead of GPIO35
sed -i.bak 's/PIN_LED: "GPIO19"/PIN_LED: "GPIO23"/' "$config_name"

# Clean up backup files
rm -f "$config_name.bak"

echo "✅ Applied pin configuration fixes"

# Check that the GPIO pin changes were applied
echo "🔍 Checking GPIO pin assignments..."
dht_pin=$(grep 'PIN_DHT:' "$config_name" | awk -F'"' '{print $2}')
acc_pin=$(grep 'PIN_ACC_SENSE:' "$config_name" | awk -F'"' '{print $2}')
led_pin=$(grep 'PIN_LED:' "$config_name" | awk -F'"' '{print $2}')

echo "   DHT sensor pin: $dht_pin (should be GPIO22)"
echo "   ACC sense pin: $acc_pin (should be GPIO32, not GPIO35)"
echo "   LED pin: $led_pin (should be GPIO23)"

# Validate the fixes
if [ "$acc_pin" = "GPIO32" ]; then
    echo "✅ ACC sense pin correctly set to GPIO32 (supports pulldown)"
else
    echo "❌ ACC sense pin is $acc_pin, should be GPIO32"
    exit 1
fi

if [ "$dht_pin" = "GPIO22" ]; then
    echo "✅ DHT pin correctly set to GPIO22"
else
    echo "❌ DHT pin is $dht_pin, should be GPIO22"
    exit 1
fi

if [ "$led_pin" = "GPIO23" ]; then
    echo "✅ LED pin correctly set to GPIO23"
else
    echo "❌ LED pin is $led_pin, should be GPIO23"
    exit 1
fi

# Check that the pulldown configuration will work
echo "🔍 Checking pulldown compatibility..."
if grep -q "pulldown: true" "$config_name"; then
    echo "📋 Found pulldown configuration - checking pin compatibility..."
    
    # GPIO32 supports pulldown (it's not in the 34-39 range that doesn't support pulldowns)
    if [ "$acc_pin" = "GPIO32" ]; then
        echo "✅ GPIO32 supports pulldown resistors"
    else
        echo "❌ Pin $acc_pin may not support pulldown"
        exit 1
    fi
else
    echo "📋 No pulldown configuration found"
fi

echo "✅ GPIO pulldown fix validation completed successfully"

# Clean up
rm -f "$config_name"
echo "🧹 Cleaned up test configuration"