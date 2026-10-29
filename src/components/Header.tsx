import React from 'react';
import { Compass, List, MapPin, FileText, Map, LogIn, LogOut, User } from 'lucide-react';
import { UserAccount } from '../types';

interface HeaderProps {
  currentStep: 'title' | 'list' | 'detail' | 'map' | 'all_map';
  onNavigate: (step: 'title' | 'list' | 'detail' | 'map' | 'all_map') => void;
  sectionNumber?: string;
  completedCount?: number;
  totalCount?: number;
  currentUser?: UserAccount | null;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onNavigate,
  sectionNumber,
  currentUser = null,
  onOpenAuth
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-sm select-none">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left Title Area (Single Row) */}
        <div className="flex items-center gap-2.5">
          {currentStep === 'list' && (
            <div
              onClick={() => onNavigate('title')}
              className="flex items-center gap-2.5 cursor-pointer group"
              title="타이틀 스크린 보기"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:border-emerald-400 transition-colors">
                <Compass className="w-5 h-5 text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight group-hover:text-emerald-300 transition-colors">
                동서트레일 가이드
              </h1>
            </div>
          )}

          {(currentStep === 'detail' || currentStep === 'map') && (
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {sectionNumber || '동서트레일'}
              </h1>
            </div>
          )}

          {currentStep === 'all_map' && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Map className="w-4 h-4 text-emerald-400" />
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                전체 지도
              </h1>
            </div>
          )}
        </div>

        {/* Right Action Icons (Single Row) */}
        <div className="flex items-center gap-2">
          {/* Main List Screen: only '전체 지도' */}
          {currentStep === 'list' && (
            <button
              onClick={() => onNavigate('all_map')}
              className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="동서트레일 55개 전 구간 전체 지도"
            >
              <Map className="w-4 h-4 text-emerald-400" />
              <span>전체 지도</span>
            </button>
          )}

          {/* Section Detail Screen: [구간], [지도], [전체 지도] */}
          {currentStep === 'detail' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onNavigate('list')}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                title="구간 목록으로 이동"
              >
                <List className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">구간</span>
              </button>

              <button
                onClick={() => onNavigate('map')}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border border-emerald-500 text-white flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                title="구간 지도 보기"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">지도</span>
              </button>

              <button
                onClick={() => onNavigate('all_map')}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                title="전체 지도 보기"
              >
                <Map className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">전체 지도</span>
              </button>
            </div>
          )}

          {/* Trail Map Screen: [구간], [상세], [전체 지도] */}
          {currentStep === 'map' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onNavigate('list')}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                title="구간 목록으로 이동"
              >
                <List className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">구간</span>
              </button>

              <button
                onClick={() => onNavigate('detail')}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                title="구간 상세 정보 보기"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">상세</span>
              </button>

              <button
                onClick={() => onNavigate('all_map')}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                title="전체 지도 보기"
              >
                <Map className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">전체 지도</span>
              </button>
            </div>
          )}

          {/* All Map Screen: [구간] */}
          {currentStep === 'all_map' && (
            <button
              onClick={() => onNavigate('list')}
              className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="구간 목록으로 돌아가기"
            >
              <List className="w-4 h-4 text-emerald-400" />
              <span>구간 목록</span>
            </button>
          )}

          {/* 6. 화면 상단 타이틀 바에 항상 '로그인'/'로그아웃' 아이콘 표시 */}
          {onOpenAuth && (
            <div className="pl-1 border-l border-slate-800/80">
              {currentUser ? (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 active:bg-emerald-800 border border-emerald-600/70 text-emerald-300 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  title={`${currentUser.name} (${currentUser.provider}) - 로그아웃`}
                >
                  {currentUser.profile_image ? (
                    <img
                      src={currentUser.profile_image}
                      alt={currentUser.name || ''}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="hidden sm:inline truncate max-w-[70px]">{currentUser.name}</span>
                  <LogOut className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="로그인 / 회원가입"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">로그인</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
