#!/bin/bash

# Frigate Dashboard Deployment Script

echo "🚀 Deploying Frigate Employee Dashboard..."

# Stop existing container if running
echo "📦 Stopping existing container..."
docker stop frigate-dashboard 2>/dev/null || echo "No existing container to stop"
docker rm frigate-dashboard 2>/dev/null || echo "No existing container to remove"

# Build the image
echo "🔨 Building Docker image..."
docker build -t frigate-dashboard .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
else
    echo "❌ Docker build failed!"
    exit 1
fi

# Run the container
echo "🚀 Starting dashboard container..."
docker run -d \
    --name frigate-dashboard \
    -p 3000:80 \
    --restart unless-stopped \
    frigate-dashboard

if [ $? -eq 0 ]; then
    echo "✅ Dashboard deployed successfully!"
    echo ""
    echo "🌐 Dashboard URL: http://localhost:3000"
    echo "📊 API Base URL: http://10.100.6.2:5002/v1"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: docker logs frigate-dashboard"
    echo "  Stop: docker stop frigate-dashboard"
    echo "  Restart: docker restart frigate-dashboard"
    echo "  Remove: docker rm frigate-dashboard"
    echo ""
    echo "🔍 Container status:"
    docker ps --filter name=frigate-dashboard
else
    echo "❌ Failed to start dashboard!"
    exit 1
fi
