'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';

interface Genre {
  id: number;
  name: string;
  emoji: string;
}

const GENRES: Genre[] = [
  { id: 14, name: 'Pop', emoji: '🎤' },
  { id: 21, name: 'Rock', emoji: '🎸' },
  { id: 18, name: 'Hip-Hop', emoji: '🎤' },
  { id: 7, name: 'Electronic', emoji: '🎹' },
  { id: 20, name: 'Alternative', emoji: '🌙' },
  { id: 10, name: 'Indie', emoji: '🌿' },
  { id: 15, name: 'R&B/Soul', emoji: '💜' },
  { id: 17, name: 'Dance', emoji: '💃' },
  { id: 11, name: 'Jazz', emoji: '🎷' },
  { id: 6, name: 'Country', emoji: '🤠' },
  { id: 12, name: 'Latin', emoji: '🔥' },
  { id: 51, name: 'K-Pop', emoji: '⭐' },
  { id: 24, name: 'Reggae', emoji: '🏝️' },
  { id: 5, name: 'Classical', emoji: '🎻' },
  { id: 2, name: 'Blues', emoji: '🎵' },
  { id: 1050, name: 'Techno', emoji: '🎧' },
];

// Genre-specific colors for card backgrounds
const GENRE_COLORS: Record<number, string> = {
  14: '#ec4899', // Pop - pink
  21: '#ef4444', // Rock - red
  18: '#8b5cf6', // Hip-Hop - purple
  7: '#06b6d4',  // Electronic - cyan
  20: '#6366f1', // Alternative - indigo
  10: '#22c55e', // Indie - green
  15: '#a855f7', // R&B/Soul - violet
  17: '#f59e0b', // Dance - amber
  11: '#f97316', // Jazz - orange
  6: '#eab308',  // Country - yellow
  12: '#ef4444', // Latin - red
  51: '#ec4899', // K-Pop - pink
  24: '#14b8a6', // Reggae - teal
  5: '#6366f1',  // Classical - indigo
  2: '#3b82f6',  // Blues - blue
  1050: '#8b5cf6', // Techno - purple
};

interface GenreSelectProps {
  onSelect: (genreId: number, genreName: string) => void;
}

export function GenreSelect({ onSelect }: GenreSelectProps) {
  // Default vibrant color for startup
  const defaultColor = '#ec4899'; // Pink to match brand
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Simple muted background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#0f0f1a]" />
      
      {/* Subtle color wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5" />

      {/* Header with gradient overlay */}
      <div className="flex-shrink-0 relative">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        <div className="pt-12 pb-6 px-6 text-center relative">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Brand logo - matches main app header */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">MusicMatch</h1>
            </div>
            <p className="text-white/80 text-lg font-medium mb-2">What are you in the mood for?</p>
            <p className="text-white/50 text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              Pick a genre to start discovering
            </p>
          </motion.div>
        </div>
      </div>

      {/* Genre Grid - Scrollable for mobile */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 max-w-lg mx-auto"
        >
          {GENRES.map((genre, index) => {
            const genreColor = GENRE_COLORS[genre.id] || defaultColor;
            
            return (
              <motion.button
                key={genre.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.03 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(genre.id, genre.name)}
                className="relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl 
                           backdrop-blur-md border border-white/10
                           hover:border-white/30 transition-all duration-200 text-center
                           min-h-[80px] sm:min-h-[100px] overflow-hidden group"
              >
                {/* Color tint background */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-25 group-hover:opacity-40 transition-opacity duration-200"
                  style={{ 
                    background: `linear-gradient(135deg, ${genreColor}70, ${genreColor}30)`,
                  }}
                />
                
                {/* Content */}
                <span className="text-2xl sm:text-3xl mb-1 relative z-10">{genre.emoji}</span>
                <span className="text-white font-medium text-xs sm:text-sm relative z-10">{genre.name}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Skip option - Fixed at bottom */}
      <div className="flex-shrink-0 pb-8 pt-4 text-center relative">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={() => onSelect(0, 'All Genres')}
          className="relative text-white/50 hover:text-white/90 text-sm transition-colors px-6 py-3 
                     rounded-full bg-white/5 backdrop-blur-md border border-white/10
                     hover:bg-white/10 hover:border-white/20"
        >
          Show me everything
        </motion.button>
      </div>
    </div>
  );
}
