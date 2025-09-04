# Application Architecture

## Overview

The GPS Car Tracker application follows a modular architecture with dependency injection, providing separation of concerns while maintaining backward compatibility.

## Module Structure

```
app.js (Factory)
├── lib/config.js      - Environment configuration
├── lib/logger.js      - Structured logging
├── lib/database.js    - SQLite initialization
├── lib/helpers.js     - OCR, geocoding utilities
├── lib/middleware.js  - Authentication, rate limiting
└── lib/routes.js      - API endpoints
```

## Data Flow

```
HTTP Request
     ↓
Authentication Middleware
     ↓
Route Handler (lib/routes.js)
     ↓
Helper Functions (lib/helpers.js)
     ↓
Database (lib/database.js)
     ↓
JSON Response
```

## Module Dependencies

### Configuration (`lib/config.js`)
- **Purpose**: Environment variable management and path resolution
- **Dependencies**: None
- **Exports**: `createConfig()`, `ensureDirectories()`

### Logger (`lib/logger.js`)
- **Purpose**: Structured logging with Winston
- **Dependencies**: winston
- **Exports**: `createLogger()`, `setLoggerConfig()`, log helper functions
- **Features**: Development (colorized) vs Production (JSON) formats

### Database (`lib/database.js`)
- **Purpose**: SQLite database initialization and schema creation
- **Dependencies**: better-sqlite3, logger
- **Exports**: `initializeDatabase()`
- **Tables**: `car_track`, `fuel`

### Helpers (`lib/helpers.js`)
- **Purpose**: Business logic utilities
- **Dependencies**: node-fetch, fs, path, logger
- **Exports**: `createHelpers()` returns `{ parseReceipt, geocodeAddress, distanceKm }`
- **External APIs**: Gemini AI (OCR), OpenStreetMap Nominatim (geocoding)

### Middleware (`lib/middleware.js`)
- **Purpose**: Express middleware setup
- **Dependencies**: express, cors, express-rate-limit
- **Exports**: `createMiddleware()` returns auth, limiters, basic setup functions
- **Features**: Proxy-based authentication, rate limiting

### Routes (`lib/routes.js`)
- **Purpose**: HTTP endpoint definitions
- **Dependencies**: express, multer, logger
- **Exports**: `createRoutes()` returns Express router
- **Endpoints**: `/health`, `/upload/:filename`, `/uploadReceipt`, `/retryReceipt/:id`, `/api/*`

## Dependency Injection

The `createApp(config)` factory function accepts configuration overrides:

```javascript
const app = createApp({
  DATA_PATH: '/custom/path',
  GEMINI_KEY: 'custom-key',
  silentLogger: true  // for tests
})
```

This pattern enables:
- **Testing**: In-memory databases, mocked APIs, silent logging
- **Development**: Verbose logging, local file paths
- **Production**: Optimized settings, persistent storage

## Security Model

- **Authentication**: Proxy-based via `X-Auth-User` header
- **Authorization**: User isolation in database queries
- **Rate Limiting**: Per-endpoint limits (GPS: 30/min, Receipts: 10/min, API: 60/min)
- **File Security**: Path sanitization prevents directory traversal

## Backward Compatibility

The modular refactoring maintains 100% API compatibility:
- Same HTTP endpoints and responses
- Same `createApp(config)` interface for testing
- Same `app.helpers.*` exports for test access
- All existing tests pass without modification

## Error Handling

- **Structured Logging**: All errors logged with context
- **Graceful Degradation**: OCR failures stored for retry
- **Validation**: Input validation with meaningful error messages
- **Database**: Transaction safety and constraint enforcement