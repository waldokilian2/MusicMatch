# Fix Color Persistence in Library Tab

## Problem Statement

The background color for songs in the library tab is determined by extracting the dominant color from album artwork. While this works correctly for the current session, when users:
- Navigate away and come back
- Refresh the page
- View older songs in the library

The colors are not applied correctly - they show as clear/transparent instead of the extracted color.

## Root Cause Analysis

### Current Implementation Issues

1. **Database Schema Missing Color Field**
   - The `Song` model in `prisma/schema.prisma` does NOT have a `dominantColor` field
   - Colors are only stored in ephemeral React state

2. **Local State Only**
   - `LibraryView.tsx` stores colors in `songColors` state (line33)
   - This state is lost on page refresh or navigation

3. **API Routes Don't Handle Colors**
   - `POST /api/library` doesn't accept or save `dominantColor`
   - `POST /api/swipe` doesn't accept or save `dominantColor`
   - `GET /api/library` doesn't return `dominantColor`

4. **Color Extraction Flow**
   - `SwipeCard.tsx` extracts color when card is active (lines38-50)
   - Color is set in local state and global AudioContext
   - When liking a song, color is NOT sent to the API (DiscoverView.tsx lines66-96)
   - `LibraryView.tsx` pre-extracts colors for first 5 songs but only stores locally (lines45-54)

### Current Color Display Logic

In `LibraryView.tsx` line235:
```typescript
const songColor = songColors[song.id] || dominantColor;
```

This falls back to the global `dominantColor` when a song's color isn't found in local state, which explains why older songs show a "clear" color.

## Solution Architecture

### 1. Database Schema Changes

**File**: `prisma/schema.prisma`

Add `dominantColor` field to the Song model:
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
  dominantColor String?   @default("#6366f1")  // NEW FIELD
  likedAt       DateTime?
  dislikedAt    DateTime?
  skippedAt     DateTime?
  createdAt     DateTime  @default(now())
}
```

### 2. API Route Updates

#### A. Library API GET Route
**File**: `src/app/api/library/route.ts`

Update the GET route to include `dominantColor` in the response:
```typescript
const transformedSongs = songs.map(song => ({
  id: song.iTunesId.toString(),
  iTunesId: song.iTunesId,
  name: song.name,
  artist: song.artist,
  album: song.album,
  artworkUrl: song.artworkUrl,
  previewUrl: song.previewUrl,
  trackViewUrl: song.trackViewUrl,
  dominantColor: song.dominantColor || '#6366f1',  // NEW
  likedAt: song.likedAt?.toISOString() || null,
  dislikedAt: song.dislikedAt?.toISOString() || null,
  skippedAt: song.skippedAt?.toISOString() || null,
  createdAt: song.createdAt.toISOString()
}));
```

#### B. Library API POST Route
**File**: `src/app/api/library/route.ts`

Update the POST route to accept and save `dominantColor`:
```typescript
const { iTunesId, name, artist, album, artworkUrl, previewUrl, trackViewUrl, dominantColor } = body;

// In updateData object:
if (dominantColor) {
  updateData.dominantColor = dominantColor;
}

// In create object:
song = await db.song.create({
  data: {
    iTunesId,
    name,
    artist,
    album,
    artworkUrl,
    previewUrl,
    trackViewUrl: trackViewUrl || null,
    dominantColor: dominantColor || '#6366f1',  // NEW
    likedAt: new Date()
  }
});
```

#### C. Swipe API POST Route
**File**: `src/app/api/swipe/route.ts`

Update the POST route to accept and save `dominantColor`:
```typescript
const { iTunesId, name, artist, album, artworkUrl, previewUrl, trackViewUrl, action, dominantColor } = body;

// In updateData object:
if (dominantColor) {
  updateData.dominantColor = dominantColor;
}

