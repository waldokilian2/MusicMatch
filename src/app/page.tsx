'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Library, Heart, ChevronDown, Pencil, X } from 'lucide-react';
import { AudioProvider, useAudio } from '@/context/AudioContext';
import { DiscoverView } from '@/components/music/DiscoverView';
import { LibraryView } from '@/components/music/LibraryView';
import { GenreSelect } from '@/components/music/GenreSelect';
import { useIsMobile } from '@/hooks/use-mobile';

type Tab = 'discover' | 'library';

interface Genre {
  id: number;
  name: string;
}

const GENRE_OPTIONS: Genre[] = [
  { id: 0, name: 'All Genres' },
  { id: 14, name: 'Pop' },
  { id: 21, name: 'Rock' },
  { id: 18, name: 'Hip-Hop' },
  { id: 7, name: 'Electronic' },
  { id: 20, name: 'Alternative' },
  { id: 10, name: 'Indie' },
  { id: 15, name: 'R&B/Soul' },
  { id: 17, name: 'Dance' },
  { id: 11, name: 'Jazz' },
  { id: 6, name: 'Country' },
  { id: 12, name: 'Latin' },
  { id: 51, name: 'K-Pop' },
  { id: 24, name: 'Reggae' },
  { id: 5, name: 'Classical' },
  { id: 2, name: 'Blues' },
];

