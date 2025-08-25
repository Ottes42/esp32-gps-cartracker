# ESP32 Web Interface & Configuration

The GPS Car Tracker firmware provides a built-in web interface for runtime configuration and monitoring, accessible via WiFi connection or captive portal.

## Access Methods

### 1. WiFi Station Mode

When connected to your home WiFi network:

- Access via device IP address: `http://192.168.x.x` (check your router's DHCP table)
- Default credentials: `admin` / `admin`

### 2. Captive Portal (Setup Mode)

When WiFi credentials are not configured or connection fails:

- Device creates AP: `gps-cartracker-setup`
- Password: `setup-setup`
- Connect to this network, captive portal should auto-open
- Or navigate to: `http://192.168.4.1`

## Web Interface Features

### Configuration Pages

#### Server Configuration

Update upload server settings without reflashing firmware:

```http
GET /sensor/server_url_display
POST /button/update_server_url/press?new_url=https://gps.yourdomain.com/upload/

GET /sensor/auth_user_display  
POST /button/update_auth_credentials/press?new_user=tracker&new_pass=secret123
```

#### Real-time Monitoring

View live sensor data and GPS status:

- GPS coordinates (latitude, longitude, altitude)
- Speed (km/h)
- GPS satellite count and HDOP
- Temperature and humidity
- ACC power status
- WiFi connection status

#### System Controls

- Manual log sync trigger
- Deep sleep control
- System restart
- Configuration persistence

### API Endpoints

#### Configuration Updates

```bash
# Update server URL
curl -X POST "http://192.168.4.1/button/update_server_url/press" \
  -d "new_url=https://gps.example.com/upload/"

# Update authentication
curl -X POST "http://192.168.4.1/button/update_auth_credentials/press" \
  -d "new_user=myuser&new_pass=mypass"
```

#### Sensor Data (JSON)

```bash
# Get current GPS location
curl http://192.168.4.1/sensor/gps_latitude
curl http://192.168.4.1/sensor/gps_longitude

# Get system status
curl http://192.168.4.1/sensor/speed_kmh
curl http://192.168.4.1/binary_sensor/acc_present
```

## Configuration Management

### Runtime vs Persistent Settings

**Runtime Configuration** (reset on restart):

- Server URL: `${UPLOAD_TARGET}` → configurable via web
- Basic Auth: `${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}` → configurable via web
- Changes take effect immediately
- Stored in ESP32 RAM (globals)

**Persistent Configuration** (survives restart):

- WiFi credentials: Set in `secrets.yaml`
- GPIO pin assignments: Set in `substitutions`
- Hardware settings: Requires firmware reflash

### Initial Setup Workflow

1. **First Boot**: Device creates AP `gps-cartracker-setup`
2. **Connect**: Join AP with password `setup-setup`
3. **Configure**: Access `http://192.168.4.1` to set:
   - Server URL (your backend endpoint)
   - Basic Auth credentials
4. **WiFi Setup**: Update `secrets.yaml` with your WiFi credentials
5. **Deploy**: Reflash firmware with your WiFi settings
6. **Production**: Device connects to your network automatically

### Configuration Scripts

The firmware includes helper scripts for configuration updates:

#### Update Server URL

```yaml
script:
  - id: update_server_url
    parameters:
      new_url: string
    then:
      - lambda: 'id(server_url) = new_url;'
      - logger.log: 
          format: "Server URL updated to: %s"
          args: ['new_url.c_str()']
```

#### Update Authentication

```yaml
script:
  - id: update_auth_credentials
    parameters:
      new_user: string
      new_pass: string
    then:
      - lambda: |-
          id(basic_auth_user) = new_user;
          id(basic_auth_pass) = new_pass;
      - logger.log: 
          format: "Auth credentials updated for user: %s"
          args: ['new_user.c_str()']
```

## Security Considerations

### Default Credentials

- **Web Interface**: `admin` / `admin` (change in production)
- **Setup AP**: `setup-setup` (temporary, for initial config only)

### Access Control

- Web interface is only accessible when device is on your network
- Captive portal is only active during initial setup or connection issues
- Basic Auth headers are base64 encoded (implement HTTPS on backend)

### Network Security

- Device connects to your secured WiFi network
- Upload traffic can be secured with HTTPS endpoints
- Consider VPN or firewall rules for backend access

## Troubleshooting

### Cannot Access Web Interface

1. Check if device is connected to your WiFi:
   - Look for `gps-cartracker` in router's device list
   - Check serial logs for connection status
2. If not connected, device should create AP automatically
3. Connect to `gps-cartracker-setup` and reconfigure

### Configuration Not Saving

- Runtime config (server/auth) resets on reboot - this is by design
- For persistent changes, update `secrets.yaml` and reflash
- Use the web interface for temporary testing only

### Upload Failures

1. Check server URL format: `https://domain.com/upload/` (trailing slash)
2. Verify Basic Auth credentials match backend expectations
3. Check backend logs for HTTP response codes
4. Test upload manually with curl:

```bash
curl -X POST "https://gps.yourdomain.com/upload/test.csv" \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
  -H "Content-Type: text/csv" \
  -d "timestamp,lat,lon,alt,speed_kmh,hdop,satellites,course,temp_c,hum_pct
2024-01-15T10:30:00Z,50.123456,8.654321,150.0,65.0,1.2,8,90.5,22.5,45.0"
```

## Development & Debugging

### Local Development

```bash
# Compile with local ESPHome
docker run --rm -v "${PWD}":/config -v "${PWD}/firmware":/config/esphome \
  esphome/esphome:2025.8 compile firmware/firmware.yaml

# Upload via serial
docker run --rm -v "${PWD}":/config -v "${PWD}/firmware":/config/esphome \
  --device=/dev/ttyUSB0 esphome/esphome:2025.8 upload firmware/firmware.yaml

# Monitor logs
docker run --rm -v "${PWD}":/config -v "${PWD}/firmware":/config/esphome \
  --device=/dev/ttyUSB0 esphome/esphome:2025.8 logs firmware/firmware.yaml
```

### Web Interface Customization

- ESPHome web server provides basic HTML interface
- For advanced UI, consider custom components or external web app
- API endpoints allow integration with mobile apps or dashboards

### Configuration Validation

Monitor serial logs for configuration changes:

```bash
[10:30:15][I][script:025]: Server URL updated to: https://gps.example.com/upload/
[10:30:20][I][script:031]: Auth credentials updated for user: myuser
[10:30:25][I][sync_logs:045]: Upload von SD-Karte durchgeführt.
```
