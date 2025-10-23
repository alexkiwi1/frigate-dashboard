#!/bin/bash

# Frigate Dashboard Build Script

echo "🚀 Building Frigate Employee Dashboard..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t frigate-dashboard .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
else
    echo "❌ Docker build failed!"
    exit 1
fi

# Create network if it doesn't exist
echo "🌐 Creating Docker network..."
docker network create frigate-network 2>/dev/null || echo "Network already exists"

# Run the container
echo "🚀 Starting dashboard container..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ Dashboard started successfully!"
    echo ""
    echo "🌐 Dashboard URL: http://localhost:3000"
    echo "📊 API Base URL: http://10.0.20.8:5002/v1"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop: docker-compose down"
    echo "  Restart: docker-compose restart"
    echo ""
else
    echo "❌ Failed to start dashboard!"
    exit 1
fi
