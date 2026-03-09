'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Music2 } from 'lucide-react';
import { SwipeCard } from './SwipeCard';
import { Song, useAudio } from '@/context/AudioContext';

interface DiscoverViewProps {
  genreId: number;
}

export function DiscoverView({ genreId }: DiscoverViewProps) {
  const { discoverQueue, setDiscoverQueue, addToLibraryQueue } = useAudio();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevGenreIdRef = useRef<number | null>(null);
  
  // Fetch songs from API with genre filter
  const fetchSongs = useCallback(async (genre: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = genre > 0 
        ? `/api/discover?genreId=${genre}` 
        : '/api/discover';
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.songs && data.songs.length > 0) {
        setDiscoverQueue(data.songs);
      } else {
        setError('No more songs to discover');
        setDiscoverQueue([]);
      }
    } catch (err) {
      setError('Failed to load songs');
      console.error(err);
      setDiscoverQueue([]);
    } finally {
      setLoading(false);
    }
  }, [setDiscoverQueue]);

  // Initial fetch - only runs once on mount
  useEffect(() => {
    // Only fetch if queue is empty or genre changed
    if (discoverQueue.length === 0 || prevGenreIdRef.current === null) {
      prevGenreIdRef.current = genreId;
      fetchSongs(genreId);
    } else {
      setLoading(false);
    }
  }, [discoverQueue.length, genreId, fetchSongs]);
  
  // Refetch when genre changes
  useEffect(() => {
    if (prevGenreIdRef.current !== null && prevGenreIdRef.current !== genreId) {
      prevGenreIdRef.current = genreId;
      fetchSongs(genreId);
    }
  }, [genreId, fetchSongs]);
  
  // Handle swipe right (like)
  const handleSwipeRight = async (extractedColor?: string) => {
    const currentSong = discoverQueue[0];
    if (!currentSong) return;
    
    // Extract color if not provided
    let color = extractedColor;
    if (!color) {
      const { extractDominantColor } = await import('@/hooks/useColorTheme');
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
          dominantColor: color,
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
  
  // Handle swipe left (dislike)
  const handleSwipeLeft = async () => {
    const currentSong = discoverQueue[0];
    if (!currentSong) return;
    
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
          action: 'dislike'
        })
      });
    } catch (err) {
      console.error('Failed to dislike song:', err);
    }
    
    moveToNext();
  };
  
  const moveToNext = () => {
    setDiscoverQueue(prev => prev.slice(1));
  };
  
  // Load more when running low (use current genre)
  useEffect(() => {
    if (!loading && discoverQueue.length > 0 && discoverQueue.length <= 3) {
      const url = genreId > 0 
        ? `/api/discover?genreId=${genreId}` 
        : '/api/discover';
        
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.songs && data.songs.length > 0) {
            // Filter out duplicates before appending
            setDiscoverQueue(prev => {
              const existingIds = new Set(prev.map(s => s.id));
              const newSongs = data.songs.filter((s: Song) => !existingIds.has(s.id));
              return [...prev, ...newSongs];
            });
          }
        })
        .catch(console.error);
    }
  }, [discoverQueue.length, genreId, loading, setDiscoverQueue]);
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Music2 className="w-12 h-12 text-white/60" />
        </motion.div>
      </div>
    );
  }
  
  if (error || discoverQueue.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-white/60 text-center">{error || 'No more songs!'}</p>
        <button
          onClick={() => fetchSongs(genreId)}
          className="px-6 py-3 rounded-full backdrop-blur-md bg-white/20 
                     border border-white/30 text-white font-medium
                     flex items-center gap-2 hover:bg-white/30 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }
  
  // Show top 3 cards (for stack effect)
  const visibleCards = discoverQueue.slice(0, 3).reverse();
  
  return (
    <div className="flex-1 relative overflow-hidden">
      <AnimatePresence mode="popLayout">
        {visibleCards.map((song, index) => (
          <SwipeCard
            key={song.id}
            song={song}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            isActive={index === visibleCards.length - 1}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
