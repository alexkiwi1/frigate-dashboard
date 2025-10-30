# Debug Video Playback Issues

## Step 1: Check Browser Console

1. Open your dashboard in browser
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Look for log messages showing URL transformations:
   - `Transformed URL: http://10.0.20.x:5000/... → /media/...`
   - `URL already relative: /media/...`
   - `URL not transformed: ...` (this indicates a problem)

5. Go to **Network** tab:
   - Filter by "Media" or "Fetch/XHR"
   - Click on a video request
   - Check the **Request URL** - should start with `https://your-domain.com/media/`
   - If it shows `http://10.0.20.x:5000/...` - the transform didn't work

## Step 2: Check What URLs Are Being Returned

1. In browser console, type:
   ```javascript
   // Check if API responses contain transformed URLs
   console.log('Check API response structure');
   ```

2. Navigate to a violation that should have a video
3. In Network tab, find the API call (usually `/api/violations/...`)
4. Click on it → Response tab
5. Look for `video_url` or `media.video_url` fields
6. Check if they still contain `10.0.20.x` or are already `/media/...`

## Step 3: Test Direct Video Access

1. Copy a video URL from the console/logs
2. Replace any `10.0.20.x:5000` with `/media/`
3. Test in browser: `https://your-domain.com/media/...`
4. Should return video (206 Partial Content or 200 OK)

## Step 4: Check NPM Media Location

Verify your NPM custom location `/media/`:

1. Go to NPM → Your Proxy Host → Custom Locations
2. Check `/media/` location:
   - Forward Hostname/IP: `10.0.20.6`
   - Forward Port: `5000`
   - Advanced config has `proxy_set_header Range $http_range;`

3. Test from server:
   ```bash
   curl -I http://10.0.20.6:5000/api/events/YOUR_EVENT_ID/video.mp4
   ```
   Should return 200 or 206 with video content

## Step 5: Common Issues

### Issue: Video URL still shows `10.0.20.x`
**Solution:** The transform function isn't matching. Check:
- Browser console for "URL not transformed" messages
- API response structure - might have nested URL format
- Rebuild React app: `npm run build`

### Issue: Video URL is `/media/...` but still doesn't play
**Possible causes:**
1. NPM media location not configured correctly
2. CORS errors (check browser console)
3. Range requests not working (check Network tab → video request → Request Headers should have `Range: bytes=0-`)

### Issue: 404 on `/media/...` path
**Solution:** 
1. Check NPM custom location path is `/media/` (with trailing slash in NPM config)
2. Verify `proxy_pass http://10.0.20.6:5000/;` (trailing slash important!)
3. Test direct: `curl http://10.0.20.6:5000/api/events/...`

### Issue: CORS errors in console
**Solution:** Make sure NPM `/media/` location Advanced config includes:
```nginx
add_header Access-Control-Allow-Origin "*" always;
add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
add_header Access-Control-Allow-Headers "Range, If-Range, Origin, Content-Type, Accept" always;
```

## Step 6: Rebuild and Test

After fixing code:

1. Rebuild React app:
   ```bash
   npm run build
   ```

2. Restart container:
   ```bash
   docker restart root_frigate-dashboard_1
   ```

3. Clear browser cache (Ctrl+Shift+Delete) or hard refresh (Ctrl+F5)

4. Test video playback again

## Quick Test Script

Run this in browser console to check URL transformation:

```javascript
// Test transform function
const testUrls = [
  'http://10.0.20.6:5000/api/events/123/video.mp4',
  'http://10.0.20.8:5001/api/events/123/video.mp4',
  '/media/api/events/123/video.mp4',
  'https://external.com/video.mp4'
];

testUrls.forEach(url => {
  console.log(`Original: ${url}`);
  // The transform should happen automatically in API responses
});
```

