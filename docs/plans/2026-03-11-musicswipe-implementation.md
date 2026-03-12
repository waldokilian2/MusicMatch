# MusicSwipe Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first music discovery web app with swipe mechanics, dynamic theming, and library management.

**Architecture:** Next.js 16 App Router with client-side audio state (React Context), Prisma ORM with SQLite, and iTunes Search API integration. Single-container Docker deployment.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Prisma, SQLite, shadcn/ui components

---

## Phase 1: Project Foundation

### Task 1: Initialize Next.js Project with Required Dependencies

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest musicswipe --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd musicswipe
```

Expected: Project scaffolded with Next.js 16

**Step 2: Install additional dependencies**

Run:
```bash
npm install framer-motion lucide-react sharp
npm install -D prisma @prisma/client
npm install -D @types/node
```

Expected: All packages installed

**Step 3: Configure Tailwind CSS v4**

Create `tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
    },
  },
  plugins: [],
};
export default config;
```

**Step 4: Update next.config.ts**

Create `next.config.ts`:
```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "is1-ssl.mzstatic.com",
      },
    ],
  },
};
export default nextConfig;
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project with dependencies"
```

---

### Task 2: Set Up Prisma Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/db/music.db` (via migration)

**Step 1: Create Prisma schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./db/music.db"
}

model Song {
  id            String    @id @default(cuid())
  iTunesId      Int       @unique
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

**Step 2: Generate Prisma client**

Run:
```bash
npx prisma generate
```

Expected: Prisma client generated successfully

**Step 3: Create initial migration**

Run:
```bash
npx prisma migrate dev --name init
```

Expected: Migration created, database file created at `prisma/db/music.db`

**Step 4: Create Prisma client singleton**

Create `src/lib/db.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 5: Commit**

```bash
git add prisma/ src/lib/db.ts
git commit -m "feat: set up Prisma with SQLite database schema"
```

---

### Task 3: Create Global Styles and CSS Variables

**Files:**
- Create: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Create global styles**

Create `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
}

