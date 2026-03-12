# Docker Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign Docker infrastructure for MusicSwipe to be simple, effective, and ready for deployment on ZimaOS via GitHub Container Registry.

**Architecture:** Single-stage Docker build with node:20-alpine, migration-less Prisma setup using `db push`, persistent SQLite volume, multi-arch images for ZimaOS compatibility.

**Tech Stack:** Docker, Docker Compose, GitHub Actions, Next.js standalone output, Prisma with SQLite, Alpine Linux

---

## Task 1: Clean Up Existing Docker Files

**Files:**
- Delete: `Dockerfile`
- Delete: `docker-start.sh`
- Delete: `docker-compose.yml`
- Delete: `docker-compose.local.yml`
- Delete: `.github/workflows/docker-release.yml`

**Step 1: Delete old Docker files**

```bash
cd /c/Users/Waldo/Downloads/MusicSwipe
rm -f Dockerfile docker-start.sh docker-compose.yml docker-compose.local.yml
rm -f .github/workflows/docker-release.yml
```

**Step 2: Verify deletions**

Run: `git status`
Expected: Shows deletions for all 5 files

**Step 3: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove old Docker setup in preparation for redesign"
```

---

## Task 2: Delete Prisma Migrations Folder

**Files:**
- Delete: `prisma/migrations/` (entire folder)

**Step 1: Delete migrations folder**

```bash
rm -rf prisma/migrations
```

**Step 2: Verify schema.prisma is complete**

Run: `cat prisma/schema.prisma`
Expected: Shows complete schema with Song model including dominantColor field

**Step 3: Commit migration removal**

```bash
git add prisma/
git commit -m "chore: remove Prisma migrations, using schema as source of truth"
```

---

## Task 3: Create New Dockerfile

**Files:**
- Create: `Dockerfile`

**Step 1: Create Dockerfile**

```bash
cat > Dockerfile << 'EOF'
# Single-stage build for MusicSwipe
FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules (sharp)
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy project files
COPY . .

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Setup directories
RUN mkdir -p /app/data && \
    chown -R nextjs:nodejs /app /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
EOF
```

**Step 2: Verify Dockerfile syntax**

Run: `docker build --check -f Dockerfile .`
Expected: No syntax errors (may warn about missing entrypoint, that's OK)

**Step 3: Commit Dockerfile**

```bash
git add Dockerfile
git commit -m "feat: add simplified single-stage Dockerfile"
```

---

## Task 4: Create Entrypoint Script

**Files:**
- Create: `docker-entrypoint.sh`

**Step 1: Create entrypoint script**

```bash
cat > docker-entrypoint.sh << 'EOF'
#!/bin/sh
set -e

echo "🎵 MusicSwipe Container Starting..."

# Ensure data directory exists
mkdir -p /app/data

# Generate Prisma client (in case of version changes)
echo "→ Generating Prisma client..."
npx prisma generate

# Apply database schema directly (no migrations)
echo "→ Syncing database schema..."
npx prisma db push --skip-generate

echo "✅ Database ready!"
echo "🚀 Starting Next.js server..."

exec node server.js
EOF
```

**Step 2: Make script executable**

```bash
chmod +x docker-entrypoint.sh
```

**Step 3: Verify script permissions**

Run: `ls -la docker-entrypoint.sh`
Expected: Shows `-rwxr-xr-x` (executable)

**Step 4: Commit entrypoint**

```bash
git add docker-entrypoint.sh
git commit -m "feat: add docker entrypoint with db push migration"
```

---

## Task 5: Create Docker Compose File

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create docker-compose.yml**

```bash
cat > docker-compose.yml << 'EOF'
services:
  musicswipe:
    build:
      context: .
      dockerfile: Dockerfile
    image: musicswipe:latest
    container_name: musicswipe
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/music.db
    volumes:
      - music-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  music-data:
    driver: local
EOF
```

**Step 2: Validate compose syntax**

Run: `docker-compose config`
Expected: No errors, outputs valid YAML

**Step 3: Commit compose file**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose for local and production use"
```

---

## Task 6: Update Docker Ignore

**Files:**
- Modify: `.dockerignore`

**Step 1: Replace .dockerignore content**

```bash
cat > .dockerignore << 'EOF'
# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next
out

# Prisma - we only need schema.prisma
prisma/migrations
prisma/db

# Environment
.env.local
.env.*.local

# Development
.git
.gitignore
README.md
*.md

# Testing
test
*.test.js
*.test.ts

# IDE
.vscode
.idea

# OS
.DS_Store
Thumbs.db
EOF
```

**Step 2: Verify .dockerignore**

Run: `cat .dockerignore`
Expected: Shows all exclusion patterns above

**Step 3: Commit dockerignore**

```bash
git add .dockerignore
git commit -m "chore: update dockerignore to exclude migrations folder"
```

