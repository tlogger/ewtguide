import React from 'react';
import { ArrowLeft, Compass, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  currentStep: 'list' | 'detail' | 'map';
  onNavigate: (step: 'list' | 'detail' | 'map') => void;
  title?: string;
  completedCount?: number;
  totalCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onNavigate,
  title,
  completedCount = 0,
  totalCount = 32
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
            <Compass className="w-7 h-7 text-emerald-300" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-tight">
                {title || '동서트레일 가이드'}
              </h1>
              {currentStep === 'list' && (
                <span className="text-xs text-emerald-200">
                  총 32개 개통 구간 종합 안내
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Completion badge */}
        <div className="flex items-center gap-2">
          <div className="bg-emerald-700/80 border border-emerald-600 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>완주: {completedCount}/{totalCount}</span>
          </div>
        </div>
      </div>

      {/* 3-Step Navigation Bar */}
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
            <span>구간 목록</span>
          </button>
          <span className="text-emerald-500">➔</span>
          <button
            onClick={() => {
              if (currentStep !== 'list') onNavigate('detail');
            }}
            disabled={currentStep === 'list'}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-full transition-all ${
              currentStep === 'detail'
                ? 'bg-emerald-500 text-white font-bold shadow-xs'
                : currentStep === 'map'
                ? 'text-emerald-200 hover:text-white'
                : 'text-emerald-600 cursor-not-allowed'
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
            disabled={currentStep === 'list'}
            className={`flex items-center gap-1.5 py-1 px-3 rounded-full transition-all ${
              currentStep === 'map'
                ? 'bg-emerald-500 text-white font-bold shadow-xs'
                : currentStep === 'detail'
                ? 'text-emerald-200 hover:text-white'
                : 'text-emerald-600 cursor-not-allowed'
            }`}
          >
            <span>3</span>
            <span>전체 지도</span>
          </button>
        </div>
      </div>
    </header>
  );
};
