# GPS Car Tracker - AI Coding Agent Instructions

**ALWAYS follow these instructions first and fallback to additional search and context gathering ONLY if the information here is incomplete or found to be in error.**

Dual-stack IoT GPS car tracker with ESP32-C3 firmware, Node.js backend, and web dashboard.

**Tech Stack**: ESPHome (firmware) → Express.js + SQLite (backend) → Vanilla HTML/JS (frontend) → Docker + Nginx Proxy Manager (deployment)

## Critical Data Flow

1. **ESP32** → Logs GPS to SD card → Uploads CSV via `/upload/:filename` when WiFi available
2. **User** → Uploads receipt photo via `/uploadReceipt` → Gemini OCR → Geocoded → Stored
3. **Dashboard** → Queries `/api/fuel` and `/api/trips` → Displays maps and statistics

## Core Architecture Patterns

### Authentication & Security
- **Zero auth in app** - relies on `X-Auth-User` header from Nginx proxy
- Usage: `req.authUser = req.get("x-auth-user")`
- NPM config: `proxy_set_header X-Auth-User $remote_user;`
- **Rate limits**: GPS uploads (30/min), receipts (10/min), API calls (60/min)
- **File limits**: CSV (10MB), receipts (50MB for 12-48MP cameras)

### Environment & Paths
- **DATA_PATH**: `/data/` (Docker) or `./data/` (local dev)
- **DB_FILE**: `${DATA_PATH}/gps-tracker.db` (SQLite database)
- **UPLOAD_DIR**: `${DATA_PATH}/uploads/` (receipt photos)
- **GEOCACHE**: `${DATA_PATH}/geocache.json` (address geocoding cache)

## Development Workflow

### Quick Setup
```bash
# 1. Install dependencies (21 seconds)
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Start development server (instant)
npm run dev

# 4. Run tests (1 second - NEVER CANCEL)
npm test

# 5. Check code style (instant)
npm run lint
```

### Essential Commands
```bash
# Development & Testing
npm run dev              # Dev server with hot reload & env loading (instant start)
npm run test             # Run full test suite (53 tests in ~1 second - NEVER CANCEL)
npm run test:watch       # Test in watch mode
npm run test:coverage    # Generate coverage report
npm run lint            # Check StandardJS compliance (instant)
npm run lint:fix        # Auto-fix linting issues

# Test Data Generation
npm run testCsv         # Generate GPS tracking test data (0.2 seconds)
npm run testFuel        # Generate fuel receipt test data (0.2 seconds)

# Firmware Development (ESPHome 2025.8.0)
./scripts/build-firmware.sh all        # Build all board variants (5-15 minutes per board - NEVER CANCEL)
./scripts/build-firmware.sh nodemcu-32s # Build specific board (5-15 minutes - NEVER CANCEL)
./scripts/build-firmware.sh validate   # Validate configs only (15 seconds)
```

## CRITICAL BUILD & TEST TIMING

### NEVER CANCEL Commands - Exact Timeouts Required
- **`npm test`**: ~1 second (timeout: 30 seconds)
- **Firmware validation**: ~15 seconds (timeout: 60 seconds)
- **Single firmware build**: 5-15 minutes (timeout: 20 minutes minimum)
- **All firmware builds**: 60-180 minutes (timeout: 240 minutes minimum)
- **`npm install`**: ~21 seconds (timeout: 120 seconds)

### Instant Commands
- **`npm run dev`**: <1 second startup
- **`npm run lint`**: Instant
- **`node index.js`**: <1 second startup
- **Test data generation**: ~0.2 seconds each

## Supported Hardware

### Primary Board: NodeMCU-ESP32 (BerryBase)
- **ESPHome board**: `nodemcu-32s`
- **Chip**: ESP32
- **SD Card**: SDMMC support (reliable)
- **Status**: Primary, most tested ✅

### Additional Boards
- **ESP32 DevKit**: `esp32dev` (Generic, budget-friendly)
- **ESP32-WROVER-KIT**: `esp-wrover-kit` (With PSRAM)
- **ESP32-S3-DevKitC-1**: `esp32-s3-devkitc-1` (Latest, AI acceleration)

### Temperature Sensor Options
- **DHT11**: Basic humidity/temperature (default)
- **DHT22**: Higher precision humidity/temperature
- **NONE**: Dummy sensor for GPS-only builds

## Build & Run Validation

### Backend Application
```bash
# ALWAYS run these validation steps after making changes:
npm install                    # 21 seconds
npm test                      # 1 second - expect 51/53 tests to pass
npm run lint                  # Instant - must pass with zero errors
node index.js                 # Start server - should see "cartracker api on 8080"
```

### Manual Validation Scenarios
**CRITICAL**: Always test actual functionality after changes:

1. **Server Health Check**:
   ```bash
   curl http://localhost:8080/health
   # Should return: {"status":"ok","timestamp":"...","uptime":...}
   ```