/* Safe area insets for mobile */
.safe-top {
  padding-top: env(safe-area-inset-top);
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Dynamic viewport height for mobile */
.h-dvh {
  height: 100dvh;
}
```

**Step 2: Update root layout**

Modify `src/app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MusicSwipe - Discover Music",
  description: "Swipe to discover new music",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-hidden">{children}</body>
    </html>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: add global styles and CSS variables"
```

---

## Phase 2: Core Utilities

### Task 4: Create iTunes API Utilities

**Files:**
- Create: `src/lib/itunes.ts`

**Step 1: Write iTunes API types and functions**

Create `src/lib/itunes.ts`:
```typescript
export interface ITunesSong {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100: string;
  previewUrl: string;
  trackViewUrl?: string;
}

export interface Song {
  id: string; // iTunesId as string
  iTunesId: number;
  name: string;
  artist: string;
  album?: string;
  artworkUrl: string;
  previewUrl: string;
  trackViewUrl?: string;
  dominantColor?: string;
}

// Apple Music genre IDs
export const GENRE_IDS: Record<string, number> = {
  "All Genres": 0,
  Pop: 14,
  "Hip-Hop/Rap": 18,
  Rock: 21,
  Electronic: 17,
  R&B: 15,
  Country: 6,
  "Latin/Brazil": 2571,
  Jazz: 11,
  Classical: 5,
  "Alternative/Punk": 20,
};

export async function fetchSongsByGenre(
  genre: string,
  limit: number = 20
): Promise<Song[]> {
  const genreId = GENRE_IDS[genre];

  if (genre === "All Genres") {
    // Fetch from 5 random genres and shuffle
    const randomGenres = Object.keys(GENRE_IDS)
      .filter(g => g !== "All Genres")
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    const allSongs = await Promise.all(
      randomGenres.map(g => fetchSongsByGenre(g, Math.ceil(limit / 5)))
    );

    return shuffleArray(allSongs.flat());
  }

  const response = await fetch(
    `https://itunes.apple.com/search?term=song&genreId=${genreId}&limit=${limit}&media=music`
  );

  if (!response.ok) {
    throw new Error(`iTunes API error: ${response.statusText}`);
  }

  const data = await response.json();

  return transformITunesSongs(data.results);
}

function transformITunesSongs(iTunesSongs: ITunesSong[]): Song[] {
  return iTunesSongs
    .filter(song => song.previewUrl && song.artworkUrl100)
    .map(song => ({
      id: song.trackId.toString(),
      iTunesId: song.trackId,
      name: song.trackName,
      artist: song.artistName,
      album: song.collectionName,
      artworkUrl: song.artworkUrl100.replace("100x100", "600x600"),
      previewUrl: song.previewUrl,
      trackViewUrl: song.trackViewUrl,
    }));
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

**Step 2: Commit**

```bash
git add src/lib/itunes.ts
git commit -m "feat: add iTunes API utilities with genre support"
```

---

### Task 5: Create Utility Functions

**Files:**
- Create: `src/lib/utils.ts`

**Step 1: Create utility functions**

Create `src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
```

**Step 2: Install clsx if needed**

Run:
```bash
npm install clsx
```

**Step 3: Commit**

```bash
git add src/lib/utils.ts package.json package-lock.json
git commit -m "feat: add utility functions for className merging"
```

---

## Phase 3: Audio Context

### Task 6: Create Audio Context Provider

**Files:**
- Create: `src/context/AudioContext.tsx`

**Step 1: Write the failing test**

Note: We'll test this manually since it requires browser audio API

**Step 2: Create Audio Context**

Create `src/context/AudioContext.tsx`:
```typescript
"use client";

import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import type { Song } from "@/lib/itunes";

interface AudioState {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  queueMode: "discover" | "library";
  play: (song: Song) => void;
  pause: () => void;
  setQueue: (songs: Song[], mode: "discover" | "library") => void;
  removeFromQueue: (songId: string) => void;
}

const AudioContext = createContext<AudioState | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueMode, setQueueMode] = useState<"discover" | "library">("discover");

  // Initialize audio element
  React.useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", handleEnded);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", handleEnded);
      }
    };
  }, []);

  const handleEnded = useCallback(() => {
    if (queue.length > 0) {
      const nextSong = queue[0];
      setCurrentSong(nextSong);
      setQueue(prev => prev.slice(1));

      if (audioRef.current && nextSong.previewUrl) {
        audioRef.current.src = nextSong.previewUrl;
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(false);
    }
  }, [queue]);

  const play = useCallback((song: Song) => {
    if (audioRef.current && song.previewUrl) {
      audioRef.current.src = song.previewUrl;
      audioRef.current.play().catch(console.error);
      setCurrentSong(song);
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const setQueueSongs = useCallback((songs: Song[], mode: "discover" | "library") => {
    setQueue(songs);
    setQueueMode(mode);
  }, []);

  const removeFromQueue = useCallback((songId: string) => {
    setQueue(prev => prev.filter(s => s.id !== songId));
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        queue,
        queueMode,
        play,
        pause,
        setQueue: setQueueSongs,
        removeFromQueue,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within AudioProvider");
  }
  return context;
}
```

**Step 3: Update layout to include AudioProvider**

Modify `src/app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import "./globals.css";
import { AudioProvider } from "@/context/AudioContext";

export const metadata: Metadata = {
  title: "MusicSwipe - Discover Music",
  description: "Swipe to discover new music",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-hidden">
        <AudioProvider>{children}</AudioProvider>
      </body>
    </html>
  );
}
```

**Step 4: Commit**

```bash
git add src/context/AudioContext.tsx src/app/layout.tsx
git commit -m "feat: add AudioContext for global player state"
```

---

## Phase 4: Custom Hooks

### Task 7: Create useSwipeGesture Hook

**Files:**
- Create: `src/hooks/useSwipeGesture.ts`

**Step 1: Create swipe gesture hook**

Create `src/hooks/useSwipeGesture.ts`:
```typescript
"use client";

import { useCallback, useRef, useEffect } from "react";

interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

interface SwipeState {
  startX: number;
  startY: number;
  isDragging: boolean;
}

export function useSwipeGesture(callbacks: SwipeCallbacks) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 100,
  } = callbacks;

  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    isDragging: false,
  });

  const handleStart = useCallback((clientX: number, clientY: number) => {
    stateRef.current = {
      startX: clientX,
      startY: clientY,
      isDragging: true,
    };
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!stateRef.current.isDragging) return;
    // Movement is handled by CSS transforms
  }, []);

  const handleEnd = useCallback((clientX: number, clientY: number) => {
    if (!stateRef.current.isDragging) return;

    const deltaX = clientX - stateRef.current.startX;
    const deltaY = clientY - stateRef.current.startY;

    // Determine which direction had more movement
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    stateRef.current.isDragging = false;
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    },
    [handleStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    },
    [handleMove]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    },
    [handleEnd]
  );

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    },
    [handleStart]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    },
    [handleMove]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handleEnd(e.clientX, e.clientY);
    },
    [handleEnd]
  );

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    mouseHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    },
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useSwipeGesture.ts
git commit -m "feat: add useSwipeGesture hook for touch/mouse gestures"
```

---

### Task 8: Create useColorTheme Hook

**Files:**
- Create: `src/hooks/useColorTheme.ts`

**Step 1: Create color extraction hook**

Create `src/hooks/useColorTheme.ts`:
```typescript
"use client";

import { useState, useEffect } from "react";

interface ColorThemeState {
  dominantColor: string;
  isExtracting: boolean;
  error: string | null;
}

export function useColorTheme(imageUrl: string | null, initialColor = "#6366f1") {
  const [state, setState] = useState<ColorThemeState>({
    dominantColor: initialColor,
    isExtracting: false,
    error: null,
  });

  useEffect(() => {
    if (!imageUrl) {
      setState(prev => ({ ...prev, dominantColor: initialColor }));
      return;
    }

    setState(prev => ({ ...prev, isExtracting: true, error: null }));

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Could not get canvas context");
        }

        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50);
        const color = extractDominantColor(imageData.data);

        setState({
          dominantColor: color,
          isExtracting: false,
          error: null,
        });
      } catch (err) {
        setState({
          dominantColor: initialColor,
          isExtracting: false,
          error: err instanceof Error ? err.message : "Failed to extract color",
        });
      }
    };

    img.onerror = () => {
      setState({
        dominantColor: initialColor,
        isExtracting: false,
        error: "Failed to load image",
      });
    };

    img.src = imageUrl;
  }, [imageUrl, initialColor]);

  return state;
}

function extractDominantColor(data: Uint8ClampedArray): string {
  // Simple color extraction: average RGB values
  let r = 0,
    g = 0,
    b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }

  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  return `rgb(${r}, ${g}, ${b})`;
}
```

**Step 2: Commit**

```bash
git add src/hooks/useColorTheme.ts
git commit -m "feat: add useColorTheme hook for extracting dominant colors"
```

---

### Task 9: Create useMobile Hook

**Files:**
- Create: `src/hooks/use-mobile.ts`

**Step 1: Create mobile detection hook**

Create `src/hooks/use-mobile.ts`:
```typescript
"use client";

import { useEffect, useState } from "react";

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export function useMobile() {
  const [isMobile, setIsMobile] = useState(isMobileDevice());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-mobile.ts
git commit -m "feat: add useMobile hook for responsive detection"
```

---

## Phase 5: API Routes

### Task 10: Create Discover API Route

**Files:**
- Create: `src/app/api/discover/route.ts`

**Step 1: Create discover endpoint**

Create `src/app/api/discover/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchSongsByGenre } from "@/lib/itunes";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const genre = searchParams.get("genre") || "All Genres";
    const limit = parseInt(searchParams.get("limit") || "20");

    const songs = await fetchSongsByGenre(genre, limit);

    return NextResponse.json(songs);
  } catch (error) {
    console.error("Discover API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch songs" },
      { status: 500 }
    );
  }
}
```

**Step 2: Test the endpoint**

Run:
```bash
npm run dev
```

Visit: http://localhost:3000/api/discover?genre=Pop

Expected: JSON array of songs

**Step 3: Commit**

```bash
git add src/app/api/discover/route.ts
git commit -m "feat: add /api/discover endpoint for fetching songs"
```

---

### Task 11: Create Library API Route

**Files:**
- Create: `src/app/api/library/route.ts`

**Step 1: Create library CRUD endpoint**

Create `src/app/api/library/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - Fetch all liked songs
export async function GET() {
  try {
    const songs = await prisma.song.findMany({
      where: { likedAt: { not: null } },
      orderBy: { likedAt: "desc" },
    });

    // Transform to match frontend format
    const transformed = songs.map(song => ({
      id: song.iTunesId.toString(),
      iTunesId: song.iTunesId,
      name: song.name,
      artist: song.artist,
      album: song.album,
      artworkUrl: song.artworkUrl,
      previewUrl: song.previewUrl,
      trackViewUrl: song.trackViewUrl,
      dominantColor: song.dominantColor,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Library GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch library" },
      { status: 500 }
    );
  }
}

// POST - Add song to library
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { iTunesId, name, artist, album, artworkUrl, previewUrl, trackViewUrl, dominantColor } = body;

    const song = await prisma.song.upsert({
      where: { iTunesId },
      update: {
        likedAt: new Date(),
        dislikedAt: null,
      },
      create: {
        iTunesId,
        name,
        artist,
        album,
        artworkUrl,
        previewUrl,
        trackViewUrl,
        dominantColor,
        likedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, song });
  } catch (error) {
    console.error("Library POST error:", error);
    return NextResponse.json(
      { error: "Failed to add to library" },
      { status: 500 }
    );
  }
}

// DELETE - Remove song from library
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    await prisma.song.deleteMany({
      where: { iTunesId: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Library DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove from library" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/library/route.ts
git commit -m "feat: add /api/library CRUD endpoints"
```

---

### Task 12: Create Swipe API Route

**Files:**
- Create: `src/app/api/swipe/route.ts`

**Step 1: Create swipe tracking endpoint**

Create `src/app/api/swipe/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { iTunesId, action } = body; // action: 'like' | 'dislike' | 'skip'

    const song = await prisma.song.upsert({
      where: { iTunesId },
      update: {
        ...(action === "dislike" && { dislikedAt: new Date() }),
        ...(action === "skip" && { skippedAt: new Date() }),
      },
      create: {
        iTunesId,
        name: body.name,
        artist: body.artist,
        album: body.album,
        artworkUrl: body.artworkUrl,
        previewUrl: body.previewUrl,
        trackViewUrl: body.trackViewUrl,
        ...(action === "dislike" && { dislikedAt: new Date() }),
        ...(action === "skip" && { skippedAt: new Date() }),
      },
    });

    return NextResponse.json({ success: true, song });
  } catch (error) {
    console.error("Swipe POST error:", error);
    return NextResponse.json(
      { error: "Failed to record swipe" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/swipe/route.ts
git commit -m "feat: add /api/swipe endpoint for tracking actions"
```

---

### Task 13: Create Color Extraction API Route

**Files:**
- Create: `src/app/api/library/[id]/color/route.ts`

**Step 1: Create color extraction endpoint**

Create `src/app/api/library/[id]/color/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const song = await prisma.song.findUnique({
      where: { id: params.id },
    });

    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      );
    }

    // If color already exists, return it
    if (song.dominantColor) {
      return NextResponse.json({ color: song.dominantColor });
    }

    // Extract color from artwork
    const color = await extractColorFromUrl(song.artworkUrl);

    // Save to database
    await prisma.song.update({
      where: { id: params.id },
      data: { dominantColor: color },
    });

    return NextResponse.json({ color });
  } catch (error) {
    console.error("Color extraction error:", error);
    return NextResponse.json(
      { color: "#6366f1" }, // Fallback color
      { status: 200 }
    );
  }
}

async function extractColorFromUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();

  // Use sharp for color extraction
  const sharp = (await import("sharp")).default;
  const { dominant } = await sharp(buffer)
    .resize(50, 50, { fit: "cover" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Simple average color
  const data = dominant.data;
  let r = 0, g = 0, b = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  r = Math.round(r / pixelCount);
  g = Math.round(g / pixelCount);
  b = Math.round(b / pixelCount);

  return `rgb(${r}, ${g}, ${b})`;
}
```

**Step 2: Commit**

```bash
git add src/app/api/library/[id]/color/route.ts
git commit -m "feat: add color extraction endpoint for artwork"
```

---

## Phase 6: UI Components

### Task 14: Install shadcn/ui

**Files:**
- Modify: `components.json` (created by shadcn init)

**Step 1: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init -y
```

Select options:
- Style: New York
- Base color: Slate
- CSS variables: Yes

**Step 2: Add required components**

Run:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add toast
```

**Step 3: Commit**

```bash
git add components.json src/components/ui/
git commit -m "feat: add shadcn/ui components"
```

---

### Task 15: Create GenreSelect Component

**Files:**
- Create: `src/components/music/GenreSelect.tsx`

**Step 1: Create genre selection component**

Create `src/components/music/GenreSelect.tsx`:
```typescript
"use client";

import { useState } from "react";
import { GENRE_IDS } from "@/lib/itunes";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface GenreSelectProps {
  onComplete: (genres: string[]) => void;
}

const GENRE_OPTIONS = Object.keys(GENRE_IDS);

export function GenreSelect({ onComplete }: GenreSelectProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleComplete = () => {
    if (selectedGenres.length > 0) {
      localStorage.setItem("selectedGenres", JSON.stringify(selectedGenres));
      onComplete(selectedGenres);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm safe-top safe-bottom"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md p-6 mx-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20"
      >
        <h2 className="text-2xl font-bold text-white mb-2">
          Pick Your Genres
        </h2>
        <p className="text-white/70 mb-6">
          Select at least one genre to start discovering music
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6 max-h-96 overflow-y-auto">
          {GENRE_OPTIONS.map(genre => (
            <motion.button
              key={genre}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleGenre(genre)}
              className={`
                p-3 rounded-xl text-sm font-medium transition-all
                ${
                  selectedGenres.includes(genre)
                    ? "bg-white text-black shadow-lg"
                    : "bg-white/10 text-white border border-white/20"
                }
              `}
            >
              {genre}
            </motion.button>
          ))}
        </div>

        <Button
          onClick={handleComplete}
          disabled={selectedGenres.length === 0}
          className="w-full bg-white text-black hover:bg-white/90"
        >
          Start Discovering
        </Button>
      </motion.div>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/music/GenreSelect.tsx
git commit -m "feat: add GenreSelect component for onboarding"
```

---

### Task 16: Create SwipeCard Component

**Files:**
- Create: `src/components/music/SwipeCard.tsx`

**Step 1: Create swipeable card component**

Create `src/components/music/SwipeCard.tsx`:
```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Play, Pause, Heart, X } from "lucide-react";
import type { Song } from "@/lib/itunes";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useAudio } from "@/context/AudioContext";
import { useColorTheme } from "@/hooks/useColorTheme";

interface SwipeCardProps {
  song: Song;
  onLike: () => void;
  onDislike: () => void;
  isTopCard?: boolean;
}

export function SwipeCard({ song, onLike, onDislike, isTopCard = false }: SwipeCardProps) {
  const { currentSong, isPlaying, play, pause } = useAudio();
  const { dominantColor } = useColorTheme(song.artworkUrl);
  const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const isCurrentSong = currentSong?.id === song.id;
  const showPlayButton = isTopCard;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onLike();
    } else if (info.offset.x < -100) {
      onDislike();
    }
  };

  const handlePlayPause = () => {
    if (isCurrentSong && isPlaying) {
      pause();
    } else {
      play(song);
    }
  };

  // Update drag direction during drag
  useEffect(() => {
    const unsubscribe = x.on("change", latest => {
      if (latest > 50) setDragDirection("right");
      else if (latest < -50) setDragDirection("left");
      else setDragDirection(null);
    });
    return unsubscribe;
  }, [x]);

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag={isTopCard ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05 }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      {/* Background gradient based on dominant color */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: `linear-gradient(135deg, ${dominantColor}dd, ${dominantColor}66)`,
        }}
      />

      {/* Card content */}
      <div className="relative h-full flex flex-col items-center justify-center p-6 safe-top">
        {/* Like/Dislike indicators */}
        {isTopCard && dragDirection && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute top-20 px-4 py-2 rounded-full text-2xl font-bold ${
              dragDirection === "right"
                ? "right-8 bg-green-500 text-white"
                : "left-8 bg-red-500 text-white"
            }`}
          >
            {dragDirection === "right" ? "LIKE" : "NOPE"}
          </motion.div>
        )}

        {/* Album artwork */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-64 h-64 md:w-80 md:h-80 mb-8 rounded-2xl overflow-hidden shadow-2xl"
        >
          <img
            src={song.artworkUrl}
            alt={song.album}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
        </motion.div>

        {/* Song info */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">
            {song.name}
          </h3>
          <p className="text-lg text-white/80 drop-shadow">{song.artist}</p>
          {song.album && (
            <p className="text-sm text-white/60 mt-1">{song.album}</p>
          )}
        </div>

        {/* Play/Pause button */}
        {showPlayButton && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePlayPause}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center"
          >
            {isCurrentSong && isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/music/SwipeCard.tsx
git commit -m "feat: add SwipeCard component with drag gestures"
```

---

### Task 17: Create DiscoverView Component

**Files:**
- Create: `src/components/music/DiscoverView.tsx`

**Step 1: Create discover view component**

Create `src/components/music/DiscoverView.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SwipeCard } from "./SwipeCard";
import type { Song } from "@/lib/itunes";
import { useAudio } from "@/context/AudioContext";

export function DiscoverView({ genres }: { genres: string[] }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { setQueue } = useAudio();

  useEffect(() => {
    fetchSongs();
  }, [genres]);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const genre = genres[Math.floor(Math.random() * genres.length)];
      const response = await fetch(`/api/discover?genre=${encodeURIComponent(genre)}&limit=20`);
      const newSongs = await response.json();

      setSongs(newSongs);
      setCurrentIndex(0);
      setQueue(newSongs, "discover");
    } catch (error) {
      console.error("Failed to fetch songs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (currentIndex >= songs.length) return;

    const song = songs[currentIndex];

    // Record like
    await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(song),
    });

    // Remove from queue and move to next
    setCurrentIndex(prev => prev + 1);
  };

  const handleDislike = async () => {
    if (currentIndex >= songs.length) return;

    const song = songs[currentIndex];

    // Record dislike
    await fetch("/api/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...song, action: "dislike" }),
    });

    // Move to next
    setCurrentIndex(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white text-lg">Loading songs...</div>
      </div>
    );
  }

  if (currentIndex >= songs.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-full p-6 text-center"
      >
        <h2 className="text-2xl font-bold text-white mb-4">
          No more songs!
        </h2>
        <button
          onClick={fetchSongs}
          className="px-6 py-3 bg-white text-black rounded-full font-medium"
        >
          Load More
        </button>
      </motion.div>
    );
  }

  const visibleSongs = songs
    .slice(currentIndex, currentIndex + 3)
    .reverse();

  return (
    <div className="relative h-full">
      <AnimatePresence>
        {visibleSongs.map((song, index) => {
          const isTopCard = index === visibleSongs.length - 1;
          const actualIndex = currentIndex + (visibleSongs.length - 1 - index);

          return (
            <motion.div
              key={song.id}
              initial={{ scale: 0.9, y: 100, opacity: 0 }}
              animate={{
                scale: 1 - (visibleSongs.length - 1 - index) * 0.05,
                y: (visibleSongs.length - 1 - index) * 10,
                opacity: 1,
              }}
              exit={{ x: -300, opacity: 0, transition: { duration: 0.3 } }}
              className="absolute inset-0"
              style={{ zIndex: 10 - index }}
            >
              <SwipeCard
                song={song}
                onLike={isTopCard ? handleLike : () => {}}
                onDislike={isTopCard ? handleDislike : () => {}}
                isTopCard={isTopCard}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/music/DiscoverView.tsx
git commit -m "feat: add DiscoverView component with card stack"
```

---

### Task 18: Create LibraryView Component

**Files:**
- Create: `src/components/music/LibraryView.tsx`

**Step 1: Create library view component**

Create `src/components/music/LibraryView.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, Play, Pause } from "lucide-react";
import type { Song } from "@/lib/itunes";
import { useAudio } from "@/context/AudioContext";

export function LibraryView() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { currentSong, isPlaying, play, pause } = useAudio();

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/library");
      const librarySongs = await response.json();
      setSongs(librarySongs);
    } catch (error) {
      console.error("Failed to fetch library:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    for (const id of selectedIds) {
      await fetch("/api/library", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    }

    setSelectedIds(new Set());
    setEditMode(false);
    fetchLibrary();
  };

  const handlePlayPause = (song: Song) => {
    const isCurrentSong = currentSong?.id === song.id;
    if (isCurrentSong && isPlaying) {
      pause();
    } else {
      play(song);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white text-lg">Loading library...</div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Your library is empty
        </h2>
        <p className="text-white/70 mb-4">
          Like some songs to add them here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto safe-bottom">
      {/* Header */}
      <div className="sticky top-0 bg-black/30 backdrop-blur-xl p-4 safe-top z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Library ({songs.length})
          </h2>
          {editMode ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditMode(false);
                  setSelectedIds(new Set());
                }}
                className="px-4 py-2 text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="px-4 py-2 bg-red-500 text-white rounded-full disabled:opacity-50"
              >
                Delete ({selectedIds.size})
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-white/10 text-white rounded-full"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Song list */}
      <div className="p-4 space-y-2">
        {songs.map((song, index) => {
          const isSelected = selectedIds.has(song.id);
          const isCurrentSong = currentSong?.id === song.id;

          return (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => editMode && toggleSelect(song.id)}
              className={`
                relative flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all
                ${editMode ? "bg-white/5 hover:bg-white/10" : "bg-white/10"}
                ${isSelected ? "ring-2 ring-white" : ""}
              `}
            >
              {/* Checkbox in edit mode */}
              {editMode && (
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${isSelected ? "bg-white border-white" : "border-white/30"}
                `}>
                  {isSelected && <div className="w-3 h-3 bg-black rounded-full" />}
                </div>
              )}

              {/* Artwork */}
              <img
                src={song.artworkUrl}
                alt={song.album}
                className="w-14 h-14 rounded-lg object-cover shadow-lg"
              />

              {/* Song info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {song.name}
                </p>
                <p className="text-white/60 text-sm truncate">
                  {song.artist}
                </p>
              </div>

              {/* Play button or delete hint */}
              {!editMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause(song);
                  }}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                >
                  {isCurrentSong && isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/music/LibraryView.tsx
git commit -m "feat: add LibraryView component with edit mode"
```

---

## Phase 7: Main App Integration

### Task 19: Create Main Page Component

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Create main page with tab switching**

Modify `src/app/page.tsx`:
```typescript
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Music, Heart } from "lucide-react";
import { GenreSelect } from "@/components/music/GenreSelect";
import { DiscoverView } from "@/components/music/DiscoverView";
import { LibraryView } from "@/components/music/LibraryView";

type Tab = "discover" | "library";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [selectedGenres, setSelectedGenres] = useState<string[] | null>(null);
  const [showGenreSelect, setShowGenreSelect] = useState(false);

  useEffect(() => {
    // Check if user has selected genres
    const saved = localStorage.getItem("selectedGenres");
    if (saved) {
      try {
        setSelectedGenres(JSON.parse(saved));
      } catch {
        setShowGenreSelect(true);
      }
    } else {
      setShowGenreSelect(true);
    }
  }, []);

  const handleGenreSelectComplete = (genres: string[]) => {
    setSelectedGenres(genres);
    setShowGenreSelect(false);
  };

  const handleChangeGenres = () => {
    setShowGenreSelect(true);
  };

  if (showGenreSelect || !selectedGenres) {
    return <GenreSelect onComplete={handleGenreSelectComplete} />;
  }

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-br from-purple-900 to-indigo-900">
      {/* Header */}
      <header className="safe-top">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold text-white">MusicSwipe</h1>
            <button
              onClick={handleChangeGenres}
              className="text-sm text-white/60"
            >
              {selectedGenres.length} genres selected
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 relative overflow-hidden">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === "discover" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeTab === "discover" ? 20 : -20 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          {activeTab === "discover" ? (
            <DiscoverView genres={selectedGenres} />
          ) : (
            <LibraryView />
          )}
        </motion.div>
      </main>

      {/* Tab Bar */}
      <nav className="safe-bottom">
        <div className="flex bg-black/30 backdrop-blur-xl border-t border-white/10">
          <button
            onClick={() => setActiveTab("discover")}
            className={`
              flex-1 flex flex-col items-center gap-1 py-4 transition-all
              ${activeTab === "discover" ? "text-white" : "text-white/50"}
            `}
          >
            <Music className="w-6 h-6" />
            <span className="text-xs font-medium">Discover</span>
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`
              flex-1 flex flex-col items-center gap-1 py-4 transition-all
              ${activeTab === "library" ? "text-white" : "text-white/50"}
            `}
          >
            <Heart className="w-6 h-6" />
            <span className="text-xs font-medium">Library</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
```

**Step 2: Test the app**

Run:
```bash
npm run dev
```

Visit: http://localhost:3000

Expected:
1. Genre selection screen appears
2. After selecting genres, discover view shows cards
3. Swipe gestures work
4. Tab switching works

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate all components into main page"
```

---

## Phase 8: Testing & Polish

### Task 20: Add Error Handling and Loading States

**Files:**
- Create: `src/components/ui/toaster.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Add toast notifications**

Run:
```bash
npx shadcn@latest add toaster
```

**Step 2: Update layout with toaster**

Modify `src/app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import "./globals.css";
import { AudioProvider } from "@/context/AudioContext";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "MusicSwipe - Discover Music",
  description: "Swipe to discover new music",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-hidden">
        <AudioProvider>{children}</AudioProvider>
        <Toaster />
      </body>
    </html>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/layout.tsx src/components/ui/toaster.tsx
git commit -m "feat: add toast notifications for errors"
```

---

### Task 21: Add Docker Support

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Step 1: Create Dockerfile**

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**Step 2: Create .dockerignore**

Create `.dockerignore`:
```
node_modules
.next
.git
.github
.env*.local
```

**Step 3: Update next.config.ts for standalone output**

Modify `next.config.ts`:
```typescript
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "is1-ssl.mzstatic.com",
      },
    ],
  },
};
export default nextConfig;
```

**Step 4: Commit**

```bash
git add Dockerfile .dockerignore next.config.ts
git commit -m "feat: add Docker support for deployment"
```

---

### Task 22: Create Docker Compose File (Optional)

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create docker-compose configuration**

Create `docker-compose.yml`:
```yaml
services:
  musicswipe:
    build: .
    container_name: music-swipe
    ports:
      - "3000:3000"
    volumes:
      - music-data:/app/data
    restart: unless-stopped
    environment:
      - DATABASE_URL=file:/app/data/music.db

volumes:
  music-data:
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add Docker Compose configuration"
```

---

## Phase 9: Documentation & Deployment

### Task 23: Update README

**Files:**
- Modify: `README.md`

**Step 1: Create comprehensive README**

Modify `README.md`:
```markdown
# MusicSwipe

Mobile-first music discovery app with swipe mechanics and dynamic theming.

## Features

- 🎵 Discover new music through swipe gestures
- 💾 Save liked songs to your personal library
- 🎨 Dynamic color theming based on album artwork
- 📱 Mobile-first responsive design
- 🔊 30-second audio previews
- 🎯 Filter by favorite genres

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion
- **Database**: Prisma ORM with SQLite
- **API**: iTunes Search API (no key required)

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma migrate dev

# Start dev server
npm run dev
```

Open http://localhost:3000

## Deployment

### Using Docker

```bash
# Build and run
docker build -t musicswipe .
docker run -p 3000:3000 -v music-data:/app/data musicswipe

# Or use Docker Compose
docker-compose up -d
```

## Project Structure

\`\`\`
src/
├── app/
│   ├── page.tsx              # Main app with tab switching
│   ├── layout.tsx            # Root layout with AudioProvider
│   └── api/
│       ├── discover/route.ts # Fetch songs from iTunes
│       ├── swipe/route.ts    # Record like/dislike
│       └── library/route.ts  # Library CRUD
├── components/music/         # GenreSelect, SwipeCard, DiscoverView, LibraryView
├── context/AudioContext.tsx  # Global audio player state
├── hooks/                    # use-mobile, useColorTheme, useSwipeGesture
└── lib/                      # db, itunes, utils
\`\`\`

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with project information"
```

---

## Summary

This implementation plan covers:

1. ✅ Project foundation (Next.js, TypeScript, Tailwind)
2. ✅ Database setup (Prisma + SQLite)
3. ✅ Core utilities (iTunes API, helpers)
4. ✅ Audio Context for global player state
5. ✅ Custom hooks (swipe gestures, color theming, mobile detection)
6. ✅ API routes (discover, library, swipe, color extraction)
7. ✅ UI components (GenreSelect, SwipeCard, DiscoverView, LibraryView)
8. ✅ Main app integration with tab navigation
9. ✅ Error handling and toast notifications
10. ✅ Docker deployment support
11. ✅ Documentation

**Total commits:** 23 tasks, each committed independently for easy rollback

---

**Next Steps After Implementation:**

1. Run E2E tests with Playwright
2. Deploy to production (Docker recommended)
3. Monitor performance and user engagement
4. Iterate based on feedback