// Animated background component with smooth color transitions
function AnimatedBackground({ color }: { color: string }) {
  const isMobile = useIsMobile();
  
  // On mobile, use a simpler static background to improve performance
  if (isMobile) {
    return (
      <div 
        className="absolute inset-0"
        style={{ 
          background: `linear-gradient(135deg, ${color}dd, ${color}88, #1a1a2e)`
        }}
      />
    );
  }
  
  return (
    <>
      {/* Main gradient background with transition */}
      <motion.div 
        className="absolute inset-0 transition-all duration-1000 ease-out"
        animate={{
          background: `linear-gradient(135deg, ${color}dd, ${color}88, #1a1a2e)`
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      
      {/* Animated background shapes - only on desktop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-10"
          animate={{
            backgroundColor: color,
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            backgroundColor: { duration: 0.8, ease: 'easeOut' },
            x: { duration: 20, repeat: Infinity },
            y: { duration: 20, repeat: Infinity },
            scale: { duration: 20, repeat: Infinity }
          }}
        />
        <motion.div
          className="absolute right-0 bottom-0 w-96 h-96 rounded-full blur-3xl opacity-10"
          animate={{
            backgroundColor: color,
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ 
            backgroundColor: { duration: 0.8, ease: 'easeOut' },
            x: { duration: 25, repeat: Infinity },
            y: { duration: 25, repeat: Infinity },
            scale: { duration: 25, repeat: Infinity }
          }}
        />
        
        {/* Additional floating orb for depth */}
        <motion.div
          className="absolute left-1/4 top-1/4 w-64 h-64 rounded-full blur-3xl opacity-5"
          animate={{
            backgroundColor: color,
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ 
            backgroundColor: { duration: 0.8, ease: 'easeOut' },
            x: { duration: 15, repeat: Infinity },
            y: { duration: 15, repeat: Infinity },
          }}
        />
      </div>
    </>
  );
}

// Consolidated MainApp component - eliminates ~240 lines of duplicate code
// Accepts optional initialGenre prop for onboarding flow
interface MainAppProps {
  initialGenre?: Genre;
}

function MainApp({ initialGenre }: MainAppProps = {}) {
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [selectedGenre, setSelectedGenre] = useState<Genre>(
    initialGenre || { id: 0, name: 'All Genres' }
  );
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { dominantColor, setMode, pause, libraryQueue } = useAudio();
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowGenreDropdown(false);
      }
    };
    
    if (showGenreDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGenreDropdown]);
  
  // Pause playback when switching to library tab (only on tab change)
  useEffect(() => {
    if (activeTab === 'library') {
      pause();
    }
    setMode(activeTab);
  }, [activeTab, setMode, pause]);

  const handleChangeGenre = useCallback((genre: Genre) => {
    setSelectedGenre(genre);
    setShowGenreDropdown(false);
  }, []);
  
  // Handle edit mode toggle - clear selected songs when exiting edit mode
  const handleEditModeToggle = useCallback(() => {
    if (isEditMode) {
      // Exiting edit mode - clear selection
      setIsEditMode(false);
      setSelectedSongs(new Set());
    } else {
      // Entering edit mode
      setIsEditMode(true);
    }
  }, [isEditMode, setIsEditMode, setSelectedSongs]);
  
  // Handle tab change with edit mode reset
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setIsEditMode(false);
    setSelectedSongs(new Set());
  }, []);
  
  // Library stats - memoized to avoid recalculating on every render
  const libraryStats = useMemo(() => ({
    totalSongs: libraryQueue.length,
    uniqueArtists: new Set(libraryQueue.map(s => s.artist)).size,
  }), [libraryQueue]);
  
  return (
    <div className="h-dvh flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground color={dominantColor} />
      
      {/* Unified Header Area - Frosted glass effect */}
      <div className="fixed inset-x-0 top-0 z-20 safe-top">
        {/* Gradient backdrop for content fade */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/90 via-black/60 to-transparent pointer-events-none" />
        
        {/* Main header bar */}
        <div className="relative px-4 pt-12 pb-4">
          <div className="flex items-center justify-between">
            {/* Left: Brand */}
            <motion.div
              className="flex items-center gap-2"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-white font-semibold text-lg tracking-tight">MusicMatch</span>
            </motion.div>
            
            {/* Right: Action button */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {activeTab === 'discover' ? (
                <button
                  onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full 
                             bg-white/10 backdrop-blur-md border border-white/20
                             text-white text-sm hover:bg-white/20 transition-all duration-200"
                >
                  <span className="max-w-[100px] truncate">{selectedGenre.name}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showGenreDropdown ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button
                  onClick={handleEditModeToggle}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full 
                             backdrop-blur-md border transition-all duration-200
                             ${isEditMode 
                               ? 'bg-red-500/30 border-red-500/50 text-red-200 hover:bg-red-500/40' 
                               : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                             }`}
                >
                  {isEditMode ? (
                    <>
                      <X className="w-4 h-4" />
                      <span>Done</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </>
                  )}
                </button>
              )}
            </motion.div>
          </div>
          
          {/* Library title - shows below main header */}
          <AnimatePresence>
            {activeTab === 'library' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6"
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Your Library
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-white/60 text-sm">
                    {libraryStats.totalSongs} {libraryStats.totalSongs === 1 ? 'song' : 'songs'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="text-white/60 text-sm">
                    {libraryStats.uniqueArtists} {libraryStats.uniqueArtists === 1 ? 'artist' : 'artists'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Genre dropdown */}
        <AnimatePresence>
          {showGenreDropdown && activeTab === 'discover' && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-4 top-16 z-50 w-48 rounded-2xl overflow-hidden
                         backdrop-blur-xl bg-black/80 border border-white/20 shadow-2xl shadow-black/50"
            >
              <div className="max-h-64 overflow-y-auto py-2">
                {GENRE_OPTIONS.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => handleChangeGenre(genre)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                               ${selectedGenre?.id === genre.id 
                                 ? 'bg-white/20 text-white' 
                                 : 'text-white/60 hover:bg-white/10 hover:text-white'
                               }`}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'discover' ? (
            <motion.div
              key="discover"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DiscoverView genreId={selectedGenre.id} />
            </motion.div>
          ) : (
            <motion.div
              key="library"
              className="flex-1 flex flex-col min-h-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <LibraryView
                isEditMode={isEditMode}
                setIsEditMode={setIsEditMode}
                selectedSongs={selectedSongs}
                setSelectedSongs={setSelectedSongs}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Bottom Navigation - fixed to bottom */}
      <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-around py-3">
          <TabButton
            active={activeTab === 'discover'}
            onClick={() => handleTabChange('discover')}
            icon={<Compass className="w-5 h-5" />}
            label="Discover"
          />
          <TabButton
            active={activeTab === 'library'}
            onClick={() => handleTabChange('library')}
            icon={<Library className="w-5 h-5" />}
            label="Library"
          />
        </div>
      </nav>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${
        active ? 'text-white' : 'text-white/50'
      }`}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ scale: active ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {icon}
      </motion.div>
      <span className="text-xs font-medium">{label}</span>
      {active && (
        <motion.div
          className="absolute bottom-1 w-1 h-1 rounded-full bg-white"
          layoutId="activeTab"
        />
      )}
    </motion.button>
  );
}

function OnboardingWrapper() {
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);

  const handleGenreSelect = (genreId: number, genreName: string) => {
    setSelectedGenre({ id: genreId, name: genreName });
  };

  if (!selectedGenre) {
    return <GenreSelect onSelect={handleGenreSelect} />;
  }

  return <MainAppWrapper initialGenre={selectedGenre} />;
}

interface MainAppWrapperProps {
  initialGenre: Genre;
}

function MainAppWrapper({ initialGenre }: MainAppWrapperProps) {
  return (
    <AudioProvider>
      <MainApp initialGenre={initialGenre} />
    </AudioProvider>
  );
}

// REMOVED: MainAppWithGenre - ~240 lines of duplicate code consolidated into MainApp above
// The MainApp component now accepts an optional initialGenre prop for onboarding flow

export default function Home() {
  return <OnboardingWrapper />;
}
