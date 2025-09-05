# v0.9.3 Release Fix Documentation

## Issues Fixed in This Release

### 1. ESPHome Hostname Length Limit (31 Characters)

**Problem**: Device names were exceeding ESPHome's 31-character hostname limit, causing compilation failures.

**Examples of Problematic Names**:
- `gps-cartracker-esp32-s3-devkitc-1-dht22` (34 chars) ❌
- `gps-cartracker-esp-wrover-kit-dht22` (33 chars) ❌

**Solution**: Implemented shortened naming scheme consistent with build-firmware.sh:
- `gps-board-dht` (13 chars) ✅ for DHT11/DHT22
- `gps-board-no` (12 chars) ✅ for NONE sensor

**Code Changes**: Updated `.github/workflows/build-firmware.yml` device naming logic.

### 2. GPIO Pulldown Configuration Issues

**Problem**: Some GPIO pins were configured with `pulldown: true` but don't support pulldown resistors.

**Specific Issues**:
- ESP32dev: GPIO35 doesn't support pulldown (pins 34-39 are input-only)
- ESP-WROVER-KIT: GPIO39 doesn't support pulldown (pins 34-39 are input-only)

**Solution**: Changed ACC sense pins to GPIO32 which supports pulldown resistors.

**Code Changes**: Updated pin configurations in build workflow for affected boards.

### 3. Build Workflow vs Build Script Inconsistency

**Problem**: GitHub Actions workflow used different naming conventions than the existing build-firmware.sh script.

**Solution**: Aligned workflow with build script naming patterns for consistency.

**Benefits**: Ensures both local builds and CI builds produce identical results.

### 4. Webflasher Compatibility Issues

**Problem**: Webflasher expected single firmware file but builds produce multiple sensor variants.

**Before**: Single button for `firmware-nodemcu-32s-manifest.json`
**After**: Three buttons for DHT11, DHT22, and NONE variants with responsive grid layout.

**Code Changes**: Updated `public/flasher.html` with multiple install buttons and improved CSS.

## Validation Results

All fixes have been tested and validated:
- ✅ All device names ≤ 31 characters (ESPHome limit)
- ✅ GPIO pins support required pulldown configuration
- ✅ Manifest naming consistent across build methods
- ✅ Webflasher supports multiple firmware variants
- ✅ Configuration generation produces valid YAML

## Files Modified

1. `.github/workflows/build-firmware.yml`
   - Fixed hostname length issues
   - Fixed GPIO pin configurations
   - Aligned with build script naming

2. `public/flasher.html`
   - Added support for multiple firmware variants
   - Improved responsive layout
   - Updated manifest URLs

## Testing

Run `./final-validation.sh` to validate all fixes are working correctly.

## Expected Results

The next release should successfully:
1. Build all 12 firmware variants without hostname or GPIO errors
2. Attach all 24 assets (12 .bin + 12 .json files) to GitHub release
3. Allow webflasher to install any of the three sensor variants
4. Maintain compatibility with existing build-firmware.sh script

## Release Process

1. Create and push a new tag (e.g., `v0.9.4`)
2. GitHub Actions will trigger the build workflow
3. All 12 firmware variants should build successfully
4. Release will be created with all binary and manifest assets
5. Webflasher will work with new release assets

## Future Considerations

- Consider further reducing device name length if more boards are added
- Validate GPIO pin assignments when adding new board variants
- Maintain consistency between CI workflow and local build script
- Test webflasher functionality with each new release