import React, { useState } from 'react';
import { ExperienceType } from '../types.ts';
import { TYPE_CONFIG } from '../constants.tsx';

interface StampProps {
  type: ExperienceType;
  size?: 'sm' | 'md' | 'lg' | 'xs';
  date?: string;
  isGrayscale?: boolean;
}

export const Stamp: React.FC<StampProps> = ({ type, size = 'md', date, isGrayscale }) => {
  const [imageError, setImageError] = useState(false);
  const config = TYPE_CONFIG[type];
  
  if (!config) return null;

  const sizeClasses = {
    xs: 'w-10 h-10',
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-44 h-44',
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center transition-all hover:scale-105 active:scale-95`}>
      <div 
        className={`w-full h-full relative z-10 transition-all duration-500 ${isGrayscale ? 'grayscale opacity-30 brightness-150' : 'drop-shadow-[6px_6px_0px_rgba(0,0,0,0.1)]'}`}
      >
        {!imageError ? (
          <img 
            src={config.image} 
            alt={`${type} stamp`} 
            className="w-full h-full object-contain pointer-events-none block"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full rounded-full border-4 border-black bg-white flex items-center justify-center overflow-hidden p-2 text-center" style={{ borderColor: config.color }}>
             <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase leading-tight line-clamp-2">{type}</span>
                <span className="text-xl">📍</span>
             </div>
          </div>
        )}
      </div>

      {date && !isGrayscale && size !== 'sm' && size !== 'xs' && (
        <div className="absolute -bottom-1 z-20 bg-black text-white px-2 py-0.5 rounded border border-white text-[9px] font-black uppercase tracking-widest rotate-[-1deg] whitespace-nowrap shadow-sm">
          {new Date(date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
        </div>
      )}
    </div>
  );
};