#!/bin/sh
# Startup script for Docker container
set -e

# Ensure data directory exists
echo "Ensuring data directory exists..."
mkdir -p /app/data

# Run database migrations
echo "Running database migrations..."
./node_modules/.bin/prisma db push || {
    echo "Failed to run database migrations"
    exit 1
}

# Start the application
echo "Starting application..."
exec node server.js
