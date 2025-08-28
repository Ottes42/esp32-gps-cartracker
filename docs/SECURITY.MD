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

The backend enforces rate limits using `express-rate-limit`:

| Endpoint                | Limit                |
|-------------------------|----------------------|
| /upload/:filename       | 30 req/min (device)  |
| /uploadReceipt          | 10 req/min (user)    |
| /retryReceipt/:id       | 10 req/min (user)    |
| /api/fuel, /api/trips   | 60 req/min (user)    |
| /api/fuel/months        | 60 req/min (user)    |
| /api/trip/:start        | 60 req/min (user)    |

If a client exceeds the limit, a `429 Too Many Requests` error is returned. Limits are per IP/user.

See also: [README.MD](../README.MD)

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
