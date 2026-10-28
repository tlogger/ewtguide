import React, { useState } from 'react';
import { Map, List, ChevronRight } from 'lucide-react';

interface TitleScreenViewProps {
  onStartList: () => void;
  onOpenMap: () => void;
  totalDistance?: string;
  totalSections?: number;
  openedSectionsCount?: number;
}

export const TitleScreenView: React.FC<TitleScreenViewProps> = ({
  onStartList,
  onOpenMap
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleStart = (action: 'list' | 'map') => {
    if (dontShowAgain) {
      localStorage.setItem('ewtguide_skip_title', 'true');
    }
    if (action === 'list') onStartList();
    else onOpenMap();
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-900/60 to-stone-950/95 pointer-events-none z-0" />

      {/* Main Parchment Map Artwork Card */}
      <main className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center">
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-600/40 bg-stone-950 group">
          <img
            src={`${import.meta.env.BASE_URL}images/title_screen.jpg`}
            alt="동서트레일 타이틀 지도 (서해의 노을, 동해의 일출)"
            className="w-full h-auto max-h-[70vh] object-cover object-center transform group-hover:scale-102 transition-transform duration-700"
          />
        </div>
      </main>

      {/* Bottom Action Area */}
      <footer className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto space-y-2.5 pt-4 pb-2">
        <button
          onClick={() => handleStart('list')}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 border border-emerald-400/40 transition-all cursor-pointer"
        >
          <List className="w-5 h-5 text-emerald-200" />
          <span>코스 보기</span>
          <ChevronRight className="w-5 h-5 text-emerald-200" />
        </button>

        <button
          onClick={() => handleStart('map')}
          className="w-full py-3 bg-stone-800/90 hover:bg-stone-700/90 active:scale-98 text-amber-300 rounded-2xl font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 border border-amber-500/40 transition-all cursor-pointer"
        >
          <Map className="w-4 h-4 text-amber-400" />
          <span>전체 코스 보기</span>
        </button>

        {/* Skip checkbox */}
        <div className="flex items-center justify-center gap-2 pt-1 text-xs text-stone-400">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-stone-300">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-stone-800 border-stone-600 text-emerald-600 focus:ring-0 cursor-pointer"
            />
            <span>다음 접속 시 목록으로 바로 이동</span>
          </label>
        </div>
      </footer>
    </div>
  );
};
