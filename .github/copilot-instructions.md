# GPS Car Tracker - AI Coding Agent Instructions

## Project Architecture

This is a dual-stack IoT GPS car tracker with:
- **ESP32-C3 firmware** (ESPHome YAML) that collects GPS data and uploads via HTTP
- **Node.js backend** (Express + SQLite) for data processing and fuel receipt parsing
- **Frontend web dashboard** (vanilla HTML/JS) for visualization
- **Docker deployment** with Nginx Proxy Manager for HTTP Basic Auth

## Critical Data Flow

1. ESP32 logs GPS data to SD card, uploads CSV via `/upload/:filename` when WiFi available
2. User uploads fuel receipt photos via `/uploadReceipt` → Google Gemini parses receipt → geocoded and stored
3. Dashboard queries `/api/fuel` and `/api/trips` endpoints to display maps and statistics

## Essential Development Patterns

### Authentication Architecture
- **No authentication in app code** - expects `X-Auth-User` header injected by Nginx proxy
- Device name becomes username: `req.authUser = req.get("x-auth-user")`
- Configure NPM proxy with: `proxy_set_header X-Auth-User $remote_user;`
- **Rate limiting**: 30r/m for GPS uploads, 10r/m for receipts, 60r/m for API calls
- **File limits**: 10MB for CSV uploads, 50MB for receipt photos (handles 12-48MP phone cameras)

### Environment Variables (index.js)
```javascript
const DATA_PATH = process.env.DATA_PATH || "/data/";
const DB_FILE = DATA_PATH + (process.env.DB_FILE || "cartracker.db");
```
All paths are relative to DATA_PATH, Docker mounts `/data` volume.

### Firmware Configuration Pattern
- Single `firmware/firmware.yaml` with substitutions for customization
- Pin assignments in substitutions section, referenced as `${PIN_UART_RX}`
- Device hostname auto-generated with MAC suffix: `name_add_mac_suffix: true`

### Database Schema Key Points
- `car_track` table: GPS data with calculated `dt_s` (delta time) and `dist_m` (distance from previous point)
- `fuel` table: Receipt data with geocoded coordinates and OCR text preservation
- All timestamps are ISO 8601 strings, spatial data as REAL lat/lon

## Developer Workflows

### Firmware Development
```bash
esphome compile firmware/firmware.yaml   # Build
esphome upload firmware/firmware.yaml    # Flash via USB
esphome logs firmware/firmware.yaml      # Monitor logs
```

### Local Development
```bash
npm run dev                              # Node with --watch
docker-compose up -d npm                 # NPM for auth testing
docker-compose logs -f cartracker        # App logs
```

### Testing Receipt Parsing
Test with curl: `curl -X POST -F "photo=@receipt.jpg" http://localhost:8080/uploadReceipt`
Requires GEMINI_API_KEY environment variable.
**Note**: Receipt photos can be up to 50MB (modern phone cameras), processing takes 30-60s.

## Project-Specific Conventions

### CSV Upload Format
ESP32 uploads GPS data as: `timestamp,lat,lon,alt,speed,hdop,sats,course,temp,humidity`
Backend calculates time deltas and distances between consecutive points.

### Geocaching Pattern
Address geocoding results cached in `geocache.json` to avoid API rate limits:
```javascript
if (key in geocache) return geocache[key];
// ... make API call ...
geocache[key] = result;
fs.writeFileSync(GEOCACHE, JSON.stringify(geocache));
```

### Error Handling in Receipt Parsing
OCR failures stored in database with `ocr_error` field, retryable via `/retryReceipt/:id` endpoint.

## Integration Points

- **Google Gemini**: Receipt OCR via OpenAI-compatible API at `generativelanguage.googleapis.com`
- **Nominatim**: Geocoding fuel stations via OpenStreetMap
- **ESPHome**: Firmware framework requiring Docker for compilation
- **Nginx Proxy Manager**: Provides SSL termination and HTTP Basic Auth

## Key Files to Understand First
- `index.js`: Main API server with all business logic
- `firmware/firmware.yaml`: ESP32 configuration with GPS/sensor setup  
- `docker-compose.yaml`: Service orchestration with auth proxy
- `public/index.html` + `public/index.js`: Dashboard implementation
