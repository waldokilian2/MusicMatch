'use client';

import { useCallback, useRef, useState } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | null;

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  threshold?: number;
}

interface SwipeGestureState {
  translateX: number;
  translateY: number;
  rotation: number;
  isDragging: boolean;
  direction: SwipeDirection;
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const { onSwipeLeft, onSwipeRight, onSwipeUp, threshold = 100 } = options;

  const [state, setState] = useState<SwipeGestureState>({
    translateX: 0,
    translateY: 0,
    rotation: 0,
    isDragging: false,
    direction: null
  });

  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  // Use ref to track isDragging without causing stale closures in callbacks
  // Following React best practice: use refs for values accessed in event handlers
  const isDraggingRef = useRef(false);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    startPos.current = { x: clientX, y: clientY };
    currentPos.current = { x: clientX, y: clientY };
    isDraggingRef.current = true;
    setState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;

    currentPos.current = { x: clientX, y: clientY };

    const deltaX = currentPos.current.x - startPos.current.x;
    const deltaY = currentPos.current.y - startPos.current.y;

    // Calculate rotation based on horizontal drag
    const rotation = deltaX * 0.1;

    // Determine direction
    let direction: SwipeDirection = null;
    if (Math.abs(deltaX) > threshold) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else if (deltaY < -threshold) {
      direction = 'up';
    }

    setState({
      translateX: deltaX,
      translateY: deltaY,
      rotation,
      isDragging: true,
      direction
    });
  }, [threshold]);

  const handleEnd = useCallback(() => {
    if (!isDraggingRef.current) return;

    const { translateX, translateY } = state;

    if (translateX > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (translateX < -threshold && onSwipeLeft) {
      onSwipeLeft();
    } else if (translateY < -threshold && onSwipeUp) {
      onSwipeUp();
    }

    // Reset state
    isDraggingRef.current = false;
    setState({
      translateX: 0,
      translateY: 0,
      rotation: 0,
      isDragging: false,
      direction: null
    });
  }, [state, threshold, onSwipeLeft, onSwipeRight, onSwipeUp]);
  
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);
  
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);
  
  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);
  
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);
  
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);
  
  const onMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);
  
  const onMouseLeave = useCallback(() => {
    if (isDraggingRef.current) {
      handleEnd();
    }
  }, [handleEnd]);
  
  return {
    ...state,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave
    }
  };
}
