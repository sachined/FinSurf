import React from 'react';

import { type AccessMode } from '../types';
import { cn } from '../utils/cn';

interface MascotProps {
  mode: AccessMode;
  className?: string;
  isThinking?: boolean;
}

export function Mascot({ mode, className, isThinking }: MascotProps) {
  const filters = {
    default: 'none',
    colorblind: 'contrast(1.3) saturate(1.8) hue-rotate(200deg) drop-shadow(0 0 10px rgba(37, 99, 235, 0.3))',
    tropical: 'hue-rotate(-15deg) saturate(2) brightness(1.1) drop-shadow(0 0 10px rgba(255, 165, 0, 0.3))'
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl", 
      className,
      isThinking && "animate-bounce"
    )}>
      <img 
        src="https://api.dicebear.com/7.x/bottts/svg?seed=Mascot&backgroundColor=transparent" 
        alt="FINSURF Mascot"
        crossOrigin="anonymous"
        className="w-full h-full object-contain transition-all duration-500"
        style={{ filter: filters[mode] }}
      />
    </div>
  );
}
