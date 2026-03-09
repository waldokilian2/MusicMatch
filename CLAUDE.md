# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MusicMatch (MusicSwipe) is a mobile-first music discovery web app combining Tinder's swipe mechanics with Spotify-style playback. Users discover new music through swipeable cards, preview 30-second clips, and build a library of liked songs.

**Key Design Philosophy:** Apple glassmorphism UI with dynamic color theming based on album artwork. The app uses animated background gradients that transition smoothly between songs.

## Commands

### Development
```bash
# Start dev server (runs on port 3000)
npm run dev          # or bun run dev

# Build for production
npm run build        # or bun run build

# Start production server
npm run start        # or bun run start

# Lint
npm run lint         # or bun run lint
```

### Database (Prisma with SQLite)
```bash
# Generate Prisma client (run after schema changes)
npm run db:generate  # or bunx prisma generate

# Create and apply migrations
npm run db:migrate   # or bunx prisma migrate dev

# Push schema directly to database (development only)
npm run db:push      # or bunx prisma db push

# Reset database (deletes all data)
npm run db:reset     # or bunx prisma migrate reset --force

# Open Prisma Studio (database GUI)
npx prisma studio    # or bunx prisma studio
```

## Architecture

### App Structure
```
src/
├── app/
│   ├── page.tsx              # Main app with tab switching and header
│   ├── layout.tsx            # Root layout with AudioProvider
│   └── api/
│       ├── discover/route.ts # Fetch songs from iTunes API
│       ├── swipe/route.ts    # Record like/dislike actions
│       ├── library/route.ts  # Library CRUD (GET, POST, DELETE)
│       └── library/[id]/color/route.ts  # Extract color from artwork
├── components/
│   ├── music/
│   │   ├── GenreSelect.tsx   # Onboarding genre selection
│   │   ├── SwipeCard.tsx     # Draggable swipeable card
│   │   ├── DiscoverView.tsx  # Discover tab with card stack
│   │   └── LibraryView.tsx   # Library tab with edit mode
│   └── ui/                   # shadcn/ui components
├── context/
│   └── AudioContext.tsx      # Global audio player state
├── hooks/
│   ├── useColorTheme.ts      # Extract dominant color from images
│   ├── useSwipeGesture.ts    # Touch gesture handling
│   └── use-mobile.ts         # Mobile detection
├── lib/
│   ├── db.ts                 # Prisma client singleton
│   ├── itunes.ts             # iTunes API utilities
│   └── utils.ts              # Helper functions
└── styles/
    └── globals.css           # Global styles with CSS variables
```

### Key Architecture Patterns

**1. Global Audio State (AudioContext)**
- Single HTML5 Audio element managed via React Context
- Two queue modes: 'discover' (fetched songs) and 'library' (liked songs)
- Queue state persists when switching between discover/library tabs
- Playback auto-pauses when switching to library tab (by design)
- Uses refs to avoid re-creating audio element on re-renders

**2. Song ID Strategy**
- iTunes IDs (numbers) are used as the canonical identifier
- Internal database uses CUID strings as primary keys
- Frontend uses `iTunesId.toString()` for consistency between APIs
- When fetching library, songs are transformed to use iTunesId as id

**3. Dynamic Color Theming**
- Dominant color extracted from album artwork using a worker/service
- Background gradient transitions smoothly when color changes
- Color stored in database with songs to avoid re-extraction
- Fallback color: `#6366f1` (indigo)

**4. iTunes API Integration**
- Free, no API key required
- Genre-based filtering using Apple's genre IDs
- "All Genres" mode fetches from 5 random genres and shuffles
- Results shuffled using Fisher-Yates algorithm
- Artwork URLs upgraded from 100x100 to 600x600

**5. Swipe Gesture System**
- Custom touch/drag gesture handling using useSwipeGesture hook
- Swiping right: likes song (calls `/api/library` POST)
- Swiping left: records dislike (calls `/api/swipe` POST)
- Card removed from stack after swipe action

**6. Database Model**
```prisma
model Song {
  id            String    @id @default(cuid())
  iTunesId      Int       @unique  // Canonical identifier
  name          String
  artist        String
  album         String?
  artworkUrl    String
  previewUrl    String
  trackViewUrl  String?
  dominantColor String?   @default("#6366f1")
  likedAt       DateTime?
  dislikedAt    DateTime?
  skippedAt     DateTime?
  createdAt     DateTime  @default(now())
}
```

## Tech Stack Details

- **Framework:** Next.js 16 (App Router) with React 19
- **Styling:** Tailwind CSS v4 with custom animations
- **Animation:** Framer Motion for page transitions and card gestures
- **Database:** Prisma ORM with SQLite (file: `./db/music.db`)
- **Icons:** Lucide React
- **UI Components:** shadcn/ui (New York style)

## Important Notes

### ESLint Configuration
This project has a very permissive ESLint config that disables many rules. This is intentional for rapid development. Do not "fix" the ESLint warnings unless asked.

### Mobile-First Design
- Uses `h-dvh` (dynamic viewport height) for mobile browser support
- Safe area insets handled via `safe-top` and `safe-bottom` classes
- Touch gestures are primary interaction method
- Performance optimizations for mobile (simplified backgrounds on mobile)

### Browser Autoplay
- Audio requires user interaction before first play
- App handles this by showing play button for first song
- After first interaction, subsequent songs auto-play

### Path Aliases
```typescript
@/*      → ./src/*
@/components/* → ./src/components/*
@/lib/*  → ./src/lib/*
@/hooks/* → ./src/hooks/*
```

### Environment Variables
```env
# Only needed for production/custom database location
DATABASE_URL="file:./db/music.db"
```

## Common Development Tasks

**Adding a new genre to the selector:**
1. Update `GENRE_OPTIONS` in `src/app/page.tsx`
2. Optionally add to `GENRE_IDS` in `src/lib/itunes.ts`

**Modifying the swipe card:**
- Main logic in `src/components/music/SwipeCard.tsx`
- Gesture handling in `src/hooks/useSwipeGesture.ts`

**Changing audio playback behavior:**
- Modify `src/context/AudioContext.tsx`
- Audio element lifecycle managed in useEffect

**Updating database schema:**
1. Edit `prisma/schema.prisma`
2. Run `npm run db:generate` to regenerate client
3. Run `npm run db:push` to update database (dev) or create migration (prod)

**Styling changes:**
- Global styles: `src/app/globals.css`
- Tailwind config: `tailwind.config.ts`
- Component-specific styles use Tailwind classes
