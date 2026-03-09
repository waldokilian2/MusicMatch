'use client';

import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

export interface Song {
  id: string;
  iTunesId: number;
  name: string;
  artist: string;
  album: string | null;
  artworkUrl: string;
  previewUrl: string;
  trackViewUrl?: string;
  dominantColor?: string;
  likedAt?: string | null;
}

type PlayerMode = 'discover' | 'library';

interface AudioContextType {
  // Current playing song
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  loop: boolean;
  
  // Queue management
  discoverQueue: Song[];
  libraryQueue: Song[];
  
  // Mode
  mode: PlayerMode;
  
  // Actions
  playSong: (song: Song, mode: PlayerMode) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setLoop: (loop: boolean) => void;
  
   // Queue actions
  setDiscoverQueue: React.Dispatch<React.SetStateAction<Song[]>>;
  setLibraryQueue: React.Dispatch<React.SetStateAction<Song[]>>;
  addToLibraryQueue: (song: Song) => void;
  removeFromLibraryQueue: (songId: string) => void;
  
  // Mode
  setMode: (mode: PlayerMode) => void;
  
  // Color theme
  dominantColor: string;
  setDominantColor: (color: string) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextRef = useRef<() => void>(() => {});
  const currentSongIdRef = useRef<string | null>(null);
  
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [loop, setLoopState] = useState(true);
  
  const [discoverQueue, setDiscoverQueue] = useState<Song[]>([]);
  const [libraryQueue, setLibraryQueue] = useState<Song[]>([]);
  
  const [mode, setMode] = useState<PlayerMode>('discover');
  const [dominantColor, setDominantColor] = useState('#2d2d3d');
  
  const playSong = useCallback((song: Song, newMode: PlayerMode) => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // If same song, just resume
    if (currentSongIdRef.current === song.id && audio.paused) {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback blocked:', err);
        });
      return;
    }
    
    // If same song and playing, do nothing (let pause handle it)
    if (currentSongIdRef.current === song.id && !audio.paused) {
      return;
    }
    
    // Different song - update state immediately, then play
    currentSongIdRef.current = song.id;
    setCurrentSong(song);
    setMode(newMode);
    
    audio.src = song.previewUrl;
    audio.play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn('Playback blocked:', err);
        setIsPlaying(false);
      });
  }, []);
  
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);
  
  const resume = useCallback(() => {
    if (audioRef.current && currentSongIdRef.current) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback blocked:', err);
        });
    }
  }, []);
  
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);
  
  const next = useCallback(() => {
    const queue = mode === 'discover' ? discoverQueue : libraryQueue;
    if (!currentSong || queue.length === 0) return;
    
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % queue.length;
    
    if (queue[nextIndex]) {
      playSong(queue[nextIndex], mode);
    }
  }, [currentSong, discoverQueue, libraryQueue, mode, playSong]);
  
  useEffect(() => {
    nextRef.current = next;
  }, [next]);
  
  const previous = useCallback(() => {
    const queue = mode === 'discover' ? discoverQueue : libraryQueue;
    if (!currentSong || queue.length === 0) return;
    
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    
    if (queue[prevIndex]) {
      playSong(queue[prevIndex], mode);
    }
  }, [currentSong, discoverQueue, libraryQueue, mode, playSong]);
  
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);
  
  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolumeState(vol);
    }
  }, []);
  
  const setLoop = useCallback((shouldLoop: boolean) => {
    if (audioRef.current) {
      audioRef.current.loop = shouldLoop;
      setLoopState(shouldLoop);
    }
  }, []);
  
  const addToLibraryQueue = useCallback((song: Song) => {
    setLibraryQueue(prev => {
      if (prev.find(s => s.id === song.id)) return prev;
      return [song, ...prev];
    });
  }, []);
  
  const removeFromLibraryQueue = useCallback((songId: string) => {
    setLibraryQueue(prev => prev.filter(s => s.id !== songId));
  }, []);
  
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.loop = loop;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      if (!audio.loop) {
        nextRef.current();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [volume, loop]);
  
  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        progress,
        duration,
        volume,
        loop,
        discoverQueue,
        libraryQueue,
        mode,
        dominantColor,
        playSong,
        pause,
        resume,
        togglePlay,
        next,
        previous,
        seek,
        setVolume,
        setLoop,
        setDiscoverQueue,
        setLibraryQueue,
        addToLibraryQueue,
        removeFromLibraryQueue,
        setMode,
        setDominantColor
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