// In create object:
song = await db.song.create({
  data: {
    iTunesId,
    name,
    artist,
    album,
    artworkUrl,
    previewUrl,
    trackViewUrl: trackViewUrl || null,
    dominantColor: dominantColor || '#6366f1',  // NEW
    likedAt: action === 'like' ? timestamp : null,
    dislikedAt: action === 'dislike' ? timestamp : null,
    skippedAt: action === 'skip' ? timestamp : null
  }
});
```

### 3. Frontend Component Updates

#### A. Update Song Interface
**File**: `src/context/AudioContext.tsx`

Add `dominantColor` to the Song interface:
```typescript
export interface Song {
  id: string;
  iTunesId: number;
  name: string;
  artist: string;
  album: string | null;
  artworkUrl: string;
  previewUrl: string;
  trackViewUrl?: string;
  dominantColor?: string;  // NEW
  likedAt?: string | null;
}
```

#### B. Update LibraryView Component
**File**: `src/components/music/LibraryView.tsx`

1. Use `dominantColor` from song data instead of extracting on the fly:
```typescript
const songColor = song.dominantColor || dominantColor;
```

2. Remove or simplify the color extraction logic since colors will come from the database:
   - Keep the extraction for songs that don't have a color yet
   - Extract and save to database when missing

3. Update `fetchLibrary` to save colors for songs that don't have them:
```typescript
const fetchLibrary = useCallback(async () => {
  setLoading(true);
  try {
    const res = await fetch('/api/library');
    const data = await res.json();
    setLibraryQueue(data.songs || []);
    
    // Extract and save colors for songs that don't have them
    if (data.songs && data.songs.length > 0) {
      const colors: Record<string, string> = {};
      const songsToUpdate: Array<{ id: string; color: string }> = [];
      
      for (const song of data.songs) {
        if (!song.dominantColor) {
          const color = await extractDominantColor(song.artworkUrl);
          colors[song.id] = color;
          songsToUpdate.push({ id: song.id, color });
        } else {
          colors[song.id] = song.dominantColor;
        }
      }
      
      setSongColors(colors);
      
      // Batch update songs without colors
      if (songsToUpdate.length > 0) {
        // Update songs in database (need to create an API endpoint for this)
      }
    }
  } catch (err) {
    console.error('Failed to fetch library:', err);
  } finally {
    setLoading(false);
  }
}, [setLibraryQueue]);
```

4. Update `handlePlaySong` to save color if missing:
```typescript
const handlePlaySong = useCallback((song: Song) => {
  if (currentSong?.id === song.id && isPlaying) {
    pause();
  } else if (currentSong?.id === song.id) {
    resume();
  } else {
    playSong(song, 'library');
    
    // Extract and save color if missing
    if (!song.dominantColor && !songColors[song.id]) {
      extractDominantColor(song.artworkUrl).then((color) => {
        setSongColors(prev => ({ ...prev, [song.id]: color }));
        setDominantColor(color);
        
        // Save to database
        fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            iTunesId: song.iTunesId,
            name: song.name,
            artist: song.artist,
            album: song.album,
            artworkUrl: song.artworkUrl,
            previewUrl: song.previewUrl,
            trackViewUrl: song.trackViewUrl,
            dominantColor: color
          })
        });
      });
    } else {
      const color = song.dominantColor || songColors[song.id];
      setDominantColor(color);
    }
  }
}, [currentSong, isPlaying, pause, resume, playSong, songColors, setDominantColor]);
```

#### C. Update DiscoverView Component
**File**: `src/components/music/DiscoverView.tsx`

Update `handleSwipeRight` to include the extracted color when liking a song:
```typescript
const handleSwipeRight = async (extractedColor?: string) => {
  const currentSong = discoverQueue[0];
  if (!currentSong) return;
  
  // Extract color if not provided
  let color = extractedColor;
  if (!color) {
    color = await extractDominantColor(currentSong.artworkUrl);
  }
  
  // Add to library via API with color
  try {
    await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        iTunesId: parseInt(currentSong.id, 10),
        name: currentSong.name,
        artist: currentSong.artist,
        album: currentSong.album,
        artworkUrl: currentSong.artworkUrl,
        previewUrl: currentSong.previewUrl,
        trackViewUrl: currentSong.trackViewUrl,
        dominantColor: color,  // NEW
        action: 'like'
      })
    });
    
    // Add to local library queue for immediate UI update
    addToLibraryQueue({ ...currentSong, dominantColor: color });
  } catch (err) {
    console.error('Failed to like song:', err);
  }
  
  // Move to next song
  moveToNext();
};
```

#### D. Update SwipeCard Component
**File**: `src/components/music/SwipeCard.tsx`

Pass the extracted color to the parent when swiping right:
```typescript
// Add a callback prop for when color is extracted
interface SwipeCardProps {
  song: Song;
  onSwipeLeft: () => void;
  onSwipeRight: (color?: string) => void;  // UPDATED
  isActive: boolean;
}

