import React from 'react';
import { ArrowLeft, Compass, CheckCircle2, Map } from 'lucide-react';

interface HeaderProps {
  currentStep: 'list' | 'detail' | 'map' | 'all_map';
  onNavigate: (step: 'list' | 'detail' | 'map' | 'all_map') => void;
  title?: string;
  completedCount?: number;
  totalCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onNavigate,
  title,
  completedCount = 0,
  totalCount = 55
}) => {
  return (
    <header className="sticky top-0 z-40 bg-emerald-800 text-white shadow-md">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentStep !== 'list' && (
            <button
              onClick={() => {
                if (currentStep === 'map') onNavigate('detail');
                else onNavigate('list');
              }}
              className="p-2 -ml-2 rounded-full hover:bg-emerald-700 active:bg-emerald-900 transition-colors"
              aria-label="이전 화면으로 이동"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <Compass className="w-7 h-7 text-emerald-300 shrink-0" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-tight">
                {title || '동서트레일 가이드'}
              </h1>
              {currentStep === 'list' && (
                <span className="text-xs text-emerald-200">
                  총 55개 구간 (개통 32 · 미개통 23) 종합 안내
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action & Completion badge */}
        <div className="flex items-center gap-2">
          {/* Quick All-Course Map Button */}
          <button
            onClick={() => onNavigate(currentStep === 'all_map' ? 'list' : 'all_map')}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-bold border transition-all active:scale-95 ${
              currentStep === 'all_map'
                ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-md ring-2 ring-amber-300/50'
                : 'bg-emerald-700/80 hover:bg-emerald-600 border-emerald-600 text-white shadow-xs'
            }`}
            title="서해(태안)~동해(울진) 55개 전 구간 전국 대지도"
          >
            <Map className="w-4 h-4 text-amber-300" />
            <span className="font-extrabold">전국 대지도</span>
          </button>

          <div className="hidden xs:flex bg-emerald-700/80 border border-emerald-600 px-3 py-1.5 rounded-full items-center gap-1.5 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>완주: {completedCount}/{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-emerald-900/60 px-4 py-2 border-t border-emerald-700/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs sm:text-sm font-semibold">
          <button
            onClick={() => onNavigate('list')}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-full transition-all ${
              currentStep === 'list'
                ? 'bg-emerald-500 text-white font-bold shadow-xs'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            <span>1</span>
            <span>구간 목록 (55)</span>
          </button>

          <span className="text-emerald-500">➔</span>

          <button
            onClick={() => {
              if (currentStep !== 'list' && currentStep !== 'all_map') onNavigate('detail');
            }}
            disabled={currentStep === 'list' || currentStep === 'all_map'}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-full transition-all ${
              currentStep === 'detail'
                ? 'bg-emerald-500 text-white font-bold shadow-xs'
                : currentStep === 'map'
                ? 'text-emerald-200 hover:text-white'
                : 'text-emerald-600 cursor-not-allowed opacity-60'
            }`}
          >
            <span>2</span>
            <span>구간 상세</span>
          </button>

          <span className="text-emerald-500">➔</span>

          <button
            onClick={() => {
              if (currentStep === 'detail' || currentStep === 'map') onNavigate('map');
            }}
            disabled={currentStep === 'list' || currentStep === 'all_map'}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-full transition-all ${
              currentStep === 'map'
                ? 'bg-emerald-500 text-white font-bold shadow-xs'
                : currentStep === 'detail'
                ? 'text-emerald-200 hover:text-white'
                : 'text-emerald-600 cursor-not-allowed opacity-60'
            }`}
          >
            <span>3</span>
            <span>구간 지도</span>
          </button>

          <span className="text-emerald-500 hidden sm:inline">|</span>

          <button
            onClick={() => onNavigate('all_map')}
            className={`hidden sm:flex items-center gap-1.5 py-1 px-3 rounded-full transition-all ${
              currentStep === 'all_map'
                ? 'bg-amber-400 text-slate-900 font-extrabold shadow-xs'
                : 'text-amber-300 hover:text-white'
            }`}
          >
            <span>🗺️ 전국 코스</span>
          </button>
        </div>
      </div>
    </header>
  );
};
