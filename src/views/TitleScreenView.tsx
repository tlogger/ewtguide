import React, { useState } from 'react';
import { Map, List, LogIn, User } from 'lucide-react';
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
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center select-none relative overflow-hidden sm:p-4">
      {/* Modern Deep Ambient Glow */}
      <div className="absolute inset-0 bg-radial from-emerald-950/20 via-slate-950/80 to-slate-950 pointer-events-none z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-72 bg-emerald-500/10 blur-3xl pointer-events-none z-0" />

      {/* Main Full-Screen (Mobile) & Card (Desktop) Map Artwork Container */}
      <main className="relative z-10 w-full h-screen sm:h-auto sm:max-w-md mx-auto flex flex-col items-center justify-center">
        <div className="relative w-full h-full sm:h-auto sm:rounded-3xl overflow-hidden shadow-2xl border-0 sm:border border-slate-800/80 bg-slate-950 flex flex-col">
          
          {/* Entire Title Image (Covers full screen on mobile, fit card on tablet/desktop) */}
          <div className="relative w-full h-full min-h-screen sm:min-h-0 flex-1 flex items-center justify-center bg-slate-950">
            <img
              src={`${import.meta.env.BASE_URL}images/title_screen.jpg`}
              alt="동서트레일 (서해의 노을, 동해의 일출)"
              className="w-full h-full min-h-screen sm:min-h-0 max-h-screen sm:max-h-[82vh] object-cover sm:object-contain object-center sm:object-top block"
            />

            {/* 1. Login / Account Avatar Button Embedded INSIDE Title Image (Top Right) */}
            {onOpenAuth && (
              <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="p-1.5 sm:p-2 bg-slate-950/80 hover:bg-slate-900/95 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/70 rounded-2xl shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-2"
                    title={`${currentUser.name || currentUser.email} (${currentUser.provider}) 계정 관리`}
                  >
                    {currentUser.profile_image ? (
                      <img
                        src={currentUser.profile_image}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover ring-2 ring-emerald-400/80"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-emerald-600/40 flex items-center justify-center border border-emerald-500/50">
                        <User className="w-4 h-4 text-emerald-400" />
                      </div>
                    )}
                    <span className="text-xs font-bold text-slate-200 pr-1 hidden sm:inline max-w-[90px] truncate">
                      {currentUser.name || '내 계정'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-900/95 backdrop-blur-md border border-slate-700/80 hover:border-emerald-500/70 rounded-2xl py-2 px-3.5 text-xs font-extrabold text-white shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="로그인"
                  >
                    <LogIn className="w-4 h-4 text-emerald-400" />
                    <span>로그인</span>
                  </button>
                )}
              </div>
            )}

            {/* 2. Embedded Bottom Action Controls & Skip Checkbox INSIDE Title Image Overlay */}
            <div className="absolute inset-x-0 bottom-0 pt-10 pb-5 px-4 sm:px-5 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent flex flex-col gap-3 z-20">
              {/* Action Buttons: '구간 목록' 및 '전체 지도' */}
              <div className="flex flex-row items-center gap-2.5">
                <button
                  onClick={() => handleStart('list')}
                  className="flex-1 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-1.5 border border-emerald-400/40 transition-all cursor-pointer backdrop-blur-md"
                >
                  <List className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-100" />
                  <span>구간 목록</span>
                </button>

                <button
                  onClick={() => handleStart('map')}
                  className="flex-1 py-3 sm:py-3.5 bg-slate-900/90 hover:bg-slate-800/95 active:scale-98 text-amber-300 rounded-2xl font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-1.5 border border-amber-500/40 transition-all cursor-pointer backdrop-blur-md"
                >
                  <Map className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  <span>전체 지도</span>
                </button>
              </div>

              {/* 3. '다음 접속 시...' 체크박스 INSIDE Image Container */}
              <div className="flex items-center justify-center pt-1 text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200 py-1 px-3 rounded-full bg-slate-900/60 backdrop-blur-xs border border-slate-800/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-medium text-[11px] sm:text-xs text-slate-300">
                    다음 접속 시 목록으로 바로 이동
                  </span>
                </label>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};
