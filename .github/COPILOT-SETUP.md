# GitHub Copilot Setup for GPS Car Tracker

This guide helps team members optimize GitHub Copilot for the GPS Car Tracker project.

## Quick Setup

### 1. Enable Copilot in VS Code
```bash
# Install VS Code extension
code --install-extension GitHub.copilot
code --install-extension GitHub.copilot-chat

# Or via Extensions panel: Search "GitHub Copilot"
```

### 2. Project Configuration
```bash
# Clone and setup
git clone https://github.com/Ottes42/esp32-gps-cartracker.git
cd esp32-gps-cartracker

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys
```

### 3. VS Code Workspace Settings
Create `.vscode/settings.json` in your local copy (already in .gitignore):
```json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": true,
    "markdown": true,
    "javascript": true,
    "dockerfile": true
  },
  "github.copilot.advanced": {
    "secret_key": "default",
    "length": 500,
    "temperature": 0.1,
    "top_p": 1,
    "stop": ["\n\n", "\n\r\n", "\r\n\r\n"]
  }
}
```

## Copilot Optimization by File Type

### JavaScript/Node.js (`*.js`)
- **Context**: Express.js API endpoints, SQLite operations, authentication
- **Best practices**: Use JSDoc comments, follow StandardJS style
- **Common patterns**:
  ```javascript
  // User isolation pattern - Copilot will suggest variations
  const stmt = db.prepare('SELECT * FROM table WHERE user = ?')
  const results = stmt.all(req.authUser)
  
  // Error handling with graceful fallback
  try {
    const parsed = await parseReceipt(imageBuffer)
  } catch (e) {
    console.error('OCR parsing failed:', e.message)
  }
  ```

### ESPHome YAML (`firmware/*.yaml`)
- **Context**: ESP32 configuration, sensors, WiFi, SD card
- **Templates**: Use `firmware.yaml` as base template
- **Common components**:
  ```yaml
  # GPS module - Copilot knows common pins
  uart:
    id: gps_uart
    tx_pin: GPIO17
    rx_pin: GPIO16
    baud_rate: 9600
  
  # SD card with SDMMC
  esp32_sdmmc:
    clk_pin: GPIO14
    cmd_pin: GPIO15
    d0_pin: GPIO2
  ```

### Frontend (`public/*.html`, `public/*.js`)
- **Context**: Vanilla JavaScript, OpenLayers maps, Bootstrap UI
- **Patterns**: DOM manipulation, API calls with authentication
- **Map integration**:
  ```javascript
  // Copilot suggests OpenLayers patterns
  const map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      })
    ]
  });
  ```

### Tests (`__tests__/*.js`)
- **Context**: Jest testing, SQLite in-memory, API mocking
- **Structure**: Unit tests for core functions, integration for endpoints
- **Mocking patterns**:
  ```javascript
  // Copilot suggests proper Jest mocking
  jest.mock('googleapis', () => ({
    google: {
      generativeai: jest.fn()
    }
  }))
  ```

## Prompt Engineering Tips

### 1. Context-Rich Comments
Good prompts for Copilot:
```javascript
// Create API endpoint to upload GPS CSV file from ESP32
// Must validate user authentication via X-Auth-User header
// Parse CSV with columns: timestamp, lat, lng, speed, heading
// Store in trips table with user isolation
```

### 2. Function Signatures
```javascript
/**
 * Geocode address using OpenStreetMap Nominatim API with local caching
 * @param {string} address - Address to geocode
 * @param {string} cacheFile - Path to geocache.json
 * @returns {Promise<{lat: number, lng: number}>}
 */
async function geocodeAddress(address, cacheFile) {
```

### 3. ESPHome Components
```yaml
# Temperature sensor with DHT22
# Pin: GPIO4, update every 30 seconds
# Enable on-device display of readings
sensor:
  - platform: dht
```

## Project-Specific Copilot Commands

### Chat Commands
Use Copilot Chat with these project-specific prompts:

- **`@workspace /explain`** - Understand data flow from ESP32 to dashboard
- **`@workspace /fix`** - Fix failing tests (expect 61/67 to pass)
- **`@workspace /tests`** - Generate tests for new API endpoints
- **`@workspace /doc`** - Update API documentation

### Code Generation
- **ESPHome configs**: "Generate ESPHome config for ESP32-S3 with GPS and SD card"
- **API endpoints**: "Create Express endpoint for fuel receipt upload with OCR"
- **Frontend features**: "Add map filtering by date range with OpenLayers"
- **Test cases**: "Create integration tests for user authentication"

## Copilot Best Practices

### 1. Repository Context
- Keep comprehensive `.github/copilot-instructions.md` up to date
- Use descriptive commit messages for Copilot learning
- Reference issue numbers in code comments

### 2. Code Quality
- Let Copilot suggest StandardJS compliance fixes
- Use Copilot for JSDoc generation and updates
- Generate comprehensive error handling patterns

### 3. Testing Strategy  
- Generate test data with Copilot assistance
- Use Copilot for mock API responses
- Let Copilot suggest edge cases in tests

### 4. Documentation
- Generate API documentation from code
- Create hardware wiring diagrams documentation
- Update README sections with Copilot help

## Common Copilot Workflows

### Adding New Hardware Support
1. **Chat**: "@workspace I need to add support for ESP32-C6 board"
2. **Generate**: ESPHome board configuration
3. **Update**: Build scripts and documentation
4. **Test**: Firmware validation workflow

### API Development
1. **Comment**: Describe endpoint functionality and security requirements
2. **Generate**: Express route with authentication middleware
3. **Add**: Database queries with user isolation
4. **Create**: Integration tests with proper mocking

### Frontend Features
1. **Describe**: User interaction and data visualization needs
2. **Generate**: HTML structure and JavaScript functionality
3. **Integrate**: OpenLayers map components
4. **Style**: Bootstrap-based responsive design

## Troubleshooting Copilot

### Common Issues
- **Slow suggestions**: Increase VS Code memory limit
- **Irrelevant code**: Add more specific comments and context
- **Wrong patterns**: Reference existing code patterns in comments

### Performance Optimization
```json
{
  "github.copilot.editor.enableAutoCompletions": true,
  "github.copilot.editor.enableCodeLens": false,
  "github.copilot.advanced.listCount": 3
}
```

### Quality Control
- Always run `npm test && npm run lint` after Copilot generations
- Validate ESPHome configs with `./scripts/build-firmware.sh validate`
- Test API endpoints with curl or Postman
- Verify frontend functionality in multiple browsers

## Team Collaboration

### Shared Patterns
- Document common Copilot-generated patterns in team wiki
- Share effective prompts in code review comments
- Create snippet libraries for repetitive code

### Code Review Focus
- Verify Copilot suggestions meet security requirements
- Ensure generated tests have proper coverage
- Check that generated documentation is accurate

### Knowledge Sharing
- Regular team demos of effective Copilot workflows
- Share Copilot Chat conversations for complex problems
- Document successful prompt patterns for future use

---

*This setup guide is living documentation. Update it as the project evolves and new Copilot features become available.*