import React from 'react';

interface MapScaleBarProps {
  level: number;
  className?: string;
}

// Approximate ground distance corresponding to a ~50px scale bar in Korea (lat ~36.5 deg)
// Kakao Map Zoom Level to Ground Distance per ~50px
const LEVEL_DISTANCES: { [key: number]: string } = {
  1: '20m',
  2: '30m',
  3: '50m',
  4: '100m',
  5: '250m',
  6: '500m',
  7: '1km',
  8: '2km',
  9: '4km',
  10: '8km',
  11: '16km',
  12: '32km',
  13: '64km',
  14: '128km'
};

export const MapScaleBar: React.FC<MapScaleBarProps> = ({ level, className = '' }) => {
  const distText = LEVEL_DISTANCES[level] || (level <= 1 ? '20m' : '128km');

  return (
    <div
      className={`bg-slate-900/85 backdrop-blur-md text-white px-2.5 py-1 rounded-xl shadow-lg border border-slate-700/60 flex items-center gap-1.5 text-[11px] font-mono font-bold select-none pointer-events-none ${className}`}
      title={`축척: 약 ${distText}`}
    >
      <div className="w-9 h-1.5 border-b-2 border-l-2 border-r-2 border-amber-300" />
      <span className="text-amber-200">{distText}</span>
    </div>
  );
};
