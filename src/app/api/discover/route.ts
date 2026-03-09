import { NextRequest, NextResponse } from 'next/server';
import { fetchAllGenres, fetchByGenre, shuffleArray } from '@/lib/itunes';

export async function GET(request: NextRequest) {
  try {
    // Get genreId from query params
    const { searchParams } = new URL(request.url);
    const genreId = searchParams.get('genreId');

    // Validate genreId if provided
    if (genreId !== null) {
      const parsedId = parseInt(genreId, 10);
      if (isNaN(parsedId) || parsedId < 0) {
        return NextResponse.json(
          { error: 'Invalid genreId' },
          { status: 400 }
        );
      }
    }

    let itunesSongs;
    
    if (genreId && parseInt(genreId, 10) > 0) {
      // Fetch from specific genre
      const id = parseInt(genreId, 10);
      const randomOffset = Math.floor(Math.random() * 100);
      itunesSongs = await fetchByGenre(id, 50, randomOffset);
    } else {
      // Fetch from multiple genres (all genres mode)
      itunesSongs = await fetchAllGenres(50);
    }
    
    // Shuffle the results for extra randomness
    const shuffledSongs = shuffleArray(itunesSongs);
    
    // Transform for response
    const songs = shuffledSongs.slice(0, 20).map(song => ({
      id: song.trackId.toString(),
      iTunesId: song.trackId,
      name: song.trackName,
      artist: song.artistName,
      album: song.collectionName || null,
      artworkUrl: song.artworkUrl100.replace('100x100', '600x600'),
      previewUrl: song.previewUrl,
      trackViewUrl: song.trackViewUrl || song.collectionViewUrl || `https://music.apple.com/us/song/${song.trackId}`
    }));
    
    return NextResponse.json({ songs });
  } catch (error) {
    console.error('Error in discover API:', error);
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }
}