---

## Task 7: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/docker.yml`

**Step 1: Create workflow file**

```bash
mkdir -p .github/workflows
cat > .github/workflows/docker.yml << 'EOF'
name: Docker Build

on:
  push:
    branches:
      - master

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/waldokilian2/musicswipe:latest
          platforms: linux/amd64,linux/arm64
          cache-from: type=gha
          cache-to: type=gha,mode=max
EOF
```

**Step 2: Validate workflow syntax**

Run: `cat .github/workflows/docker.yml`
Expected: Shows complete workflow YAML

**Step 3: Commit workflow**

```bash
git add .github/workflows/docker.yml
git commit -m "feat: add GitHub Actions workflow for Docker builds"
```

---

## Task 8: Local Build Test

**Step 1: Build the Docker image**

```bash
docker-compose build
```

Expected: Build completes successfully with no errors

**Step 2: Start the container**

```bash
docker-compose up
```

Expected: Container starts, shows logs:
```
🎵 MusicSwipe Container Starting...
→ Generating Prisma client...
→ Syncing database schema...
✅ Database ready!
🚀 Starting Next.js server...
```

**Step 3: Manual verification test**

Open browser: `http://localhost:3000`

**Verify:**
- [ ] App loads without errors
- [ ] Songs appear in discover tab
- [ ] Can play music preview
- [ ] Swipe right - song liked
- [ ] Swipe left - dislike recorded
- [ ] Library tab shows liked songs
- [ ] Database persists after restart

**Step 4: Stop container**

```bash
docker-compose down
```

---

## Task 9: Database Persistence Test

**Step 1: Restart container (test persistence)**

```bash
docker-compose up
```

Expected: Container starts, previous data intact

**Step 2: Manual verification**

**Verify:**
- [ ] Library still shows previously liked songs
- [ ] All data persisted across restart

**Step 3: Stop container**

```bash
docker-compose down
```

---

## Task 10: Version Upgrade Test (Critical)

**Step 1: Build a new version**

```bash
docker build -t musicswipe:v2 .
```

**Step 2: Run with existing volume**

```bash
docker run -d --name musicswipe-v2 \
  -v music-data:/app/data \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/data/music.db \
  musicswipe:v2
```

**Step 3: Manual verification**

**Verify:**
- [ ] All previous data is intact
- [ ] App functions normally
- [ ] Database schema synced correctly

**Step 4: Cleanup**

```bash
docker stop musicswipe-v2
docker rm musicswipe-v2
```

**Step 5: Commit successful test**

```bash
git add -A
git commit -m "test: local Docker testing complete - all tests passing"
```

---

## Task 11: Fresh Deployment Test

**Step 1: Remove all volumes (simulate new deployment)**

```bash
docker-compose down -v
```

**Step 2: Start fresh container**

```bash
docker-compose up
```

Expected: Database created from schema, app starts successfully

**Step 3: Manual verification**

**Verify:**
- [ ] Database file created at `/app/data/music.db`
- [ ] App loads without errors
- [ ] Can discover, like, and dislike songs
- [ ] Library functions correctly

**Step 4: Stop container**

```bash
docker-compose down
```

---

## Task 12: Final Review and Commit

**Step 1: Review all changes**

```bash
git log --oneline -10
git status
```

**Step 2: Final commit summary**

```bash
git add -A
git commit -m "feat: complete Docker redesign

- Single-stage Docker build with node:20-alpine
- Migration-less Prisma setup using db push
- Persistent SQLite volume for data
- Multi-arch GitHub Actions workflow (amd64/arm64)
- Comprehensive local testing completed

All tests passing:
✓ Build and start
✓ Database persistence
✓ Version upgrade
✓ Fresh deployment

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Step 3: DO NOT PUSH (await user approval)**

Run: `git status`
Expected: Shows unpushed commits

---

## Post-Implementation Notes

### After User Approval to Push

**Step 1: Push to master**

```bash
git push origin master
```

**Step 2: Monitor GitHub Actions**

Visit: `https://github.com/waldokilian2/MusicSwipe/actions`

Expected: Docker workflow builds and pushes multi-arch images

**Step 3: Verify GHCR image**

Visit: `https://github.com/users/waldokilian2/packages/container/package/musicswipe`

Expected: `:latest` tag available for amd64 and arm64

### Deployment on ZimaOS

1. Pull image: `ghcr.io/waldokilian2/musicswipe:latest`
2. Mount volume: `music-data:/app/data`
3. Expose port: `3000`
4. Environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL=file:/app/data/music.db`

### Troubleshooting Commands

```bash
# View container logs
docker-compose logs -f

# Inspect database
docker exec -it musicswipe npx prisma studio

# Rebuild from scratch
docker-compose down -v
docker-compose up --build

# Check database schema
docker exec -it musicswipe npx prisma db push --print
```
