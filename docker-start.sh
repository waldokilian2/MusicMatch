#!/bin/sh
# Startup script for Docker container

# Run database migrations
npx prisma db push --skip-generate

# Start the application
node server.js
