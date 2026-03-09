import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH - Update only the dominant color for a song
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { dominantColor } = body;

    if (!dominantColor) {
      return NextResponse.json({ error: 'dominantColor is required' }, { status: 400 });
    }

    // Find song by iTunesId
    const song = await db.song.findFirst({
      where: { iTunesId: parseInt(id, 10) }
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Update only the dominantColor
    const updatedSong = await db.song.update({
      where: { id: song.id },
      data: { dominantColor }
    });

    return NextResponse.json({ song: updatedSong });
  } catch (error) {
    console.error('Error updating color:', error);
    return NextResponse.json({ error: 'Failed to update color' }, { status: 500 });
  }
}
