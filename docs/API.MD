# API Documentation

## Authentication

All API endpoints require HTTP Basic Authentication. The proxy must inject the `X-Auth-User` header containing the authenticated username.

## Direct API Testing (Development)

For local development on port 8080 **from localhost only**, the API automatically accepts a development header:

```bash
# These work ONLY from localhost/127.0.0.1
curl -H "X-Auth-User: development" http://localhost:8080/api/fuel
curl -H "X-Auth-User: development" -F "photo=@receipt.jpg" http://localhost:8080/uploadReceipt
```

**Security Note**: The development header is rejected from non-localhost sources. Production deployments require Nginx proxy with HTTP Basic Auth.

## Production API Access

Production requires proper authentication through the Nginx proxy:

```bash
# Via proxy with Basic Auth (production)
curl -u "gps-device:password" https://gps.yourdomain.com/api/fuel
curl -u "gps-device:password" -F "photo=@receipt.jpg" https://gps.yourdomain.com/uploadReceipt
```

## Data Formats

### GPS CSV Data Format

Create a test CSV file for GPS data uploads:

```csv
# test-gps-data.csv
timestamp,lat,lon,alt,speed,hdop,sats,course,temp,humidity
2025-01-18T08:00:00.000Z,50.1234,8.5678,150.0,45.5,1.2,8,90.0,22.5,65.0
2025-01-18T08:00:01.000Z,50.1235,8.5679,151.0,46.0,1.1,9,91.0,22.4,65.2
2025-01-18T08:00:02.000Z,50.1236,8.5680,152.0,46.5,1.0,10,92.0,22.3,65.4
```

### GPS Tracking Data

Each GPS log entry contains:

- Timestamp (ISO 8601)
- Latitude/Longitude (decimal degrees)
- Altitude (meters)
- Speed (km/h)
- GPS accuracy (HDOP)
- Satellite count
- Course (degrees)
- Temperature (°C)
- Humidity (%)

### Fuel Data

Fuel records include:

- Timestamp
- Volume (liters)
- Price per liter
- Fuel amount and total cost
- Station information (name, address, location)
- Photo path and OCR text
- Consumption calculation

## API Endpoints

### Data Upload

```http
POST /upload/:filename
Content-Type: text/csv
X-Auth-User: device-name

# CSV format: timestamp,lat,lon,alt,speed,hdop,sats,course,temp,humidity
```

### Fuel Tracking

```http
# Upload fuel receipt
POST /uploadReceipt
Content-Type: multipart/form-data
X-Auth-User: username
Body: photo file

# Retry failed receipt parsing
POST /retryReceipt/:id
X-Auth-User: username
```

### Data Retrieval

```http
# Get fuel records
GET /api/fuel?limit=50&offset=0
X-Auth-User: username

# Get monthly fuel statistics
GET /api/fuel/months
X-Auth-User: username

# Get trips
GET /api/trips?limit=20&offset=0
X-Auth-User: username

# Get trip details
GET /api/trip/:start_timestamp
X-Auth-User: username
```

## Testing with Generated Data

Use the test data generator for realistic testing:

```bash
# Generate test data and upload directly
node scripts/generateTestCSV.js \
  --start=2025-01-18 --weeks=1 \
  --server=http://localhost:8080 \
  --uploadName=test-week.csv \
  --auth='gps-cartracker-dev:password'

# Or generate locally first, then upload manually
node scripts/generateTestCSV.js --start=2025-01-18 --weeks=1 --outfile=test.csv
curl -X POST \
  -H "Content-Type: text/csv" \
  -H "X-Auth-User: gps-cartracker-dev" \
  --data-binary @test.csv \
  http://localhost:8080/upload/test.csv
```

## Testing Fuel Data

For testing the fuel tracking features, generate sample fuel receipts:

```bash
# Generate test fuel data directly in database
npm run testFuel

# Or run directly
node scripts/generateFuelData.js
```

This creates realistic fuel receipt data with:

- German gas stations (Shell, Aral, Esso)
- Frankfurt area coordinates matching the GPS test data
- Proper fuel prices and amounts
- Timestamps that correlate with the generated GPS trips

## Rate Limiting

### Common HTTP Status Codes

- `429 Too Many Requests`: Rate limit exceeded
- `413 Request Entity Too Large`: File size limit exceeded
- `408 Request Timeout`: Upload took too long

### Monitoring Rate Limits

Check Nginx error logs for rate limit violations:

```bash
docker-compose logs npm | grep "limiting requests"
```

### Adjusting Limits for Development

For testing, temporarily increase limits:

```nginx
# Development: More permissive limits
limit_req_zone $binary_remote_addr zone=dev_upload:10m rate=120r/m;
```
