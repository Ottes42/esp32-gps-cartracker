# Rate limiting zones - add to http block in nginx.conf

http {
    # Rate limit for GPS data uploads (frequent but predictable)
    limit_req_zone $binary_remote_addr zone=gps_upload:10m rate=30r/m;

    # Rate limit for receipt uploads (less frequent larger files)
    limit_req_zone $binary_remote_addr zone=receipt_upload:10m rate=10r/m;
    
    # General API rate limiting
    limit_req_zone $binary_remote_addr zone=api_calls:10m rate=60r/m;
    
    # File size limits
    client_max_body_size 50M;  # Max request body size
    client_body_buffer_size 1M;
    client_body_timeout 30s;
    client_header_timeout 10s;
}

server {
    listen 443 ssl;
    server_name gps.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    
    # Basic Auth
    auth_basic "GPS Tracker Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    # Pass authenticated user to backend
    proxy_set_header X-Auth-User $remote_user;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # GPS data upload endpoint - higher rate limit
    location ~ ^/upload/ {
        limit_req zone=gps_upload burst=5 nodelay;
        client_max_body_size 10M;  # CSV files should be small
        proxy_pass http://cartracker:8080;
    }
    
    # Receipt upload endpoint - lower rate limit, larger files
    location /uploadReceipt {
        limit_req zone=receipt_upload burst=2 nodelay;
        client_max_body_size 50M;  # Phone photos can be large
        proxy_read_timeout 60s;    # OCR processing takes time
        proxy_pass http://cartracker:8080;
    }
    
    # API endpoints
    location /api/ {
        limit_req zone=api_calls burst=10 nodelay;
        proxy_pass http://cartracker:8080;
    }
    
    # Static files and dashboard
    location / {
        limit_req zone=api_calls burst=20 nodelay;
        proxy_pass http://cartracker:8080;
    }
}
