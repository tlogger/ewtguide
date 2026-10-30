import React, { useState } from 'react';
import { Map, List, LogIn, LogOut, User } from 'lucide-react';
import { UserAccount } from '../types';

interface TitleScreenViewProps {
  onStartList: () => void;
  onOpenMap: () => void;
  totalDistance?: string;
  totalSections?: number;
  openedSectionsCount?: number;
  currentUser?: UserAccount | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
}

export const TitleScreenView: React.FC<TitleScreenViewProps> = ({
  onStartList,
  onOpenMap,
  currentUser = null,
  onOpenAuth,
  onSignOut
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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-3 sm:p-5 select-none relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-stone-900/70 to-stone-950 pointer-events-none z-0" />

      {/* Top Right Auth Status Button on Title Screen */}
      {onOpenAuth && (
        <div className="absolute top-4 right-4 sm:top-5 sm:right-6 z-30">
          {currentUser ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="p-1 sm:p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl shadow-xl transition-all cursor-pointer hover:scale-105"
              title={`${currentUser.name || currentUser.email} (${currentUser.provider}) 계정 관리`}
            >
              {currentUser.profile_image ? (
                <img
                  src={currentUser.profile_image}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-400/60"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600/30 flex items-center justify-center border border-emerald-500/50">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl py-2 px-3 text-xs font-bold text-slate-200 shadow-xl transition-all cursor-pointer"
              title="로그인"
            >
              <LogIn className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">로그인</span>
            </button>
          )}
        </div>
      )}

      {/* Main Parchment Map Artwork Card with Embedded Actions */}
      <main className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center">
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-stone-700/60 bg-stone-950 group">
          {/* Entire Title Image without top cropping */}
          <img
            src={`${import.meta.env.BASE_URL}images/title_screen.jpg`}
            alt="동서트레일 (서해의 노을, 동해의 일출)"
            className="w-full h-auto max-h-[82vh] object-contain object-top block mx-auto"
          />

          {/* Embedded Bottom Action Card Overlay: '코스 보기'와 '전체 지도' 한 줄 배치 */}
          <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 bg-gradient-to-t from-stone-950/95 via-stone-950/80 to-transparent flex flex-row items-center gap-2.5 z-20">
            <button
              onClick={() => handleStart('list')}
              className="flex-1 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-1.5 border border-emerald-400/40 transition-all cursor-pointer backdrop-blur-md"
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
              <span>코스 보기</span>
            </button>

            <button
              onClick={() => handleStart('map')}
              className="flex-1 py-3 sm:py-3.5 bg-stone-900/90 hover:bg-stone-800/95 active:scale-98 text-amber-300 rounded-2xl font-black text-sm sm:text-base shadow-lg flex items-center justify-center gap-1.5 border border-amber-500/40 transition-all cursor-pointer backdrop-blur-md"
            >
              <Map className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span>전체 지도</span>
            </button>
          </div>
        </div>

        {/* Skip checkbox */}
        <div className="flex items-center justify-center gap-2 pt-3 text-xs text-stone-400">
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
      </main>
    </div>
  );
};
