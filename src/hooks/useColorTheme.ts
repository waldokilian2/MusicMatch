'use client';

import { useEffect, useState } from 'react';

interface RGB {
  r: number;
  g: number;
  b: number;
}

// Extract dominant color from image
export function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve('#6366f1');
        return;
      }
      
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      
      const imageData = ctx.getImageData(0, 0, 50, 50).data;
      const colors: RGB[] = [];
      
      // Sample pixels
      for (let i = 0; i < imageData.length; i += 16) {
        colors.push({
          r: imageData[i],
          g: imageData[i + 1],
          b: imageData[i + 2]
        });
      }
      
      // Find dominant color using simple averaging
      const avgColor = colors.reduce(
        (acc, color) => ({
          r: acc.r + color.r,
          g: acc.g + color.g,
          b: acc.b + color.b
        }),
        { r: 0, g: 0, b: 0 }
      );
      
      const count = colors.length;
      const r = Math.round(avgColor.r / count);
      const g = Math.round(avgColor.g / count);
      const b = Math.round(avgColor.b / count);
      
      // Convert to hex
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      resolve(hex);
    };
    
    img.onerror = () => resolve('#6366f1');
    img.src = imageUrl;
  });
}

// Hook to use extracted color
// Following React best practice: use cleanup flag to prevent race conditions
// and state updates on unmounted components
export function useColorTheme(imageUrl: string | null) {
  const [color, setColor] = useState('#6366f1');

  useEffect(() => {
    if (!imageUrl) return;

    // Use cleanup flag to prevent state updates after component unmount
    // and prevent race conditions when imageUrl changes rapidly
    let cancelled = false;

    extractDominantColor(imageUrl).then((extractedColor) => {
      if (!cancelled) {
        setColor(extractedColor);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return color;
}

// Convert hex to RGB
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 99, g: 102, b: 241 };
}

// Create gradient from color
export function createGradient(baseColor: string): { start: string; end: string } {
  const rgb = hexToRgb(baseColor);
  const darkerR = Math.max(0, rgb.r - 40);
  const darkerG = Math.max(0, rgb.g - 40);
  const darkerB = Math.max(0, rgb.b - 40);
  
  const darker = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
  
  return {
    start: baseColor,
    end: darker
  };
}
