# Firmware Binary Naming Fix - v0.9.3 Issue Resolution

## Problem Summary

The v0.9.3 release CI/CD pipeline was failing with "No binary found for nodemcu-32s with DHT11" error. The issue was traced to an inconsistency in device name generation between the GitHub Actions workflow and the local build script.

## Root Cause Analysis

### The Naming Mismatch

**CI Workflow (Before Fix)**:
- DHT11 sensor → `gps-board-dht` (using first 3 chars)
- DHT22 sensor → `gps-board-dht` (using first 3 chars) ❌ Same as DHT11!
- NONE sensor → `gps-board-no` (special case handled)

**Build Script (Correct Logic)**:
- DHT11 sensor → `gps-board-d11` (using get_short_sensor_name function)
- DHT22 sensor → `gps-board-d22` (using get_short_sensor_name function)  
- NONE sensor → `gps-board-no` (using get_short_sensor_name function)

### The ESPHome Build Directory Issue

ESPHome uses the `name` field from the YAML configuration file to create the build directory:
- Configuration sets `name: gps-board-d11`
- ESPHome creates build directory: `.esphome/build/gps-board-d11/`
- But CI was searching: `.esphome/build/gps-board-dht/` ❌

Similarly, the build script was incorrectly using the config filename instead of the hostname variable to search for binaries.

## Solution Implemented

### 1. Fixed CI Workflow Device Naming (`.github/workflows/build-firmware.yml`)

**Before**:
```bash
sensor_short=$(echo '${{ matrix.sensor }}' | tr '[:upper:]' '[:lower:]' | cut -c1-3)
if [ "$sensor_short" = "non" ]; then
    sensor_short="no"  
fi
device_name="gps-board-${sensor_short}"
```

**After**:
```bash
case "$(echo '${{ matrix.sensor }}' | tr '[:upper:]' '[:lower:]')" in
  "dht11") sensor_short="d11" ;;
  "dht22") sensor_short="d22" ;;
  "none") sensor_short="no" ;;
  *) sensor_short="$(echo '${{ matrix.sensor }}' | tr '[:upper:]' '[:lower:]')" ;;
esac
device_name="gps-board-${sensor_short}"
```

### 2. Fixed Build Script Binary Search (`scripts/build-firmware.sh`)

**Before**:
```bash
device_name=$(basename "$config_name" .yaml)
for binary in .esphome/build/$device_name/*.bin; do
```

**After**:
```bash
# ESPHome uses the 'name' field from the YAML, not the filename
# Use the same hostname that was set in the config
for binary in .esphome/build/$hostname/*.bin; do
```

### 3. Updated Artifact Upload Paths

Fixed the artifact upload paths to match the actual firmware naming:
```yaml
path: |
  firmware_output/firmware-${{ matrix.board }}-*.bin
  firmware_output/firmware-${{ matrix.board }}-*.json
```

### 4. Updated Release Documentation

Corrected the release notes to reflect the actual firmware file names:
- `firmware-nodemcu-32s-dht11.bin` (not `gps-cartracker-nodemcu-32s-dht11.bin`)

## Verification

### Test Coverage
Created comprehensive test suite (`__tests__/unit/firmware-naming.test.js`) covering:
- ✅ Consistent device name generation for all sensor types
- ✅ Device names within ESPHome 31-character hostname limit
- ✅ Naming consistency between CI workflow and build script
- ✅ Valid ESPHome binary search paths

### Validation Results
- ✅ All firmware configurations validate successfully
- ✅ Device names match between CI and build script
- ✅ Binary search paths are consistent
- ✅ Webflasher manifest references are correct

## Expected Binary Paths (After Fix)

| Sensor | Device Name | Binary Search Path |
|--------|-------------|-------------------|
| DHT11  | `gps-board-d11` | `.esphome/build/gps-board-d11/*.bin` |
| DHT22  | `gps-board-d22` | `.esphome/build/gps-board-d22/*.bin` |
| NONE   | `gps-board-no`  | `.esphome/build/gps-board-no/*.bin` |

## Impact

### Immediate Resolution
- ✅ v0.9.4+ releases will successfully build all firmware variants
- ✅ No more "No binary found" errors in CI/CD pipeline
- ✅ All 12 firmware variants (4 boards × 3 sensors) will be included in releases

### Future Prevention
- ✅ Comprehensive test coverage prevents regression
- ✅ Consistent naming logic between CI and local build scripts
- ✅ Better error messages for debugging binary search issues

## Files Modified

1. **`.github/workflows/build-firmware.yml`** - Fixed device name generation logic
2. **`scripts/build-firmware.sh`** - Fixed binary search to use hostname variable
3. **`__tests__/unit/firmware-naming.test.js`** - Added test coverage for the fix

## Compatibility

- ✅ Fully backward compatible with existing webflasher
- ✅ No changes needed to hardware configurations
- ✅ Release asset naming remains consistent
- ✅ Local development workflow unchanged

---

**Issue Resolution**: This fix resolves the v0.9.3 release issue where firmware binaries were missing due to naming inconsistencies between CI workflow and build script logic.