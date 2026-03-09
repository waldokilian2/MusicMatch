'use client';

import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Play, Pause, Trash2, Music2, Pencil, X, ExternalLink, Sparkles, Disc3 } from 'lucide-react';
import { Song, useAudio } from '@/context/AudioContext';
import { extractDominantColor } from '@/hooks/useColorTheme';
import { useIsMobile } from '@/hooks/use-mobile';

interface LibraryViewProps {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  selectedSongs: Set<string>;
  setSelectedSongs: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export function LibraryView({ isEditMode, setIsEditMode, selectedSongs, setSelectedSongs }: LibraryViewProps) {
  const { 
    libraryQueue, 
    setLibraryQueue, 
    currentSong, 
    isPlaying, 
    playSong, 
    pause,
    resume,
    removeFromLibraryQueue,
    dominantColor,
    setDominantColor
  } = useAudio();
  
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [songColors, setSongColors] = useState<Record<string, string>>({});
  const DEFAULT_COLOR = '#6366f1';

  // Save color to database using the PATCH endpoint
  const saveColorToDatabase = useCallback(async (songId: string, color: string) => {
    try {
      await fetch(`/api/library/${songId}/color`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dominantColor: color })
      });
    } catch (err) {
      console.error('Failed to save color:', err);
    }
  }, []);

  // Fetch library from API
  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/library');
      const data = await res.json();
      setLibraryQueue(data.songs || []);

      // Extract and save colors for songs that have the default color
      if (data.songs && data.songs.length > 0) {
        const colors: Record<string, string> = {};

        // Process all songs - extract colors for those with default color
        for (const song of data.songs) {
          if (song.dominantColor && song.dominantColor !== DEFAULT_COLOR) {
            // Song has a real color, use it
            colors[song.id] = song.dominantColor;
          } else {
            // Song has default color, extract real color and save to database
            const color = await extractDominantColor(song.artworkUrl);
            colors[song.id] = color;
            // Save to database in background
            saveColorToDatabase(song.id, color);
          }
        }

        setSongColors(colors);
      }
    } catch (err) {
      console.error('Failed to fetch library:', err);
    } finally {
      setLoading(false);
    }
  }, [setLibraryQueue, saveColorToDatabase]);
  
  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);
  
  // Extract color on demand when a song is played
  useEffect(() => {
    if (currentSong && isPlaying && !songColors[currentSong.id]) {
      const needsExtraction = !currentSong.dominantColor || currentSong.dominantColor === DEFAULT_COLOR;
      if (needsExtraction) {
        extractDominantColor(currentSong.artworkUrl).then((color) => {
          setSongColors(prev => ({ ...prev, [currentSong.id!]: color }));
          setDominantColor(color);
          // Save to database
          saveColorToDatabase(currentSong.id!, color);
        });
      } else {
        setDominantColor(currentSong.dominantColor);
      }
    } else if (currentSong && isPlaying) {
      const color = songColors[currentSong.id] || currentSong.dominantColor;
      if (color && color !== DEFAULT_COLOR) {
        setDominantColor(color);
      }
    }
  }, [currentSong, isPlaying, songColors, setDominantColor, saveColorToDatabase]);
  
  const handlePlaySong = useCallback((song: Song) => {
    if (currentSong?.id === song.id && isPlaying) {
      pause();
    } else if (currentSong?.id === song.id) {
      resume();
    } else {
      playSong(song, 'library');
      // Extract and set color immediately when playing
      const needsExtraction = !song.dominantColor || song.dominantColor === DEFAULT_COLOR;
      if (needsExtraction && !songColors[song.id]) {
        extractDominantColor(song.artworkUrl).then((color) => {
          setSongColors(prev => ({ ...prev, [song.id]: color }));
          setDominantColor(color);
          // Save to database
          saveColorToDatabase(song.id, color);
        });
      } else {
        const color = songColors[song.id] || song.dominantColor;
        if (color) {
          setDominantColor(color);
        }
      }
    }
  }, [currentSong, isPlaying, pause, resume, playSong, songColors, setDominantColor, saveColorToDatabase]);
  
  const handleToggleSelect = useCallback((songId: string) => {
    setSelectedSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  }, [setSelectedSongs]);
  
  const handleRemoveSelected = useCallback(async () => {
    try {
      // Remove all selected songs
      await Promise.all(
        Array.from(selectedSongs).map(id => 
          fetch(`/api/library?id=${id}`, { method: 'DELETE' })
        )
      );
      
      // Update local state
      selectedSongs.forEach(id => removeFromLibraryQueue(id));
      
      // Clear selection and exit edit mode
      setSelectedSongs(new Set());
      setIsEditMode(false);
    } catch (err) {
      console.error('Failed to remove songs:', err);
    }
  }, [selectedSongs, removeFromLibraryQueue, setSelectedSongs, setIsEditMode]);
  
  const handleCancelEdit = useCallback(() => {
    setSelectedSongs(new Set());
    setIsEditMode(false);
  }, [setSelectedSongs, setIsEditMode]);
  
  const getAppleMusicUrl = useCallback((song: Song) => {
    // Use the stored trackViewUrl if available
    if (song.trackViewUrl) {
      return song.trackViewUrl;
    }
    // Fallback to constructing from iTunes ID
    return `https://music.apple.com/us/song/${song.iTunesId}`;
  }, []);

  // Library stats - memoized to avoid recalculating on every render
  const libraryStats = useMemo(() => ({
    totalSongs: libraryQueue.length,
    uniqueArtists: new Set(libraryQueue.map(s => s.artist)).size,
  }), [libraryQueue]);

  // Loading state - Premium skeleton loader
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-xl opacity-40" />
          <Disc3 className="w-16 h-16 text-white/80 relative z-10" />
        </motion.div>
        <div className="text-center">
          <p className="text-white/80 font-medium">Loading your library</p>
          <p className="text-white/40 text-sm mt-1">Finding your favorite tracks...</p>
        </div>
      </div>
    );
  }

  // Empty state - Premium illustration
  if (libraryQueue.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative"
        >
          {/* Glowing background */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-full blur-3xl scale-150" />
          
          {/* Main icon container */}
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-white/10 to-white/5 
                          backdrop-blur-xl border border-white/10 flex items-center justify-center
                          shadow-2xl shadow-purple-500/10">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Heart className="w-14 h-14 text-white/30" strokeWidth={1.5} />
            </motion.div>
          </div>
          
          {/* Decorative floating elements */}
          <motion.div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500"
            animate={{ y: [-5, 5, -5], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-3 -left-3 w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500"
            animate={{ y: [5, -5, 5], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
        </motion.div>
        
        <div className="text-center space-y-3 max-w-xs">
          <h3 className="text-xl font-semibold text-white">Your Library Awaits</h3>
          <p className="text-white/50 text-sm leading-relaxed">
            Start building your personal collection by swiping right on songs you love
          </p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-white/60 text-sm">Discover new music to add</span>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 sm:px-6 pt-48 pb-36 space-y-2 h-full min-h-0">
        <AnimatePresence mode="popLayout">
          {libraryQueue.map((song, index) => {
            const isCurrentSong = currentSong?.id === song.id;
            const isThisPlaying = isCurrentSong && isPlaying;
            const isSelected = selectedSongs.has(song.id);
            const songColor = songColors[song.id] || song.dominantColor || dominantColor;
            
            // Remove staggered delays on mobile for better performance
            const animationDelay = isMobile ? 0 : index * 0.03;
            // Reduce equalizer bars on mobile (8 instead of 16)
            const equalizerBars = isMobile ? 8 : 16;
            
            return (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, scale: 0.8 }}
                transition={{ 
                  delay: animationDelay,
                  layout: { duration: 0.3 }
                }}
                onClick={() => isEditMode && handleToggleSelect(song.id)}
                className={`group relative flex items-center gap-4 p-3 rounded-2xl 
                           backdrop-blur-xl border cursor-pointer overflow-hidden transition-all
                           ${isEditMode ? 'pl-8' : ''} 
                           ${isSelected 
                             ? 'bg-red-500/20 border-red-500/40' 
                             : 'border-white/10 hover:brightness-125'
                           }`}
              >
                {/* Darkened album art color background */}
                {!isSelected && (
                  <div 
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ 
                      background: `linear-gradient(135deg, ${songColor}40, ${songColor}20)`,
                    }}
                  />
                )}
                {/* Selection indicator (Edit Mode) */}
                {isEditMode && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full 
                               border-2 transition-all duration-200 flex items-center justify-center
                               ${isSelected 
                                 ? 'bg-red-500 border-red-500' 
                                 : 'border-white/30 bg-transparent'
                               }`}
                  >
                    {isSelected && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </motion.svg>
                    )}
                  </motion.div>
                )}

                {/* Album Art Container */}
                <div className="relative flex-shrink-0">
                  {/* Glow effect for playing song */}
                  {isThisPlaying && (
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      animate={{ 
                        boxShadow: [
                          '0 0 15px rgba(255, 255, 255, 0.3)',
                          '0 0 25px rgba(255, 255, 255, 0.5)',
                          '0 0 15px rgba(255, 255, 255, 0.3)'
                        ]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  
                  {/* Album Art */}
                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden
                                  ${isEditMode && isSelected ? 'opacity-60' : ''}`}>
                    <img 
                      src={song.artworkUrl} 
                      alt={song.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0 py-1">
                  <h3 className={`font-semibold text-[15px] sm:text-base truncate text-white
                                 ${isSelected ? 'text-red-200' : ''}`}>
                    {song.name}
                  </h3>
                  <p className={`text-sm truncate mt-0.5
                                ${isSelected ? 'text-red-300/70' : 'text-white/50'}`}>
                    {song.artist}
                  </p>
                  {song.album && (
                    <p className="text-xs text-white/30 truncate mt-1 hidden sm:block">
                      {song.album}
                    </p>
                  )}
                </div>

                {/* Action Buttons - Only show when not in edit mode */}
                {!isEditMode && (
                  <div className="flex items-center gap-1 pr-1">
                    {/* Play/Pause Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySong(song);
                      }}
                      className="p-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                      title={isThisPlaying ? "Pause preview" : "Play 30s preview"}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </motion.button>
                    
                    {/* Apple Music Link */}
                    <motion.a
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      href={getAppleMusicUrl(song)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-3 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 
                                 hover:text-white/80 transition-all duration-200"
                      title="Open in Apple Music"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </motion.a>
                  </div>
                )}
                
                {/* Full-width Equalizer Bars - only show when playing */}
                {isThisPlaying && !isEditMode && (
                  <div className="absolute bottom-0 left-0 right-0 h-2 flex items-end gap-[3px] overflow-hidden rounded-b-2xl px-1 pb-1">
                    {Array.from({ length: equalizerBars }).map((_, bar) => (
                      <motion.div
                        key={bar}
                        className="flex-1 rounded-sm"
                        animate={{ 
                          height: ['20%', '100%', '40%', '90%', '25%', '80%', '20%'],
                          backgroundColor: songColor
                        }}
                        transition={{ 
                          height: {
                            duration: 0.8, 
                            repeat: Infinity, 
                            delay: bar * 0.05,
                            ease: 'easeInOut'
                          },
                          backgroundColor: { duration: 0.4, ease: 'easeOut' }
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Edit Mode Bottom Bar - Modern Design */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 sm:bottom-24 left-4 right-4 z-50"
          >
            <div className="backdrop-blur-2xl bg-black/90 
                            rounded-2xl border border-white/10 p-3 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{selectedSongs.size}</span>
                  </div>
                  <span className="text-white font-medium text-sm">Selected</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (selectedSongs.size === libraryQueue.length) {
                        setSelectedSongs(new Set());
                      } else {
                        setSelectedSongs(new Set(libraryQueue.map(s => s.id)));
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white
                               text-sm font-medium hover:bg-white/20 transition-colors min-w-[100px] whitespace-nowrap"
                  >
                    {selectedSongs.size === libraryQueue.length ? 'Deselect' : 'Select All'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRemoveSelected}
                    disabled={selectedSongs.size === 0}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white
                               text-sm font-medium hover:bg-red-600 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed
                               flex items-center gap-1.5 min-w-[80px]"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
