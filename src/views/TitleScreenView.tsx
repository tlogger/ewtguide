import React, { useState } from 'react';
import { Compass, Map, List, ChevronRight, CheckCircle2, Mountain } from 'lucide-react';

interface TitleScreenViewProps {
  onStartList: () => void;
  onOpenMap: () => void;
  totalDistance?: string;
  totalSections?: number;
  openedSectionsCount?: number;
}

export const TitleScreenView: React.FC<TitleScreenViewProps> = ({
  onStartList,
  onOpenMap,
  totalDistance = '867.1',
  totalSections = 55,
  openedSectionsCount = 32
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
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-between p-4 sm:p-6 select-none relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-900/60 to-stone-950/95 pointer-events-none z-0" />

      {/* Top Header Branding */}
      <header className="relative z-10 w-full max-w-md mx-auto text-center pt-2 pb-1">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-400/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-300 backdrop-blur-md mb-2">
          <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" />
          <span>대한민국 횡단 국토 대장정 트레일 가이드</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-amber-100 drop-shadow-md">
          東 西 트 레 일
        </h1>
        <p className="text-xs sm:text-sm font-medium text-stone-300 mt-1">
          서해의 노을에서 동해의 일출까지 (태안 ~ 울진 849km)
        </p>
      </header>

      {/* Main Parchment Map Artwork Card */}
      <main className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto my-3 flex flex-col items-center">
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-600/40 bg-stone-950 group">
          <img
            src={`${import.meta.env.BASE_URL}images/title_screen.jpg`}
            alt="동서트레일 타이틀 지도 (서해의 노을, 동해의 일출)"
            className="w-full h-auto max-h-[58vh] object-cover object-center transform group-hover:scale-102 transition-transform duration-700"
          />

          {/* Gradient Overlay at bottom of artwork */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-950 via-stone-950/70 to-transparent flex flex-col justify-end p-4">
            <div className="flex items-center justify-between text-xs text-amber-200/90 font-bold">
              <span>🌊 서해 태안 안면도</span>
              <span>➔</span>
              <span>속리산·문경새재</span>
              <span>➔</span>
              <span>🌅 동해 울진 망양정</span>
            </div>
          </div>
        </div>

        {/* Trail Statistics Bar */}
        <div className="w-full grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="bg-stone-800/80 backdrop-blur-md rounded-2xl p-2.5 border border-stone-700/60 shadow-md">
            <span className="text-[10px] text-stone-400 block font-medium">총 코스 연장</span>
            <strong className="text-base font-black text-amber-300">{totalDistance} km</strong>
          </div>
          <div className="bg-stone-800/80 backdrop-blur-md rounded-2xl p-2.5 border border-stone-700/60 shadow-md">
            <span className="text-[10px] text-stone-400 block font-medium">전체 구간</span>
            <strong className="text-base font-black text-white">{totalSections}개 구간</strong>
          </div>
          <div className="bg-stone-800/80 backdrop-blur-md rounded-2xl p-2.5 border border-stone-700/60 shadow-md">
            <span className="text-[10px] text-stone-400 block font-medium">개통 현황</span>
            <strong className="text-base font-black text-emerald-400">개통 {openedSectionsCount}개</strong>
          </div>
        </div>
      </main>

      {/* Bottom Action Area */}
      <footer className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto space-y-2.5 pb-2">
        <button
          onClick={() => handleStart('list')}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 border border-emerald-400/40 transition-all"
        >
          <List className="w-5 h-5 text-emerald-200" />
          <span>동서트레일 55개 코스 둘러보기</span>
          <ChevronRight className="w-5 h-5 text-emerald-200" />
        </button>

        <button
          onClick={() => handleStart('map')}
          className="w-full py-3.5 bg-stone-800/90 hover:bg-stone-700/90 active:scale-98 text-amber-300 rounded-2xl font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 border border-amber-500/40 transition-all"
        >
          <Map className="w-4 h-4 text-amber-400" />
          <span>🗺️ 전국 55개 코스 대지도 바로보기</span>
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
            <span>다음 접속 시 구간 목록으로 바로 이동</span>
          </label>
        </div>
      </footer>
    </div>
  );
};