2. **API Endpoints**:
   ```bash
   curl -H "X-Auth-User: development" http://localhost:8080/api/trips
   curl -H "X-Auth-User: development" http://localhost:8080/api/fuel
   # Should return JSON arrays (may be empty)
   ```

3. **Web Dashboard**:
   - Navigate to `http://localhost:8080`
   - Should see GPS Car Tracker dashboard with map, statistics, and navigation
   - Should show "DEV MODE" indicator in development

4. **Test Data Generation**:
   ```bash
   npm run testCsv    # Creates example_drives.csv (1980 rows)
   npm run testFuel   # Adds 3 fuel records to database
   ```

### Firmware Validation
```bash
# Validate all configurations (15 seconds)
./scripts/build-firmware.sh validate

# Test single board build (5-15 minutes - NEVER CANCEL)
echo "wifi_ssid: \"TestNetwork\"\nwifi_password: \"TestPassword\"" > firmware/secrets.yaml
./scripts/build-firmware.sh nodemcu-32s DHT11
```

## Testing Strategy

### Test Coverage (86.51% statements)
- **Unit Tests**: Core functions (distance, geocoding, OCR parsing)
- **Integration Tests**: All 8 API endpoints with authentication
- **Database Tests**: SQLite schema, queries, data integrity

### Test Philosophy
- **In-memory databases** prevent file system conflicts
- **External API mocking** (Gemini AI, geocoding) for reliability
- **Minimal refactoring** - tests work with existing code structure
- **Comprehensive coverage** without over-engineering

### Running Tests
```bash
npm test                    # All tests (takes ~1s - NEVER CANCEL)
npm run test:coverage      # With coverage report
npm run test:watch         # Continuous testing during development
```

**Expected Results**: 51/53 tests pass (2 failures are expected and documented)

## Release Process

### Firmware Releases (Automated)
```bash
# 1. Create and push tag
git tag v1.0.0
git push origin v1.0.0

# 2. GitHub Actions automatically:
# - Builds firmware for all supported boards (60-180 minutes total)
# - Creates GitHub release with binaries  
# - Updates GitHub Pages documentation
```

### Backend Releases (Docker)
```bash
# Manual Docker release
docker build -t gps-tracker:v1.0.0 .
docker push gps-tracker:v1.0.0

# Production deployment
docker-compose up -d
```

## Code Quality Standards

### StandardJS (Automatic Formatting)
- **Pre-commit hooks** auto-fix JavaScript style
- **No semicolons**, **2-space indentation**, **single quotes**
- Bypass only for emergencies: `git commit --no-verify`

### Database Patterns
```javascript
// User isolation pattern
const stmt = db.prepare('SELECT * FROM table WHERE user = ?')
const results = stmt.all(req.authUser)

// Pagination pattern
const limit = Math.min(req.query.limit || 50, 100)
const offset = req.query.offset || 0
```

### Error Handling Patterns
```javascript
// OCR/API calls with graceful fallback
try {
  const parsed = await parseReceipt(imageBuffer)
  // Process success
} catch (e) {
  // Log error, store for retry, return user-friendly message
  console.error('OCR parsing failed:', e.message)
}
```

## File Structure Navigation

### Key Files
- **`index.js`**: Main server entry point
- **`app.js`**: Express app creation (testable module)
- **`firmware/firmware.yaml`**: ESPHome base configuration
- **`docs/`**: Comprehensive documentation
- **`__tests__/`**: Unit and integration tests
- **`scripts/`**: Build automation and test data generation
- **`public/`**: Frontend dashboard files

### Configuration Files
- **`.env.example`**: Template for environment variables  
- **`firmware/secrets.yaml`**: WiFi credentials (create manually)
- **`docker-compose.yaml`**: Production deployment
- **`package.json`**: Dependencies and scripts

## Common Tasks & Solutions

### Adding New API Endpoint
1. **Add route** in `app.js` with authentication middleware
2. **Add tests** in `__tests__/integration/api.test.js`
3. **Update rate limiting** if needed
4. **Run validation**: `npm test && npm run lint`

### Firmware Development
```bash
# NEVER CANCEL - firmware builds take 5-15+ minutes per board
# Local ESPHome development
docker run --rm -v "${PWD}":/config esphome/esphome:2025.8 compile firmware/firmware.yaml

# Upload to device
docker run --rm -v "${PWD}":/config --device=/dev/ttyUSB0 esphome/esphome:2025.8 upload firmware/firmware.yaml

# Monitor logs
docker run --rm -v "${PWD}":/config --device=/dev/ttyUSB0 esphome/esphome:2025.8 logs firmware/firmware.yaml
```

### Database Schema Updates
1. **Update schema** in `initDb()` function in `app.js`
2. **Add migration logic** if needed
3. **Update tests** in `__tests__/unit/database.test.js`
4. **Test locally**: `rm -rf data/ && npm run dev`

## Debugging & Troubleshooting

