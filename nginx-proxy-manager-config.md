# Nginx Proxy Manager Configuration Guide

## Overview
You need to create ONE Proxy Host in Nginx Proxy Manager that handles:
1. Frontend React app (root `/`)
2. API backend at `/api` → `http://10.0.20.8:5002/v1/api/`
3. Media server at `/media` → `http://10.0.20.6:5000/`

---

## Step 1: Create Main Proxy Host

### Proxy Host Settings Tab:
- **Domain Names**: `your-domain.com` (your public domain)
- **Scheme**: `https` (enable SSL)
- **Forward Hostname/IP**: `your-frontend-server-ip` (or container name if Docker)
- **Forward Port**: `80` (or `3000` if Node.js dev server)
- **Cache Assets**: ✅ Enabled (optional)
- **Block Common Exploits**: ✅ Enabled
- **Websockets Support**: ✅ Enabled
- **Access List**: (configure as needed)

### SSL Tab:
- **SSL Certificate**: Request a new certificate with Let's Encrypt
- **Force SSL**: ✅ Enabled
- **HTTP/2 Support**: ✅ Enabled
- **HSTS Enabled**: ✅ Enabled

---

## Step 2: Add Custom Locations (Advanced Tab)

In the **Advanced** tab, paste the following configuration:

```nginx
# Frontend React App - Serve from root
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

# API Backend Proxy
location /api/ {
    proxy_pass http://10.0.20.8:5002/v1/api/;
    proxy_http_version 1.1;
    
    # Standard proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # Buffer settings
    proxy_buffering off;
    proxy_request_buffering off;
    
    # CORS headers for API (if needed)
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    
    # Handle OPTIONS preflight
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
        add_header Access-Control-Max-Age "3600";
        add_header Content-Type "text/plain";
        add_header Content-Length "0";
        return 204;
    }
}

# Media Server Proxy (Videos, Thumbnails, Snapshots)
location /media/ {
    proxy_pass http://10.0.20.6:5000/;
    proxy_http_version 1.1;
    
    # Standard proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    
    # CRITICAL: Video streaming support (Range requests)
    proxy_set_header Range $http_range;
    proxy_set_header If-Range $http_if_range;
    
    # Timeouts for long video streams
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    
    # Disable buffering for progressive video playback
    proxy_buffering off;
    proxy_request_buffering off;
    
    # CORS headers for media (required for video playback from browser)
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Range, If-Range, Origin, Content-Type, Accept, Authorization" always;
    add_header Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges" always;
    
    # Expose Range support
    add_header Accept-Ranges "bytes" always;
    
    # Handle OPTIONS preflight for media
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
        add_header Access-Control-Allow-Headers "Range, If-Range, Origin, Content-Type, Accept, Authorization";
        add_header Access-Control-Max-Age "3600";
        add_header Content-Type "text/plain";
        add_header Content-Length "0";
        return 204;
    }
    
    # Cache media files (optional - adjust as needed)
    # proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=media_cache:10m max_size=1g inactive=60m;
    # proxy_cache media_cache;
    # proxy_cache_valid 200 302 10m;
    # proxy_cache_valid 404 1m;
}

# Health check endpoint (optional)
location /health {
    proxy_pass http://10.0.20.8:5002/v1/health;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    access_log off;
}
```

---

## Alternative: Separate Proxy Hosts (Optional)

If you prefer separate proxy hosts for better isolation:

### Proxy Host 1: Frontend
- **Domain**: `dashboard.yourdomain.com`
- **Forward**: Your React app server
- **Advanced**: Only the `/` location block

### Proxy Host 2: API
- **Domain**: `api.yourdomain.com` (or use sub-path: `dashboard.yourdomain.com/api`)
- **Forward**: `http://10.0.20.8:5002/v1/api/`
- **Advanced**: Only the `/api/` location block

### Proxy Host 3: Media
- **Domain**: `media.yourdomain.com` (or use sub-path: `dashboard.yourdomain.com/media`)
- **Forward**: `http://10.0.20.6:5000/`
- **Advanced**: Only the `/media/` location block with Range/CORS support

---

## Verification Steps

After configuration:

1. **Test API**:
   ```bash
   curl https://your-domain.com/api/employees/work-hours
   ```

2. **Test Media**:
   ```bash
   curl -I https://your-domain.com/media/api/events/...
   ```
   Should return `206 Partial Content` or `200 OK` with `Accept-Ranges: bytes`

3. **Test Video Playback**:
   - Open browser DevTools → Network tab
   - Navigate to violation with video
   - Check video request URL starts with `https://your-domain.com/media/`
   - Verify no `10.0.20.x` addresses in network requests
   - Video should play with seek/scrubbing support

---

## Troubleshooting

### Videos don't play:
- Check browser console for CORS errors
- Verify `Range` header is being sent (Network tab → Request Headers)
- Ensure `/media/` location has `proxy_buffering off`

### API calls fail:
- Check if `/api/` proxy_pass has trailing slash matching upstream
- Verify backend is accessible from NPM server
- Check NPM logs: `docker logs npm`

### 502 Bad Gateway:
- Verify internal IPs (`10.0.20.8`, `10.0.20.6`) are accessible from NPM server
- Check firewall rules allow NPM → backend connection
- Verify ports (5002, 5000) are correct

---

## Notes

- Replace `your-domain.com` with your actual domain
- Adjust internal IPs (`10.0.20.8`, `10.0.20.6`) if different
- If using Docker, use container names instead of IPs if on same network
- For production, consider restricting CORS `Access-Control-Allow-Origin` to your domain instead of `*`

