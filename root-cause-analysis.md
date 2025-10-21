# Root Cause Analysis: Frontend Break Time Display Issue

## Problem Statement
The React frontend was showing "No employee data available" and break time displaying as "0 min" instead of actual values.

## Root Cause Analysis

### Primary Root Cause: Docker Build Configuration Issue

**The React app was built with the wrong API base URL due to environment variables not being available during the Docker build process.**

#### Technical Details

1. **Environment Variable Scope Issue**
   - `REACT_APP_API_BASE_URL=/api` was set in `docker-compose.yml`
   - But Docker multi-stage builds only make environment variables available at **runtime**, not during **build time**
   - React build process couldn't access the environment variable
   - React used the fallback value: `http://10.100.6.2:5002/v1`

2. **CORS Issue as Secondary Effect**
   - React app tried to call `http://10.100.6.2:5002/v1/api/employees/work-hours` directly
   - API server's CORS policy blocked requests from React app's origin
   - Result: No API calls made, no data displayed

3. **Symptom vs Root Cause**
   - **Symptom**: CORS errors, "No employee data available", "0 min" break time
   - **Root Cause**: React app built with wrong API URL due to Docker build configuration

## How We Fixed It

### 1. Identified the Real Issue
```bash
# Checked JavaScript bundle content
curl -s "http://localhost:3000/static/js/main.b0ea383e.js" | grep -o "http://10.100.6.2\|/api"
# Result: http://10.100.6.2 (wrong URL)
```

### 2. Updated Dockerfile for Build-Time Environment Variables
```dockerfile
# Before (WRONG)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build  # Environment variables not available here

# After (CORRECT)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

# Set environment variables for build
ARG REACT_APP_API_BASE_URL=/api
ARG REACT_APP_API_KEY=frigate-api-key-2024

RUN npm run build  # Now has access to build-time variables
```

### 3. Updated docker-compose.yml to Pass Build Arguments
```yaml
# Before (WRONG)
services:
  frigate-dashboard:
    build: .
    environment:
      - REACT_APP_API_BASE_URL=/api  # Only available at runtime

# After (CORRECT)
services:
  frigate-dashboard:
    build:
      context: .
      args:
        REACT_APP_API_BASE_URL: /api  # Available during build
        REACT_APP_API_KEY: frigate-api-key-2024
    environment:
      - REACT_APP_API_BASE_URL=/api  # Also available at runtime
```

### 4. Rebuilt Container with Correct Configuration
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 5. Verified the Fix
```bash
# Checked new JavaScript bundle
curl -s "http://localhost:3000/static/js/main.e47c174c.js" | grep -o "/api"
# Result: /api (correct URL)

# Monitored API calls
docker logs -f root-frigate-dashboard-1 | grep "api"
# Result: GET /api/employees/work-hours HTTP/1.1 200 (working!)
```

## Key Lessons Learned

### 1. Docker Multi-Stage Build Gotcha
- **Environment variables** (`ENV`) are only available at **runtime**
- **Build arguments** (`ARG`) are available during **build time**
- For React apps, you need `ARG` to pass environment variables to the build process

### 2. Debugging Strategy
1. **Check the actual JavaScript bundle** - don't assume configuration is correct
2. **Monitor network requests** - see what URLs the app is actually calling
3. **Distinguish between symptoms and root causes** - CORS was a symptom, not the cause

### 3. React Environment Variables
- React environment variables must be available during build time
- They get compiled into the JavaScript bundle
- Runtime environment variables won't affect already-built bundles

## Prevention for Future

### 1. Always Use ARG for Build-Time Variables
```dockerfile
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_API_KEY
# Use these in build process
```

### 2. Verify Build Configuration
```bash
# Check if environment variables are in the built bundle
curl -s "http://localhost:3000/static/js/main.*.js" | grep -o "your-expected-value"
```

### 3. Test API Calls Early
```bash
# Monitor Docker logs for actual API calls
docker logs -f container-name | grep "api"
```

## Final Result
- ✅ React app now uses nginx proxy (`/api`) instead of direct API calls
- ✅ No CORS issues (requests appear to come from same origin)
- ✅ Break time shows actual values (3.30 hours) instead of "0 min"
- ✅ All time fields display correctly: Total Time, Office Time, Break Time
- ✅ No "No employee data available" message

The frontend is now fully functional with correct time data display.
