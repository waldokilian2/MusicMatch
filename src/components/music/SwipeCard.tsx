'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { Heart, X, Play, Pause } from 'lucide-react';
import { Song, useAudio } from '@/context/AudioContext';
import { extractDominantColor } from '@/hooks/useColorTheme';
import { useIsMobile } from '@/hooks/use-mobile';

interface SwipeCardProps {
  song: Song;
  onSwipeLeft: () => void;
  onSwipeRight: (color?: string) => void;
  isActive: boolean;
}

export function SwipeCard({ song, onSwipeLeft, onSwipeRight, isActive }: SwipeCardProps) {
  const { currentSong, isPlaying, playSong, pause, resume, setDominantColor } = useAudio();
  const [color, setColor] = useState('#2d2d3d');
  const controls = useAnimation();
  const isMobile = useIsMobile();
  
  // Motion values for drag
  const x = useMotionValue(0);
  
  // Transform values based on drag position
  const rotate = useTransform(x, [-300, 0, 300], [-30, 0, 30]);
  const opacity = useTransform(x, [-300, -100, 0, 100, 300], [0.5, 1, 1, 1, 0.5]);
  
  // Overlay opacity based on direction
  const likeOpacity = useTransform(x, [0, 100, 200], [0, 0.5, 1]);
  const dislikeOpacity = useTransform(x, [-200, -100, 0], [1, 0.5, 0]);
  
  const isCurrentSong = currentSong?.id === song.id;
  const isThisPlaying = isCurrentSong && isPlaying;
  
  // Memoize color extraction to avoid re-extraction on re-renders
  const colorExtraction = useMemo(() => {
    return extractDominantColor(song.artworkUrl);
  }, [song.artworkUrl]);
  
  // Extract color from artwork
  useEffect(() => {
    colorExtraction.then((c) => {
      setColor(c);
      if (isActive) {
        setDominantColor(c);
      }
    });
  }, [colorExtraction, isActive, setDominantColor]);
  
  // Auto-play when this card becomes active
  useEffect(() => {
    if (isActive) {
      playSong(song, 'discover');
    }
  }, [isActive, playSong, song]);
  
  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentSong && isPlaying) {
      pause();
    } else if (isCurrentSong) {
      resume();
    } else {
      playSong(song, 'discover');
    }
  }, [isCurrentSong, isPlaying, pause, resume, playSong, song]);
  
  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number } }) => {
    const { x: offsetX } = info.offset;
    
    if (offsetX > 100) {
      // Swipe right - Like
      controls.start({
        x: 500,
        opacity: 0,
        transition: { duration: 0.3 }
      }).then(() => {
        onSwipeRight(color);
      });
    } else if (offsetX < -100) {
      // Swipe left - Dislike
      controls.start({
        x: -500,
        opacity: 0,
        transition: { duration: 0.3 }
      }).then(() => {
        onSwipeLeft();
      });
    } else {
      // Snap back
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300 } });
    }
  }, [controls, onSwipeRight, onSwipeLeft, color]);
  
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center p-3 sm:p-4"
      style={{ x, rotate, opacity }}
      drag={isActive ? 'x' : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      animate={controls}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div 
        className="relative w-full max-w-sm h-[65vh] sm:h-[70vh] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
        animate={{
          background: `linear-gradient(135deg, ${color}dd, ${color}88)`
        }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Album Art Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${song.artworkUrl})`
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        
        {/* Like/Dislike Overlays */}
        <motion.div 
          className="absolute inset-0 bg-green-500/40 flex items-center justify-center"
          style={{ opacity: likeOpacity }}
        >
          <Heart className="w-16 h-16 sm:w-24 sm:h-24 text-white fill-white" />
        </motion.div>
        
        <motion.div 
          className="absolute inset-0 bg-red-500/40 flex items-center justify-center"
          style={{ opacity: dislikeOpacity }}
        >
          <X className="w-16 h-16 sm:w-24 sm:h-24 text-white" />
        </motion.div>
        
        {/* Play/Pause Button - Top Right (only on active card) */}
        {isActive && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
            <button
              onClick={handlePlayPause}
              className="p-2.5 sm:p-3 rounded-full backdrop-blur-xl bg-black/40 
                         border border-white/20 text-white
                         flex items-center justify-center
                         hover:bg-black/60 active:scale-95 transition-all shadow-lg"
            >
              {isThisPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
              )}
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          {/* Album Art (small) */}
          <div className="flex gap-3 sm:gap-4 items-end mb-3 sm:mb-4">
            <img 
              src={song.artworkUrl} 
              alt={song.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-white text-lg sm:text-xl font-bold truncate drop-shadow-lg">
                {song.name}
              </h2>
              <p className="text-white/80 text-base sm:text-lg truncate drop-shadow-md">
                {song.artist}
              </p>
              {song.album && (
                <p className="text-white/60 text-xs sm:text-sm truncate drop-shadow-md">
                  {song.album}
                </p>
              )}
            </div>
          </div>
          
          {/* Swipe Hints */}
          <div className="flex justify-between mt-3 sm:mt-4 text-white/60 text-xs">
            <span className="flex items-center gap-1">
              <X className="w-3 h-3 sm:w-4 sm:h-4" /> Dislike
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 sm:w-4 sm:h-4" /> Like
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
