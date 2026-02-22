import React from 'react';

import { type AccessMode } from '../types';
import { cn } from '../utils/cn';

interface MascotProps {
  mode: AccessMode;
  className?: string;
}

export function Mascot({ mode, className }: MascotProps) {
  const filters = {
    default: 'none',
    colorblind: 'contrast(1.5) saturate(2) hue-rotate(200deg)',
    tropical: 'hue-rotate(45deg) saturate(1.5) brightness(1.1)'
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
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
