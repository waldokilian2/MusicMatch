#!/bin/sh
# Startup script for Docker container
set -e

# Run database migrations
echo "Running database migrations..."
npx prisma db push || {
    echo "Failed to run database migrations"
    exit 1
}

# Start the application
echo "Starting application..."
exec node server.js
