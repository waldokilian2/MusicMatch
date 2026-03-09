# MusicMatch

Mobile-first music discovery app with swipe mechanics and dynamic theming.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion
- **Database**: Prisma ORM with SQLite
- **API**: iTunes Search API (no key required)

## Quick Start

```bash
# Install dependencies
bun install

# Start dev server
bun run dev
```

Open http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run db:push` | Push schema to database |
| `bun run db:migrate` | Create migration |
| `bun run db:reset` | Reset database |
| `bunx prisma studio` | Open database GUI |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main app
│   ├── layout.tsx            # Root layout
│   └── api/
│       ├── discover/route.ts # Fetch songs from iTunes
│       ├── swipe/route.ts    # Record like/dislike
│       └── library/route.ts  # Library CRUD
├── components/music/         # GenreSelect, SwipeCard, DiscoverView, LibraryView
├── context/AudioContext.tsx  # Global audio state
├── hooks/                    # use-mobile, useColorTheme, useSwipeGesture
└── lib/                      # db, itunes, utils
```

## Environment

```env
DATABASE_URL="file:./db/music.db"
```
