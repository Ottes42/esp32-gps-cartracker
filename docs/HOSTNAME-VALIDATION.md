# Hostname Generation and Length Validation

This document describes the hostname generation rules and validation implemented to prevent network connectivity issues.

## Hostname Length Limit

**ESPHome and mDNS have a strict 31-character limit for hostnames.** Exceeding this limit can cause:
- Network connectivity issues
- Device discovery failures 
- mDNS resolution problems
- WiFi connection instability

## Current Hostname Pattern

The build system generates hostnames using the pattern:
```
gps-tracker-{board_short}-{sensor_short}
```

### Board Short Names
To ensure hostname compliance, board names are shortened:

| Board ID | Full Name | Short Name | Used In Hostname |
|----------|-----------|------------|------------------|
| `nodemcu-32s` | BerryBase NodeMCU-ESP32 | `nmcu32s` | `gps-tracker-nmcu32s-*` |
| `esp32dev` | Generic ESP32 DevKit | `esp32d` | `gps-tracker-esp32d-*` |
| `esp-wrover-kit` | ESP32-WROVER-KIT | `wrover` | `gps-tracker-wrover-*` |
| `esp32-s3-devkitc-1` | ESP32-S3-DevKitC-1 | `s3devkit` | `gps-tracker-s3devkit-*` |

### Sensor Short Names
Temperature sensor names are abbreviated:

| Sensor | Short Name | Used In Hostname |
|--------|------------|------------------|
| `DHT11` | `d11` | `*-d11` |
| `DHT22` | `d22` | `*-d22` |
| `NONE` | `no` | `*-no` |

## Current Hostname Lengths

All generated hostnames are well under the 31-character limit:

| Board + Sensor | Generated Hostname | Length |
|----------------|-------------------|---------|
| NodeMCU + DHT11 | `gps-tracker-nmcu32s-d11` | 23 chars ✅ |
| NodeMCU + DHT22 | `gps-tracker-nmcu32s-d22` | 23 chars ✅ |
| NodeMCU + NONE | `gps-tracker-nmcu32s-no` | 22 chars ✅ |
| ESP32 DevKit + DHT11 | `gps-tracker-esp32d-d11` | 22 chars ✅ |
| S3 DevKit + DHT11 | `gps-tracker-s3devkit-d11` | 24 chars ✅ |

**Maximum length: 24 characters (7 characters under the 31-char limit)**

## Problematic Hostname Example

The original issue reported this problematic hostname:
```
gps-cartracker-nodemcu-32s-dht11  (32 characters ❌)
```

This has been fixed by:
1. Shortening "gps-cartracker" to "gps-tracker" (-2 chars)
2. Shortening "nodemcu-32s" to "nmcu32s" (-6 chars)  
3. Shortening "dht11" to "d11" (-2 chars)
4. Result: "gps-tracker-nmcu32s-d11" (23 characters ✅)

## MAC Address Suffix Prevention

To prevent accidental hostname length overflow, MAC address suffixes are explicitly disabled:

### ESPHome Configuration
```yaml
esphome:
  name: gps-cartracker-nmcu
  name_add_mac_suffix: false  # Prevents MAC suffix like "-a1b2c3"
```

### WiFi Configuration
```yaml
wifi:
  use_address: null  # Prevents MAC-based hostname resolution
```

Without these safeguards, a 23-character hostname could become:
```
gps-tracker-nmcu32s-d11-a1b2c3  (30 characters - very close to limit)
```

## Validation Process

The build script validates every generated hostname:

```bash
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
```

## Testing

Hostname validation is tested in `__tests__/unit/hostname-validation.test.js`:

- ✅ All current hostnames are ≤ 31 characters
- ✅ Hostname patterns follow DNS-safe format
- ✅ MAC suffix is explicitly disabled
- ✅ Problematic hostname examples are detected

Run tests with:
```bash
npm test -- __tests__/unit/hostname-validation.test.js
```

## Adding New Boards

When adding new board configurations:

1. **Choose short board name** (≤8 characters recommended)
2. **Test hostname length** with all sensor combinations
3. **Verify compliance** with `./scripts/build-firmware.sh validate`
4. **Update documentation** if needed

Example for a new board:
```bash
# Add to BOARD_SHORT_NAMES array
["new-board-id"]="newbrd"  # Keep short!

# Validate all combinations
./scripts/build-firmware.sh validate

# Check output for hostname lengths
```

## Network Connectivity Best Practices

- **Keep hostnames short** - More margin for future additions
- **Use DNS-safe characters** - Only `a-z`, `0-9`, and `-`
- **Avoid consecutive hyphens** - Can cause DNS issues  
- **No leading/trailing hyphens** - Invalid DNS format
- **Test on actual hardware** - Verify network discovery works

## Troubleshooting

If you encounter hostname-related network issues:

1. **Check hostname length**: `esphome logs firmware/firmware.yaml`
2. **Verify configuration**: Look for `name_add_mac_suffix: false`
3. **Test mDNS resolution**: `ping hostname.local`
4. **Check network logs**: Router DHCP tables and WiFi logs

## References

- [ESPHome Device Naming](https://esphome.io/components/esphome.html#configuration-variables)
- [mDNS Hostname Limits](https://tools.ietf.org/html/rfc6762)
- [DNS Hostname Requirements](https://tools.ietf.org/html/rfc1123)