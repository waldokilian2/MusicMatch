# MusicMatch

A mobile-first music discovery web app combining Tinder's swipe mechanics with Spotify-style playback. Discover new music, preview songs, and save your favorites - all with a beautiful Apple glassmorphism design.

## Features

- **Genre Selection Onboarding** - Pick your favorite genre when starting the app
- **Genre Switching** - Change genres anytime from the header dropdown
- **Tinder-Style Swiping** - Swipe right to like, left to dislike
- **30-Second Previews** - Auto-play song previews while browsing
- **Dynamic Color Theme** - Background adapts to album artwork colors
- **Apple Glassmorphism UI** - Beautiful blur effects and translucent elements
- **Vignette Design** - Elegant darkened gradients on headers and navigation
- **Library Management** - View liked songs with edit mode to remove tracks
- **Apple Music Integration** - Direct links to full songs on Apple Music
- **Offline-First Database** - SQLite with Prisma ORM for fast local storage
- **Mobile-First Design** - Optimized for all screen sizes

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: Prisma ORM with SQLite
- **API**: iTunes Search API (free, no API key required)
- **Audio**: HTML5 Audio API

---

## Full Startup Instructions

### Prerequisites

Choose one of the following package managers:

- **Node.js 18+** with npm (recommended for beginners)
- **Bun** (faster, modern alternative)

---

### Option 1: Using npm (Recommended for Beginners)

#### Step 1: Install Node.js (if not already installed)