### Common Issues
- **ESPHome compile errors**: Check pin conflicts in `firmware/firmware.yaml`
- **SD card failures**: Verify SDMMC wiring on NodeMCU-ESP32
- **GPS no fix**: Ensure antenna placement and cold start patience
- **OCR failures**: Check Gemini API key and network connectivity
- **Upload failures**: Verify authentication headers and file size limits

### Development Tools
- **SQLite Browser**: Inspect database during development
- **ESPHome logs**: Real-time device debugging via serial/WiFi
- **Browser DevTools**: Debug frontend dashboard issues
- **curl/Postman**: Test API endpoints directly

### Log Locations
- **ESP32**: Serial output or ESPHome web interface
- **Node.js**: Console output (structured with timestamps)
- **Database**: Query logs in development mode
- **Nginx**: Access and error logs for production proxy

## External Dependencies

### APIs
- **Gemini AI**: OCR processing for fuel receipts
- **OpenStreetMap Nominatim**: Address geocoding (with local cache)

### Critical Services
- **ESPHome**: Firmware compilation (Docker image version pinned)
- **SQLite**: Database (file-based, no external dependencies)
- **Node.js**: Runtime (>=20.0.0 required)

## Production Deployment

### Docker Compose (Recommended)
```bash
# Production deployment
cp .env.example .env
# Edit .env with production values
docker-compose up -d

# Behind Nginx Proxy Manager
# - Set up SSL termination
# - Configure authentication
# - Set proxy headers for user identification
```

### Environment Variables
- **GEMINI_KEY**: Google AI API key for OCR
- **DATA_PATH**: Persistent storage location
- **NODE_ENV**: Set to 'production' for optimized logging
- **AUTH_TYPE**: 'proxy' for NPM integration

## Documentation

### Comprehensive Docs in `/docs/`
- **DEVELOPMENT.MD**: Development environment setup
- **DEPLOYMENT.MD**: Production deployment guide
- **HARDWARE.MD**: ESP32 wiring diagrams and setup
- **API.MD**: REST API endpoint documentation
- **SECURITY.MD**: Authentication and security configuration
- **TESTING.md**: Testing infrastructure and philosophy
- **WEB-INTERFACE.MD**: ESP32 captive portal configuration

### Live Documentation
- **GitHub Pages**: https://ottes42.github.io/esp32-gps-cartracker/
- **Web Flasher**: Browser-based firmware installation
- **Board Support**: Hardware compatibility matrix

## Repository Quick Reference

### Repo Root Directory Listing
```
.
├── README.MD                # Project overview and quick start
├── package.json             # Node.js dependencies and scripts  
├── index.js                # Main server entry point
├── app.js                  # Express app (testable module)
├── Dockerfile              # Docker build configuration
├── docker-compose.yaml     # Production deployment
├── .env.example            # Environment template
├── firmware/               # ESPHome firmware configurations
│   ├── firmware.yaml       # Base ESPHome config
│   └── secrets.yaml        # WiFi credentials (create manually)
├── scripts/                # Build and test utilities
│   ├── build-firmware.sh   # Firmware build automation
│   ├── generateTestCSV.js  # GPS test data generator
│   └── generateFuelData.js # Fuel test data generator
├── public/                 # Web dashboard frontend
├── __tests__/              # Test suites (unit + integration)
├── docs/                   # Comprehensive documentation
└── .github/                # GitHub Actions and configurations
```

### Package.json Scripts Reference
```json
{
  "start": "node index.js",                                    // Production server
  "dev": "node --env-file=.env --env-file=.env.local --watch index.js", // Development
  "test": "NODE_OPTIONS=\"--experimental-vm-modules\" jest",  // Test suite (1s)
  "lint": "standard",                                         // Code style check
  "testCsv": "node scripts/generateTestCSV.js",             // GPS test data (0.2s)
  "testFuel": "node scripts/generateFuelData.js"            // Fuel test data (0.2s)
}
```

## Final Validation Checklist

Before submitting any changes, ALWAYS run this complete validation:

```bash
# 1. Clean install and basic functionality (22 seconds total)
npm install                        # 21 seconds
npm test                          # 1 second - 51/53 tests pass
npm run lint                      # Instant - zero errors

# 2. Server functionality (5 seconds total)
node index.js &                   # Start server
sleep 2
curl http://localhost:8080/health # Should return JSON with "ok" status
pkill -f "node index.js"         # Stop server

# 3. Test data generation (0.4 seconds total)
npm run testCsv                   # 0.2 seconds
npm run testFuel                  # 0.2 seconds

# 4. Firmware validation (15 seconds)
./scripts/build-firmware.sh validate  # All 12 variants must pass

# 5. Manual web interface test
node index.js &
# Open http://localhost:8080 in browser
# Verify dashboard loads with navigation, map area, statistics
pkill -f "node index.js"
```

**Total validation time**: ~43 seconds (excluding manual browser test)

REMEMBER: NEVER CANCEL firmware builds - they take 5-15+ minutes per board and 60-180+ minutes for all boards.
