import React from 'react';
import { ArrowLeft, Compass, CheckCircle2, Map } from 'lucide-react';

interface HeaderProps {
  currentStep: 'title' | 'list' | 'detail' | 'map' | 'all_map';
  onNavigate: (step: 'title' | 'list' | 'detail' | 'map' | 'all_map') => void;
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
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentStep !== 'list' && (
            <button
              onClick={() => {
                if (currentStep === 'map') onNavigate('detail');
                else onNavigate('list');
              }}
              className="p-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer"
              aria-label="이전 화면으로 이동"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => onNavigate('title')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            title="타이틀 스크린 (동서트레일 일러스트) 보기"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:border-emerald-400 transition-colors">
              <Compass className="w-5 h-5 text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight leading-tight group-hover:text-emerald-300 transition-colors">
                {title || '동서트레일 가이드'}
              </h1>
              {currentStep === 'list' && (
                <span className="text-[11px] text-slate-400">
                  총 55개 구간 (개통 32 · 미개통 23)
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
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-bold border transition-all active:scale-95 cursor-pointer ${
              currentStep === 'all_map'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="서해(태안)~동해(울진) 55개 전 구간 전체 지도"
          >
            <Map className="w-4 h-4 text-emerald-400" />
            <span>전체 지도</span>
          </button>

          <div className="hidden xs:flex bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl items-center gap-1.5 text-xs font-semibold text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>완주: {completedCount}/{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Navigation Step Indicator (3 steps: 구간 -> 상세 -> 지도) */}
      <div className="bg-slate-950/60 px-4 py-1.5 border-t border-slate-800/60">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4 text-xs font-semibold">
          <button
            onClick={() => onNavigate('list')}
            className={`flex items-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer ${
              currentStep === 'list'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>구간</span>
          </button>

          <span className="text-slate-600">›</span>

          <button
            onClick={() => {
              if (currentStep !== 'list' && currentStep !== 'all_map') onNavigate('detail');
            }}
            disabled={currentStep === 'list' || currentStep === 'all_map'}
            className={`flex items-center gap-1 py-1 px-3 rounded-lg transition-all ${
              currentStep === 'detail'
                ? 'bg-emerald-600 text-white font-bold shadow-xs cursor-pointer'
                : currentStep === 'map'
                ? 'text-slate-300 hover:text-white cursor-pointer'
                : 'text-slate-600 cursor-not-allowed opacity-40'
            }`}
          >
            <span>상세</span>
          </button>

          <span className="text-slate-600">›</span>

          <button
            onClick={() => {
              if (currentStep === 'detail' || currentStep === 'map') onNavigate('map');
            }}
            disabled={currentStep === 'list' || currentStep === 'all_map'}
            className={`flex items-center gap-1 py-1 px-3 rounded-lg transition-all ${
              currentStep === 'map'
                ? 'bg-emerald-600 text-white font-bold shadow-xs cursor-pointer'
                : currentStep === 'detail'
                ? 'text-slate-300 hover:text-white cursor-pointer'
                : 'text-slate-600 cursor-not-allowed opacity-40'
            }`}
          >
            <span>지도</span>
          </button>
        </div>
      </div>
    </header>
  );
};
