// iTunes API utility functions
// Using iTunes Search API - free, no API key required

export interface ITunesSong {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100: string;
  previewUrl: string;
  primaryGenreName?: string;
  primaryGenreId?: number;
  trackViewUrl?: string;
  collectionViewUrl?: string;
}

export interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesSong[];
}

// iTunes genre IDs for filtering
// Official Apple genre mapping: https://affiliate.itunes.apple.com/resources/documentation/genre-mapping/
// Format: genreId: 'Genre Name'
export const GENRE_IDS: Record<number, string> = {
  // Main genres
  20: 'Alternative',
  2: 'Blues',
  22: 'Christian & Gospel',
  5: 'Classical',
  6: 'Country',
  17: 'Dance',
  7: 'Electronic',
  18: 'Hip-Hop/Rap',
  11: 'Jazz',
  12: 'Latino',
  13: 'New Age',
  14: 'Pop',
  15: 'R&B/Soul',
  24: 'Reggae',
  21: 'Rock',
  10: 'Singer/Songwriter',
  16: 'Soundtrack',
  19: 'World',
  
  // Popular subgenres
  51: 'K-Pop',           // Under Pop
  27: 'J-Pop',           // J-Pop
  50: 'Fitness & Workout',
  53: 'Instrumental',
  
  // Electronic subgenres
  1048: 'House',         // Under Dance
  1050: 'Techno',        // Under Dance
  1051: 'Trance',        // Under Dance
  
  // Rock subgenres  
  1153: 'Metal',         // Under Rock
  
  // Alternative subgenres
  100020: 'Indie Pop',   // Under Alternative
  1004: 'Indie Rock',    // Under Alternative
};

// Get all valid genre IDs as array (main genres only for "All Genres" mode)
export function getValidGenreIds(): number[] {
  // Use main genres for variety
  return [
    20,  // Alternative
    2,   // Blues
    22,  // Christian & Gospel
    5,   // Classical
    6,   // Country
    17,  // Dance
    7,   // Electronic
    18,  // Hip-Hop/Rap
    11,  // Jazz
    12,  // Latino
    14,  // Pop
    15,  // R&B/Soul
    24,  // Reggae
    21,  // Rock
    10,  // Singer/Songwriter
    51,  // K-Pop
  ];
}

// Fisher-Yates shuffle for proper randomization
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Remove duplicate songs based on trackId
export function deduplicateSongs(songs: ITunesSong[]): ITunesSong[] {
  const seen = new Set<number>();
  return songs.filter(song => {
    if (seen.has(song.trackId)) {
      return false;
    }
    seen.add(song.trackId);
    return true;
  });
}

// Fetch songs from iTunes Search API
async function searchITunes(term: string, limit: number = 50, offset: number = 0): Promise<ITunesSong[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }
    
    const data: ITunesSearchResponse = await response.json();
    
    // Filter songs that have all required fields
    return data.results.filter(song => 
      song.previewUrl && 
      song.artworkUrl100 &&
      song.trackId &&
      song.trackName &&
      song.artistName
    );
  } catch (error) {
    console.error('Error fetching from iTunes:', error);
    return [];
  }
}

// Check if a song matches the target genre by ID
function songMatchesGenreId(song: ITunesSong, targetGenreId: number): boolean {
  // Direct match on primaryGenreId
  if (song.primaryGenreId === targetGenreId) {
    return true;
  }
  
  // For subgenres, check if the song's genre is a child of the target
  // iTunes returns the specific genre ID, not parent
  const targetGenreName = GENRE_IDS[targetGenreId];
  if (targetGenreName && song.primaryGenreName) {
    const songGenreLower = song.primaryGenreName.toLowerCase();
    const targetGenreLower = targetGenreName.toLowerCase();
    
    // Handle variations and partial matches
    if (songGenreLower.includes(targetGenreLower) || targetGenreLower.includes(songGenreLower)) {
      return true;
    }
    
    // Special cases for common variations
    const genreVariations: Record<string, string[]> = {
      'hip-hop/rap': ['hip-hop', 'rap', 'hip hop'],
      'r&b/soul': ['r&b', 'soul', 'r and b'],
      'singer/songwriter': ['singer-songwriter', 'folk', 'acoustic'],
      'latino': ['latin', 'spanish', 'reggaeton'],
      'electronic': ['edm', 'electronica', 'dance'],
      'alternative': ['indie', 'alt'],
    };
    
    const variations = genreVariations[targetGenreLower];
    if (variations) {
      for (const variation of variations) {
        if (songGenreLower.includes(variation)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Fetch songs from a specific genre by genre ID
export async function fetchByGenre(genreId: number, limit: number = 50, offset: number = 0): Promise<ITunesSong[]> {
  const genreName = GENRE_IDS[genreId] || 'music';
  
  // Fetch more songs than needed so we can filter
  const fetchLimit = limit * 4;
  const songs = await searchITunes(genreName, fetchLimit, offset);
  
  // Filter to only songs matching the target genre
  const filteredSongs = songs.filter(song => songMatchesGenreId(song, genreId));
  
  // Remove duplicates, shuffle and return the requested number
  return shuffleArray(deduplicateSongs(filteredSongs)).slice(0, limit);
}

// Fetch songs from multiple genres for "All Genres" mode
export async function fetchAllGenres(totalLimit: number = 50): Promise<ITunesSong[]> {
  const allGenreIds = getValidGenreIds();
  
  // Shuffle and pick 5 random genres
  const selectedGenreIds = shuffleArray(allGenreIds).slice(0, 5);
  
  // Calculate songs per genre
  const songsPerGenre = Math.ceil(totalLimit / 5) + 5;
  
  // Fetch from each genre with random offset
  const fetchPromises = selectedGenreIds.map(genreId => {
    const randomOffset = Math.floor(Math.random() * 100);
    return fetchByGenre(genreId, songsPerGenre, randomOffset);
  });
  
  const results = await Promise.all(fetchPromises);
  
  // Combine all results
  const allSongs: ITunesSong[] = [];
  results.forEach(songs => {
    allSongs.push(...songs);
  });
  
  // Deduplicate, shuffle the combined results, and return
  return shuffleArray(deduplicateSongs(allSongs)).slice(0, totalLimit);
}

// Get high resolution artwork URL
export function getHighResArtwork(url: string): string {
  return url.replace('100x100', '600x600');
}