// Update the swipe right call in handleDragEnd
if (offsetX > 100) {
  controls.start({
    x: 500,
    opacity: 0,
    transition: { duration: 0.3 }
  }).then(() => {
    onSwipeRight(color);  // Pass the extracted color
  });
}
```

### 4. Database Migration

Create and run a Prisma migration:
```bash
bunx prisma migrate dev --name add_dominant_color_to_songs
```

This will:
1. Add the `dominantColor` column to the `Song` table
2. Set a default value of `'#6366f1'` for existing records
3. Generate the Prisma Client

### 5. Optional: Batch Update API Endpoint

Consider creating a dedicated API endpoint to batch update songs without colors:

**File**: `src/app/api/library/colors/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body; // Array of { iTunesId: number, dominantColor: string }
    
    // Batch update songs
    await Promise.all(
      updates.map(({ iTunesId, dominantColor }) =>
        db.song.update({
          where: { iTunesId },
          data: { dominantColor }
        })
      )
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating colors:', error);
    return NextResponse.json({ error: 'Failed to update colors' }, { status: 500 });
  }
}
```

## Implementation Steps

1. ✅ Add `dominantColor` field to Prisma schema
2. ✅ Create and run database migration
3. ✅ Update library API GET route to include `dominantColor` in response
4. ✅ Update library API POST route to accept and save `dominantColor`
5. ✅ Update swipe API POST route to accept and save `dominantColor`
6. ✅ Update Song interface in AudioContext to include `dominantColor`
7. ✅ Update LibraryView to use `dominantColor` from song data
8. ✅ Update LibraryView to extract and save colors when missing
9. ✅ Update DiscoverView to pass extracted color when liking songs
10. ✅ Update SwipeCard to pass extracted color to parent
11. ✅ Test color persistence across sessions

## Testing Checklist

- [ ] Verify colors are saved when liking a song in DiscoverView
- [ ] Verify colors are saved when playing a song in LibraryView
- [ ] Verify colors are retrieved correctly when loading the library
- [ ] Verify colors persist after page refresh
- [ ] Verify colors persist after navigating away and back
- [ ] Verify older songs in the library display their colors correctly
- [ ] Verify songs without colors fall back to default color
- [ ] Verify color extraction works for new songs
- [ ] Verify the batch update of existing songs without colors

## Benefits

1. **Persistent Colors**: Colors are now stored in the database and persist across sessions
2. **Better UX**: Users see consistent colors for their library songs
3. **Performance**: Colors are extracted once and reused, reducing unnecessary extractions
4. **Backward Compatible**: Existing songs without colors will fall back to a default color
5. **Scalable**: The solution works for any number of songs in the library

## Notes

- Default color: `'#6366f1'` (indigo-500) is used as fallback
- Color extraction happens on-demand for songs without colors
- The solution maintains backward compatibility with existing data
- Consider implementing a one-time batch update script to populate colors for existing library songs
