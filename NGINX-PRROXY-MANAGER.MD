# Nginx Proxy Manager Configuration

## Basic Proxy Host Setup

1. **Create new Proxy Host**:
   - Domain: `gps.yourdomain.com`
   - Scheme: `http`
   - Forward Hostname: `cartracker`
   - Forward Port: `8080`

2. **SSL Certificate**:
   - Enable "Force SSL"
   - Use Let's Encrypt or upload custom certificate
   - Enable "HTTP/2 Support"

3. **Access List** (Basic Auth):
   - Create new Access List with your device credentials
   - Username must match ESP32 device name (e.g., `gps-cartracker-a1b2c3`)

## Advanced Configuration

### Custom Nginx Configuration

Add to the "Advanced" tab of your proxy host:

```nginx
# Rate Limiting
limit_req_zone $binary_remote_addr zone=gps_upload:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=receipt_upload:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_calls:10m rate=60r/m;

# File size limits for different endpoints
location ~ ^/upload/ {
    limit_req zone=gps_upload burst=5 nodelay;
    client_max_body_size 10M;  # CSV files
    proxy_set_header X-Auth-User $remote_user;
    proxy_pass http://cartracker:8080;
}

location /uploadReceipt {
    limit_req zone=receipt_upload burst=2 nodelay;
    client_max_body_size 50M;  # Phone camera photos
    proxy_read_timeout 60s;    # OCR processing time
    proxy_set_header X-Auth-User $remote_user;
    proxy_pass http://cartracker:8080;
}

location /api/ {
    limit_req zone=api_calls burst=10 nodelay;
    proxy_set_header X-Auth-User $remote_user;
    proxy_pass http://cartracker:8080;
}

# Default for dashboard and static files
location / {
    limit_req zone=api_calls burst=20 nodelay;
    proxy_set_header X-Auth-User $remote_user;
    proxy_pass http://cartracker:8080;
}
```

### Rate Limiting Explained

- **GPS Upload**: 30 requests/minute (ESP32 uploads every 1-2 minutes)
- **Receipt Upload**: 10 requests/minute (manual user uploads)
- **API Calls**: 60 requests/minute (dashboard queries)
- **Burst**: Allows temporary spikes above the rate limit

### File Size Limits

- **GPS CSV uploads**: 10MB (large trip files)
- **Receipt photos**: 50MB (modern phone cameras: 12-48MP photos)
- **General requests**: 1MB (API calls, small data)

## Troubleshooting Rate Limits

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