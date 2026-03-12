# MusicSwipe Design Document

**Date:** 2026-03-11
**Status:** Approved
**Designer:** Claude (via brainstorming workflow)

## Overview

MusicSwipe is a mobile-first music discovery web app combining Tinder's swipe mechanics with Spotify-style playback. Users discover new music through swipeable cards, preview 30-second clips, and build a library of liked songs.

**Core Value Proposition:** Make music discovery engaging through intuitive swipe gestures and dynamic visual theming.

## Requirements

### User Needs
- **Primary:** Discover new music through an engaging, gamified interface
- **Secondary:** Save liked songs to a personal library for later listening
- **Tertiary:** Filter discovery by favorite musical genres

### Design Philosophy
- **Visual Style:** Apple glassmorphism with dynamic color theming based on album artwork
- **Interaction:** Mobile-first touch gestures (swipe right = like, swipe left = dislike)
- **Performance:** Smooth 60fps animations, instant audio preview

## Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 16, React 19, TypeScript | App Router + API Routes in single deploy |
| Styling | Tailwind CSS v4 | Fast development, modern CSS features |
| Animation | Framer Motion | Declarative gestures, smooth transitions |
| Database | Prisma ORM + SQLite | Zero-config, perfect for single-user app |
| Music API | iTunes Search API | Free, no auth, 30s previews |

### Architectural Decision: Client-Focused Approach

**Choice:** Next.js App Router with client-side state management

**Why not alternatives:**
- *Server-first (SSR):* Swipe gestures feel less responsive
- *Microservices:* Over-engineered for a single-user app

**Key implications:**
- Audio state managed via React Context (client-side)
- API routes for data persistence (Next.js backend)
- Single-container deployment via Docker

## Component Architecture

```
App (layout.tsx)
├── AudioProvider (global player state)
│
├── Page (page.tsx)
│   ├── Header (tab switching, branding)
│   │
│   ├── GenreSelect (onboarding overlay)
│   │   └── Genre chips → localStorage persistence
│   │
│   ├── DiscoverView (discover tab)
│   │   └── SwipeCard (stack of draggable cards)
│   │       ├── Album artwork (dynamic bg color)
│   │       ├── Song info (title, artist)
│   │       ├── Play/Pause controls
│   │       └── Gesture handlers
│   │
│   └── LibraryView (library tab)
│       ├── Song list (liked songs)
│       └── Edit mode (bulk delete)
│
└── Tab Bar (bottom navigation)
```

### Component Responsibilities

| Component | Responsibility | Key Props |
|-----------|---------------|-----------|
| `SwipeCard` | Single song card with drag gestures | `song`, `onLike`, `onDislike` |
| `DiscoverView` | Card stack, queue management | None (API-driven) |
| `LibraryView` | List view, CRUD operations | None (API-driven) |
| `GenreSelect` | Onboarding, genre selection | `onComplete` |
| `AudioProvider` | Wraps app, manages audio element | `children` |

## Data Flow & State

### Global State (AudioContext)

```typescript
interface AudioState {
  currentSong: Song | null      // Currently playing song
  isPlaying: boolean            // Playback state
  queue: Song[]                 // Upcoming songs
  queueMode: 'discover' | 'library'  // Queue source
  play: (song: Song) => void    // Play specific song
  pause: () => void             // Pause playback
  setQueue: (songs: Song[], mode: string) => void  // Replace queue
  removeFromQueue: (songId: string) => void  // Remove song
}
```

### API Routes

| Route | Method | Purpose | Request/Response |
|-------|--------|---------|------------------|
| `/api/discover` | GET | Fetch songs by genre | Query: `genre` → Returns: `Song[]` |
| `/api/swipe` | POST | Record dislike | Body: `{ iTunesId, action }` |
| `/api/library` | GET | Fetch liked songs | Returns: `Song[]` |
| `/api/library` | POST | Add to library | Body: `Song` |
| `/api/library` | DELETE | Remove from library | Body: `{ id }` |
| `/api/library/[id]/color` | GET | Extract artwork color | Returns: `{ color: string }` |

### Data Flow: Like Action

```
1. User swipes right (like)
   ↓
2. SwipeCard calls onLike(song)
   ↓
3. DiscoverView POSTs to /api/library
   ↓
4. Prisma creates Song record with likedAt timestamp
   ↓
5. AudioContext updates queue (removes liked song)
   ↓
6. Next card auto-plays preview
```

### Song Identity Strategy

