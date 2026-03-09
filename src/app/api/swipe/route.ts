import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Record swipe action (like/dislike/skip)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { iTunesId, name, artist, album, artworkUrl, previewUrl, trackViewUrl, action, dominantColor } = body;

    // Validate required fields
    // Following best practice: validate input before processing to fail fast
    const requiredFields = ['iTunesId', 'name', 'artist', 'artworkUrl', 'previewUrl'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate action type
    if (!['like', 'dislike', 'skip'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Check if song already exists
    let song = await db.song.findUnique({
      where: { iTunesId }
    });
    
    const timestamp = new Date();
    
    if (song) {
      // Update existing song
      const updateData: Record<string, Date | null | string> = {
        likedAt: null,
        dislikedAt: null,
        skippedAt: null
      };
      
      if (action === 'like') {
        updateData.likedAt = timestamp;
      } else if (action === 'dislike') {
        updateData.dislikedAt = timestamp;
      } else {
        updateData.skippedAt = timestamp;
      }
      
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
      // Create new song
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
          likedAt: action === 'like' ? timestamp : null,
          dislikedAt: action === 'dislike' ? timestamp : null,
          skippedAt: action === 'skip' ? timestamp : null
        }
      });
    }
    
    return NextResponse.json({ success: true, song });
  } catch (error) {
    console.error('Error recording swipe:', error);
    return NextResponse.json({ error: 'Failed to record swipe', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
