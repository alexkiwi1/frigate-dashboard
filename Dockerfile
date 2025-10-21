# Multi-stage build for React app
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Set environment variables for build
ARG REACT_APP_API_BASE_URL=/api
ARG REACT_APP_API_KEY=frigate-api-key-2024

# Build the app
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy only the essential built app files to nginx
# This ensures only index.html and associated assets are served
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration with API proxy
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
