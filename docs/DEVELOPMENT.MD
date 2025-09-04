# Development Guide

## Project Structure

### Core Application Files
- **`app.js`** - Main application factory with dependency injection
- **`index.js`** - Server startup script
- **`lib/`** - Modular application components
  - `config.js` - Environment configuration and directory setup
  - `logger.js` - Winston-based structured logging 
  - `database.js` - SQLite database initialization and schema
  - `helpers.js` - OCR, geocoding, and utility functions
  - `middleware.js` - Authentication, rate limiting, and Express middleware
  - `routes.js` - API endpoints and route handlers

### Additional Directories
- **`scripts/`** - Utility scripts for development and testing
  - `generateTestCSV.js` - Generate GPS test data
  - `generateFuelData.js` - Generate fuel test data
- **`docs/`** - Documentation files
  - `NGINX.MD` - Nginx configuration guide  
  - `NGINX-PROXY-MANAGER.MD` - NPM setup guide
- **`public/`** - Frontend web dashboard files
- **`__tests__/`** - Test suites (unit and integration tests)
  - `helpers.js` - Test configuration and utilities
  - `unit/` - Unit tests for individual functions
  - `integration/` - API endpoint integration tests

## Architecture Overview

The application follows a modular architecture with dependency injection:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   index.js  │───▶│   app.js    │───▶│ Express App │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │    lib/     │
                   ├─────────────┤
                   │ • config    │
                   │ • logger    │
                   │ • database  │
                   │ • helpers   │
                   │ • middleware│
                   │ • routes    │
                   └─────────────┘
```

### Key Design Principles
- **Dependency Injection**: Configuration and dependencies passed to modules
- **Separation of Concerns**: Each module has a single responsibility
- **Backward Compatibility**: API and test interfaces remain unchanged
- **Structured Logging**: Winston-based logging with dev/prod configurations
- **Testability**: All modules can be unit tested independently

## Setup Development Environment

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up pre-commit hooks**

   ```bash
   npm run prepare
   ```

   This installs git hooks that automatically lint and fix code before commits.

## Available Scripts

```bash
npm run dev          # Development server with .env loading
npm run dev:docker   # Docker-style development
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode 
npm run test:coverage # Run tests with coverage report
npm run testCsv      # Generate GPS test data
npm run testFuel     # Generate fuel test data
npm run lint         # Check code style
npm run lint:fix     # Fix code style issues
```

## Code Style

The project uses StandardJS for consistent code formatting.

```bash
# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

**Pre-commit hooks** automatically run `standard --fix` on staged JavaScript files to ensure consistent code style.

### Bypassing Pre-commit Hooks

In exceptional cases, skip the pre-commit hook with:

```bash
git commit --no-verify -m "emergency fix"
```

## Logging

The application uses **Winston** for structured logging with environment-specific configurations:

### Development Mode
- **Format**: Colorized console output with timestamps
- **Level**: Debug (verbose logging)
- **Output**: Human-readable format with metadata

```bash
2025-09-04T13:00:29.564Z [info] Initializing database {"dbFile":"data/gps/cartracker.db"}
2025-09-04T13:00:30.123Z [debug] Processing GPS CSV upload {"device":"development","lineCount":42}
```

### Production Mode
- **Format**: JSON structured logs
- **Level**: Info and above (warn, error)
- **Output**: Machine-readable format for log aggregation

```json
{"level":"info","message":"Database initialization completed","timestamp":"2025-09-04T13:00:29.574Z"}
```

### Configuration

Logging can be configured via environment variables or programmatically:

```javascript
// Silent logging for tests
const app = createApp({ silentLogger: true })

// Custom log level
process.env.NODE_ENV = 'production'  // Uses 'info' level
```

### Log Categories
- **Database operations**: Table initialization, query execution
- **Authentication**: User authorization, request validation
- **File processing**: GPS CSV uploads, fuel receipt OCR
- **API requests**: Endpoint calls, rate limiting
- **Error handling**: Failed operations, validation errors

## Test Data Generation

Generate test GPS tracking data for development and testing:

```bash
# Generate test CSV file locally (script located in scripts/)
npm run testCsv

# Generate test fuel data
npm run testFuel

# Advanced options for test CSV generation
node scripts/generateTestCSV.js \
  --start=2025-08-18 --weeks=1 \
  --outfile=example_drives.csv \
  --server=https://gps.example.org \
  --uploadName=example_drives.csv \
  --auth='gps-esp32:supersecret'

# Use environment variable for authentication
export BASIC_AUTH='gps-esp32:supersecret'
node scripts/generateTestCSV.js --server=https://gps.example.org

# Use npm script shortcut
npm run testCsv -- --start=2025-08-18 --weeks=2
```

## Database Schema

The application uses SQLite with two main tables:

- `car_track`: GPS tracking data
- `fuel`: Fuel consumption records

## Troubleshooting

### Common Issues

#### Device not connecting to WiFi

- Check WiFi credentials in firmware configuration
- Verify WiFi network compatibility (2.4GHz required)
- Check device logs via ESPHome

#### Data not uploading

- Verify server URL and authentication
- Check network connectivity
- Ensure proxy is configured with correct headers

#### GPS not working

- Verify GPS module connections
- Check antenna placement (needs clear sky view)
- Monitor GPS status in logs

#### SD card issues

- Verify SD card formatting (FAT32)
- Check SPI connections
- Ensure adequate power supply

### Logs

```bash
# View container logs
docker-compose logs -f cartracker

# View ESP32 logs
esphome logs firmware/firmware.yaml
```

## Contributing

We welcome contributions to the project! Please follow these steps:

1. **Fork the Repository**: Create your own fork of the repository on GitHub.

2. **Create a Branch**: Create a new branch for your feature or bug fix:

   ```bash
   git checkout -b my-feature-branch
   ```

3. **Make Changes**: Make your changes in the codebase.

4. **Test Your Changes**: Ensure that your changes work as expected and do not break existing functionality.

5. **Commit Your Changes**: Commit your changes with a descriptive commit message:

   ```bash
   git commit -m "Add my feature"
   ```

6. **Push to Your Fork**: Push your changes to your fork on GitHub:

   ```bash
   git push origin my-feature-branch
   ```

7. **Create a Pull Request**: Go to the original repository and create a pull request from your branch.

Thank you for your contributions!
