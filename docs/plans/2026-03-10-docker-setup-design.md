# Docker Setup Design for MusicSwipe

**Date:** 2026-03-10
**Status:** Approved
**Author:** Claude + Waldo

## Overview

Redesign the Docker infrastructure for MusicSwipe to be simple, effective, and ready for deployment on ZimaOS via GitHub Container Registry.

## Goals

1. Simplify Docker setup - single-stage build, easy to understand
2. Remove Prisma migrations - use schema as single source of truth
3. Support local testing before pushing changes
4. Enable deployment via `:latest` tag on master commits
5. Multi-architecture support (amd64/arm64) for ZimaOS compatibility

## Architecture

### Stack
- Base image: `node:20-alpine`
- Build output: Next.js standalone (already configured)
- Database: SQLite file with persistent volume
- Migration strategy: `prisma db push` (no migration files)

### File Structure
```
├── Dockerfile                 # Single-stage build
├── docker-entrypoint.sh       # DB setup + startup
├── docker-compose.yml         # Single file for all environments
├── .dockerignore             # Optimized build context
├── prisma/
│   └── schema.prisma         # Single source of truth
│   └── migrations/           # DELETED - no longer needed
└── .github/workflows/
    └── docker.yml            # Build on master push
```

## Components

### 1. Dockerfile

Single-stage, streamlined build:
- Uses `node:20-alpine` base
- Installs dependencies with `npm ci`
- Generates Prisma client during build
- Runs Next.js build
- Creates non-root `nextjs` user
- Sets up `/app/data` directory for SQLite

### 2. Entrypoint Script

`docker-entrypoint.sh` handles runtime database setup:
1. Creates `/app/data` if missing
2. Regenerates Prisma client
3. Runs `prisma db push` to sync schema
4. Starts Next.js server

### 3. Docker Compose

Single `docker-compose.yml` for all environments:
- Builds from local Dockerfile or pulls from GHCR
- Persistent volume for SQLite database
- Configurable port via `${PORT:-3000}`
- Optional healthcheck for production monitoring
- Works for local development and ZimaOS deployment

### 4. GitHub Actions Workflow

`.github/workflows/docker.yml`:
- Triggers on push to `master` branch
- Builds multi-arch images (amd64/arm64)
- Pushes to `ghcr.io/waldokilian2/musicswipe:latest`
- Uses GitHub Actions cache for faster builds

### 5. Docker Ignore

Excludes unnecessary files from build context:
- `node_modules`, `.next`
- `prisma/migrations` (no longer needed)
- Development files (`.git`, README, etc.)

## Database Strategy

### Migration-Less Approach

- **Deleted:** `prisma/migrations/` folder
- **Kept:** `schema.prisma` as single source of truth
- **Runtime:** `prisma db push` creates/updates database from schema

### Benefits
- No migration history to maintain
- Schema changes apply immediately
- Perfect for single-deployment personal apps
- `db push` is safe for SQLite development

### Current Schema State
The existing `schema.prisma` already contains all changes from the two migrations:
- Initial Song model
- `dominantColor` field with default

No manual schema updates needed - just delete migrations folder.

## Testing Strategy

### Local Testing Before Push

```bash
# Build and run
docker-compose up --build

# Manual verification
# - App loads and plays music
# - Swipe/like/dislike works
# - Library persists across restarts
```

### Version Upgrade Test (Critical)

```bash
# Create v1 with data
docker-compose up --build
# Add some songs to library

# Simulate upgrade (keep volume)
docker-compose down
docker build -t musicswipe:v2 .
docker run -d --name musicswipe-v2 \
  -v music-data:/app/data \
  -p 3000:3000 \
  musicswipe:v2

# Verify all data persists
```

### Fresh Deployment Test

```bash
# Start from scratch
docker-compose down -v
docker-compose up --build

# Verify database created from schema
```

## Deployment Workflow

1. Make changes locally
2. Test thoroughly with Docker
3. Commit and push to `master`
4. GitHub Actions builds and pushes `:latest`
5. ZimaOS pulls new image
6. Existing database persists, schema syncs if needed

## Success Criteria

- [x] Single, easy-to-understand Dockerfile
- [x] No migration files - schema is the source of truth
- [x] Database persists across container restarts
- [x] Database survives version upgrades
- [x] Fresh container creates database from schema
- [x] Multi-arch images for ZimaOS compatibility
- [x] Local testing before pushing to repo