- **iTunes ID** (number) → Canonical identifier across all APIs
- **CUID** (string) → Internal database primary key
- **Frontend normalization** → `iTunesId.toString()` for consistency

This hybrid approach ensures:
1. External API integration works seamlessly (iTunes IDs)
2. Database operations are safe (CUID primary keys)
3. Frontend code remains consistent (string IDs everywhere)

## Database Schema

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
  dominantColor String?   @default("#6366f1")  // Extracted from artwork
  likedAt       DateTime?
  dislikedAt    DateTime?
  skippedAt     DateTime?
  createdAt     DateTime  @default(now())
}
```

**Timestamps Strategy:**
- `likedAt`: Set when user swipes right
- `dislikedAt`: Set when user swipes left
- `skippedAt`: Set when user skips without action
- `createdAt`: When song first entered system

## Error Handling & Edge Cases

### API Failures

| Scenario | Handling Strategy |
|----------|-------------------|
| iTunes API rate limit | Show toast, retry with exponential backoff |
| No results for genre | Shuffle across 5 random genres as fallback |
| Audio preview unavailable | Disable play button, show error icon |
| Artwork load fails | Show fallback gradient using dominantColor |

### User Experience Edge Cases

| Edge Case | Solution |
|-----------|----------|
| No saved genres (first visit) | Show GenreSelect overlay, block discover access |
| Queue empty in discover | Auto-fetch more songs from selected genres |
| Library empty | Show empty state with "Go Discover" CTA |
| Browser autoplay blocked | Show tap-to-play overlay on first interaction |
| Mobile viewport changes | Use `h-dvh` (dynamic viewport height) |

### Database Edge Cases

| Scenario | Handling |
|----------|----------|
| Duplicate iTunesId in library | Upsert operation (ignore duplicates) |
| Missing dominantColor | Default to `#6366f1` (indigo) |

## Visual Design

### Apple Glassmorphism Style

**Key characteristics:**
- Semi-transparent backgrounds (`backdrop-blur`)
- Dynamic gradient backgrounds from album artwork colors
- Smooth transitions between color themes
- Subtle shadows and borders for depth

**Color extraction flow:**
1. Load album artwork image
2. Extract dominant color using color extraction service
3. Cache in database (dominantColor field)
4. Use for background gradient and UI accents

**Fallback color:** `#6366f1` (indigo)

### Animations

| Interaction | Animation | Library |
|-------------|-----------|---------|
| Page transitions | Fade + slide | Framer Motion |
| Card swipe | Follow gesture with spring physics | Framer Motion |
| Like action | Heart burst | Framer Motion |
| Dislike action | Fade out + slide | Framer Motion |
| Background color | Smooth gradient transition | CSS transitions |

## Testing Strategy

### Testing Layers (YAGNI-Applied)

| Layer | Scope | Tools | Priority |
|-------|-------|-------|----------|
| Unit | Utilities (color extraction, shuffling) | Jest/Vitest | Medium |
| Integration | API routes (CRUD) | Next.js test harness | High |
| E2E | Critical flows (swipe, like, play) | Playwright | High |
| Manual | Swipe gestures, audio playback | Browser dev tools | Ongoing |

### Critical Test Coverage

1. **Happy Path:** Like → Library → Play
2. **Genre Onboarding:** Select → Fetch → Discover
3. **Audio Queue:** Play → Next → Pause
4. **Error States:** API failures, missing data

### Out of Scope (YAGNI)

- Individual component rendering tests (manual review sufficient)
- Visual regression tests (not needed for this app)
- Accessibility tests (mobile touch-first, no keyboard nav)

## Deployment

### Docker Strategy

**Single-container deployment:**

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
# ... build steps ...

FROM node:20-alpine AS runner
# ... runtime steps ...
```

**Key considerations:**
- Volume mount for SQLite database persistence
- Port 3000 exposed
- Health check endpoint
- Minimal image size

### Environment Variables

```env
DATABASE_URL="file:./db/music.db"  # Only needed for custom location
```

## Success Metrics

- **Engagement:** Users swipe through 10+ songs per session
- **Retention:** Users return within 7 days
- **Conversion:** 30%+ of swipes result in likes
- **Performance:** Swipe gestures maintain 60fps on mobile devices

## Next Steps

After design approval, proceed to:
1. Create detailed implementation plan (`writing-plans` skill)
2. Set up project scaffold
3. Implement core features in priority order

---

**Design approved by:** User (via brainstorming workflow)
**Implementation plan:** TBD (next phase)
