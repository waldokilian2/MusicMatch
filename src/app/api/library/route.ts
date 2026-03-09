import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch liked songs
export async function GET() {
  try {
    const songs = await db.song.findMany({
      where: {
        likedAt: { not: null }
      },
      orderBy: {
        likedAt: 'desc'
      }
    });
    
    // Transform dates to strings for frontend and ensure consistent ID
    const transformedSongs = songs.map(song => ({
      id: song.iTunesId.toString(), // Use iTunesId as id for consistency with discover API
      iTunesId: song.iTunesId,
      name: song.name,
      artist: song.artist,
      album: song.album,
      artworkUrl: song.artworkUrl,
      previewUrl: song.previewUrl,
      trackViewUrl: song.trackViewUrl,
      dominantColor: song.dominantColor || '#6366f1',
      likedAt: song.likedAt?.toISOString() || null,
      dislikedAt: song.dislikedAt?.toISOString() || null,
      skippedAt: song.skippedAt?.toISOString() || null,
      createdAt: song.createdAt.toISOString()
    }));
    
    return NextResponse.json({ songs: transformedSongs });
  } catch (error) {
    console.error('Error fetching library:', error);
    return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 });
  }
}

// POST - Add song to library
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { iTunesId, name, artist, album, artworkUrl, previewUrl, trackViewUrl, dominantColor } = body;

    // Validate required fields
    const requiredFields = ['iTunesId', 'name', 'artist', 'artworkUrl', 'previewUrl'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Check if song already exists
    let song = await db.song.findUnique({
      where: { iTunesId }
    });
    
    if (song) {
      // Update existing song to be liked
      const updateData: Record<string, Date | null | string> = {
        likedAt: new Date(),
        dislikedAt: null,
        skippedAt: null
      };
      
      // Update trackViewUrl if provided
      if (trackViewUrl) {
        updateData.trackViewUrl = trackViewUrl;
      }
      
      // Update dominantColor if provided
      if (dominantColor) {
        updateData.dominantColor = dominantColor;
      }
      
      song = await db.song.update({
        where: { iTunesId },
        data: updateData
      });
    } else {
      // Create new song as liked
      song = await db.song.create({
        data: {
          iTunesId,
          name,
          artist,
          album,
          artworkUrl,
          previewUrl,
          trackViewUrl: trackViewUrl || null,
          dominantColor: dominantColor || '#6366f1',
          likedAt: new Date()
        }
      });
    }
    
    return NextResponse.json({ song });
  } catch (error) {
    console.error('Error adding to library:', error);
    return NextResponse.json({ error: 'Failed to add song' }, { status: 500 });
  }
}

// DELETE - Remove song from library
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Song ID required' }, { status: 400 });
    }
    
    // Find song by iTunesId (id is passed as iTunesId string from frontend)
    const song = await db.song.findFirst({
      where: { iTunesId: parseInt(id, 10) }
    });
    
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
    
    // Set likedAt to null instead of deleting
    const updatedSong = await db.song.update({
      where: { id: song.id },
      data: { likedAt: null }
    });
    
    return NextResponse.json({ song: updatedSong });
  } catch (error) {
    console.error('Error removing from library:', error);
    return NextResponse.json({ error: 'Failed to remove song' }, { status: 500 });
  }
}