**Windows:**
1. Download from [https://nodejs.org/](https://nodejs.org/)
2. Run the installer and follow the prompts
3. Restart your terminal/command prompt after installation

**Mac:**
```bash
# Using Homebrew
brew install node
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Step 2: Navigate to Project Folder

```bash
cd MusicMatch
```

#### Step 3: Install Dependencies

```bash
npm install
```

#### Step 4: Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Create database and run migrations
npx prisma migrate dev --name init
```

#### Step 5: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option 2: Using Bun (Faster Alternative)

#### Step 1: Install Bun (if not already installed)

**Windows:**
```powershell
# Using PowerShell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Or use a package manager:
```powershell
# Using scoop
scoop install bun

# Using chocolatey
choco install bun
```

**Mac:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

#### Step 2: Navigate to Project Folder

```bash
cd MusicMatch
```

#### Step 3: Install Dependencies

```bash
bun install
```

#### Step 4: Setup Database

```bash
# Generate Prisma client
bunx prisma generate

# Create database and run migrations
bunx prisma migrate dev --name init
```

#### Step 5: Start Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Quick Reference: npm vs Bun Commands

| Task | npm | Bun |
|------|-----|-----|
| Install dependencies | `npm install` | `bun install` |
| Generate Prisma client | `npx prisma generate` | `bunx prisma generate` |
| Create database migration | `npx prisma migrate dev --name init` | `bunx prisma migrate dev --name init` |
| Start dev server | `npm run dev` | `bun run dev` |
| Build for production | `npm run build` | `bun run build` |
| Start production server | `npm run start` | `bun run start` |
| Run linter | `npm run lint` | `bun run lint` |
| Open database GUI | `npx prisma studio` | `bunx prisma studio` |

---

## Troubleshooting

### Windows-Specific Issues

#### Port 3000 Already in Use

```powershell
# Find and kill the process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or change the port:
```bash
# Edit package.json and change the dev script to:
"dev": "next dev -p 3001"
```

#### Prisma Client Not Generated

```bash
# Regenerate the client
npx prisma generate

# Or with Bun
bunx prisma generate
```

#### Database Path Issues

The `.env` file uses a relative path that works on all platforms:
```env
DATABASE_URL="file:./db/music.db"
```

If you encounter issues, ensure the `db` folder exists:
```bash
# Windows
mkdir db

# Mac/Linux
mkdir -p db
```

#### Clear Cache and Rebuild

**Windows:**
```powershell
# Remove cache directories
rmdir /s /q .next
rmdir /s /q node_modules

# Reinstall and rebuild
npm install
npx prisma generate
npm run dev
```

**Mac/Linux:**
```bash
rm -rf .next node_modules
npm install
npx prisma generate
npm run dev
```

### Common Issues (All Platforms)

#### Autoplay Not Working

Browsers block autoplay audio without user interaction. The app handles this by:
1. Requiring a tap on the play button for the first song
2. Auto-playing subsequent songs after initial interaction

#### Playback Stops Immediately in Library

This bug has been fixed. If you encounter this issue:
1. Ensure you have the latest version of the code
2. The bug was caused by `isPlaying` being in the `useEffect` dependency array

#### Database Reset

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset --force

# Or with Bun
bunx prisma migrate reset --force
```

#### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Or with Bun
bun install
```

---

## Usage Guide

### First Launch

1. **Select Genre** - Choose a music genre to explore when the app starts
2. **Browse Songs** - Cards show album art, song title, artist, and album
3. **Swipe Right** - Like the song (adds to your library)
4. **Swipe Left** - Dislike the song (won't show again)
5. **Change Genre** - Tap the genre button in the header to switch

### Discover Tab

| Action | Description |
|--------|-------------|
| Swipe Right | Like the song and add to library |
| Swipe Left | Dislike the song |
| Tap Play/Pause Button | Control playback in top-right corner |
| Change Genre | Tap genre dropdown in header |

### Library Tab

| Action | Description |
|--------|-------------|
| Tap Play Button | Preview 30-second clip |
| Tap External Link | Open in Apple Music |
| Tap Pencil Icon | Enter edit mode |
| Select Songs | Tap to select multiple songs |
| Remove Selected | Delete selected songs from library |

---

## Project Structure

```
MusicMatch/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main app with genre selection and tabs
│   │   ├── layout.tsx            # Root layout
│   │   └── api/
│   │       ├── discover/route.ts # Fetch songs from iTunes
│   │       ├── swipe/route.ts    # Record like/dislike
│   │       └── library/route.ts  # Library CRUD
│   ├── components/
│   │   └── music/
│   │       ├── GenreSelect.tsx   # Genre selection onboarding
│   │       ├── SwipeCard.tsx     # Draggable card component
│   │       ├── DiscoverView.tsx  # Discover tab content
│   │       └── LibraryView.tsx   # Library tab content
│   ├── context/
│   │   └── AudioContext.tsx      # Global audio state
│   ├── hooks/
│   │   └── useColorTheme.ts      # Color extraction from images
│   └── lib/
│       ├── db.ts                 # Prisma client
│       └── itunes.ts             # iTunes API utilities
├── prisma/
│   └── schema.prisma             # Database schema
├── db/
│   └── music.db                  # SQLite database (created on first run)
├── .env                          # Environment variables
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

---

## API Reference

### iTunes API

The app uses the free iTunes Search API - no API key required.

| Endpoint | Description |
|----------|-------------|
| `https://itunes.apple.com/search?media=music&entity=song&genreId={id}` | Search by genre |
| `https://itunes.apple.com/lookup?id={trackId}` | Lookup by track ID |

### Internal API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/discover` | GET | Fetch new songs (supports `?genreId=` param) |
| `/api/discover` | GET | Fetch songs from multiple genres |
| `/api/swipe` | POST | Record a swipe action (like/dislike) |
| `/api/library` | GET | Get all liked songs |
| `/api/library` | DELETE | Remove song from library |

---

## Database Schema

```prisma
model Song {
  id            String    @id @default(cuid())
  iTunesId      Int       @unique
  name          String
  artist        String
  album         String?
  artworkUrl    String
  previewUrl    String
  trackViewUrl  String?
  likedAt       DateTime?
  dislikedAt    DateTime?
  skippedAt     DateTime?
  createdAt     DateTime  @default(now())
}
```

---

## Production Deployment

### Build for Production

```bash
# Using npm
npm run build
npm run start

# Using Bun
bun run build
bun run start
```

### Docker Deployment

```bash
# Build the image
docker build -t musicmatch .

# Run the container
docker run -p 3000:3000 -v ${PWD}/db:/app/db musicmatch
```

### Docker Compose

```bash
docker-compose up -d
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database path (relative path for cross-platform compatibility)
DATABASE_URL="file:./db/music.db"
```

---

## Available Scripts

| Script | npm | Bun | Description |
|--------|-----|-----|-------------|
| dev | `npm run dev` | `bun run dev` | Start development server |
| build | `npm run build` | `bun run build` | Build for production |
| start | `npm run start` | `bun run start` | Start production server |
| lint | `npm run lint` | `bun run lint` | Run ESLint |
| db:push | `npm run db:push` | `bun run db:push` | Push schema to database |
| db:generate | `npm run db:generate` | `bun run db:generate` | Generate Prisma client |
| db:migrate | `npm run db:migrate` | `bun run db:migrate` | Create migration |
| db:reset | `npm run db:reset` | `bun run db:reset` | Reset database |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) for free music data
- [Framer Motion](https://www.framer.com/motion/) for smooth animations
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Lucide Icons](https://lucide.dev/) for beautiful icons
