# Security Model

## Authentication Modes

### Development (localhost only)

- Direct API access with `X-Auth-User: development` header
- Automatic rejection of development auth from remote sources
- Visual "DEV MODE" indicator in web interface

### Production (via proxy)

- HTTP Basic Auth enforced by Nginx Proxy Manager
- Proxy injects `X-Auth-User` header with authenticated username
- Rate limiting and file size controls applied
- SSL/TLS encryption required

## Production Deployment Security

### Reverse Proxy Setup

For production deployment, you'll need a reverse proxy with HTTP Basic Authentication.

**📋 Complete setup instructions**:

- **[Nginx Configuration Guide](NGINX.MD)** - Complete setup instructions for reverse proxy
- **[Nginx Proxy Manager Setup](NGINX-PRROXY-MANAGER.MD)** - Step-by-step NPM configuration

### Security Requirements

1. **HTTP Basic Authentication**: Required for all endpoints
2. **SSL/TLS Encryption**: HTTPS enforced in production
3. **Rate Limiting**: Prevents abuse and DoS attacks
4. **File Size Limits**: Prevents storage abuse
5. **IP-based Restrictions**: Optional, can restrict to known networks

### Rate Limiting Configuration

Different endpoints have different rate limits:

- **GPS Upload**: 30 requests/minute (ESP32 uploads every 1-2 minutes)
- **Receipt Upload**: 10 requests/minute (manual user uploads)
- **API Calls**: 60 requests/minute (dashboard queries)
- **Burst**: Allows temporary spikes above the rate limit

### File Size Limits

- **GPS CSV uploads**: 10MB (large trip files)
- **Receipt photos**: 50MB (modern phone cameras: 12-48MP photos)
- **General requests**: 1MB (API calls, small data)

## Authentication Headers

### Development Environment

```bash
# Development header (localhost only)
X-Auth-User: development
```

### Production Environment

```bash
# Proxy-injected header after Basic Auth verification
X-Auth-User: <authenticated-username>
```

## Security Best Practices

1. **Use strong passwords** for HTTP Basic Auth
2. **Regular credential rotation** for device authentication
3. **Monitor access logs** for suspicious activity
4. **Keep SSL certificates updated**
5. **Regular security updates** for all components
6. **Network segmentation** where possible
