import React from 'react';

export interface EastWestIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'flat' | 'tile';
  className?: string;
  title?: string;
}

export const EastWestIcon: React.FC<EastWestIconProps> = ({
  size = 'md',
  variant = 'tile',
  className = '',
  title = '동서트레일 심볼'
}) => {
  const getDimension = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs': return 16;
      case 'sm': return 24;
      case 'md': return 32;
      case 'lg': return 48;
      case 'xl': return 64;
      default: return 32;
    }
  };

  const dim = getDimension();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={dim}
      height={dim}
      fill="none"
      className={`shrink-0 select-none ${className}`}
      aria-label={title}
    >
      <title>{title}</title>

      <defs>
        {/* Material 3 Soft Elevation Shadow */}
        <filter id="ew-mat-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.4" />
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.25" />
        </filter>

        {/* Dynamic Glow for East Red & West Blue */}
        <filter id="ew-glow-red" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.45" />
        </filter>

        <filter id="ew-glow-blue" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.45" />
        </filter>

        {/* East Gradient (Vivid Taegeuk Yang: Sunrise Red / Coral) */}
        <linearGradient id="ew-grad-east" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff4365" />
          <stop offset="50%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>

        {/* West Gradient (Vivid Taegeuk Yin: Sunset Ocean / Sky Blue) */}
        <linearGradient id="ew-grad-west" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        {/* Material Tile Background */}
        <linearGradient id="ew-tile-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>
      </defs>

      {/* Optional Material Tile Frame */}
      {variant === 'tile' && (
        <>
          <rect
            x="6"
            y="6"
            width="108"
            height="108"
            rx="28"
            fill="url(#ew-tile-bg)"
            filter="url(#ew-mat-shadow)"
            stroke="#334155"
            strokeWidth="1.5"
          />
          {/* Subtle trail guide coordinate markings */}
          <circle cx="60" cy="60" r="44" stroke="#334155" strokeWidth="1" strokeDasharray="3 4" opacity="0.45" />
          <line x1="60" y1="13" x2="60" y2="19" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="60" y1="101" x2="60" y2="107" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="13" y1="60" x2="19" y2="60" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="101" y1="60" x2="107" y2="60" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </>
      )}

      {/* 
        TAEGEUK ARROW CURVES
        - Red: Sweeps from West through center up into East with East Arrowhead (➡️)
        - Blue: Sweeps from East through center down into West with West Arrowhead (⬅️)
        Combined they form the seamless harmonic S-curve of the Korean Taegeuk
      */}

      {/* 1. WEST BLUE LINE & ARROWHEAD (Pointing West/Left ⬅️) */}
      <g filter="url(#ew-glow-blue)">
        {/* Harmonic S-Curve traversing from center-right downwards to bottom-left */}
        <path
          d="M 60 60 C 78 60 90 74 84 86 C 78 98 52 98 34 86 C 26 80 20 72 20 62"
          stroke="url(#ew-grad-west)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* West Arrowhead pointing Left/Westward */}
        <path
          d="M 28 72 L 18 61 L 30 52"
          stroke="url(#ew-grad-west)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* 2. EAST RED LINE & ARROWHEAD (Pointing East/Right ➡️) */}
      <g filter="url(#ew-glow-red)">
        {/* Harmonic S-Curve traversing from center-left upwards to top-right */}
        <path
          d="M 60 60 C 42 60 30 46 36 34 C 42 22 68 22 86 34 C 94 40 100 48 100 58"
          stroke="url(#ew-grad-east)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* East Arrowhead pointing Right/Eastward */}
        <path
          d="M 92 48 L 102 59 L 90 68"
          stroke="url(#ew-grad-east)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Center Trail Hub / Landmark Marker (Taegeuk Central Core) */}
      <circle cx="60" cy="60" r="5" fill="#ffffff" filter="url(#ew-mat-shadow)" />
      <circle cx="60" cy="60" r="2.5" fill="#0f172a" />
    </svg>
  );
};
