import React from 'react';
import { Navigation, X, AlertTriangle, Crosshair, Maximize2, FileText } from 'lucide-react';
import type { NavigationState, SectionSummary } from '../../types';

interface NavigationHudProps {
  navState: NavigationState | null;
  currentSection: SectionSummary | null;
  isFollowingGps: boolean;
  onOpenSectionDetail: (sectionId: number) => void;
  onClearTarget: () => void;
  onFitRoute: () => void;
  onRecenterGps: () => void;
}

function formatEta(minutes: number): string {
  if (minutes <= 0) return '0분';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? (m > 0 ? `약 ${h}시간 ${m}분` : `약 ${h}시간`) : `약 ${m}분`;
}

export const NavigationHud: React.FC<NavigationHudProps> = ({
  navState,
  currentSection,
  isFollowingGps,
  onOpenSectionDetail,
  onClearTarget,
  onFitRoute,
  onRecenterGps,
}) => {
  const offTrailM = navState?.current.offTrailM ?? 0;
  const isOffTrail = offTrailM > 50;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-2.5 z-20 px-3 flex flex-col gap-2 max-w-2xl mx-auto">
      {/* Row 1: Current Section Chip + Off-Trail Badge + Recenter */}
      <div className="flex items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-1.5 min-w-0">
          {currentSection && (
            <button
              type="button"
              onClick={() => onOpenSectionDetail(currentSection.section_id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 shadow-lg backdrop-blur-md text-xs sm:text-sm font-black cursor-pointer truncate"
              title="현재 구간 상세 보기"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">
                {currentSection.section_number} ({currentSection.region.split(/[,\s]+/)[0]})
              </span>
              <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </button>
          )}

          {navState && (
            <span
              className={`px-2.5 py-1.5 rounded-full text-xs font-black shadow-lg backdrop-blur-md border shrink-0 ${
                isOffTrail
                  ? 'bg-rose-600/95 text-white border-rose-400'
                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isOffTrail ? `이탈 ${offTrailM}m` : `코스 내 (${offTrailM}m)`}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRecenterGps}
          className={`pointer-events-auto p-2 rounded-full shadow-lg border backdrop-blur-md transition-colors cursor-pointer ${
            isFollowingGps
              ? 'bg-emerald-600 text-white border-emerald-400'
              : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
          title="내 위치로 복귀"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Row 2: Active Destination Navigation Card */}
      {navState?.target && (
        <div className="pointer-events-auto bg-slate-900/92 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-3 text-white shadow-xl flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-black truncate">
                {navState.target.label}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 shrink-0">
                {navState.direction === 'east' ? '서→동' : '동→서'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onFitRoute}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="경로 전체 보기"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClearTarget}
                className="p-1 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-200 cursor-pointer"
                title="목적지 해제"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs sm:text-sm">
            <span className="font-black text-emerald-300">
              트레일 {navState.trailDistanceKm.toFixed(1)} km
            </span>
            {navState.approachDistanceM > 0 && (
              <span className="font-bold text-amber-300">
                + 합류 {navState.approachDistanceM >= 1000
                  ? `${(navState.approachDistanceM / 1000).toFixed(1)} km`
                  : `${navState.approachDistanceM} m`}
              </span>
            )}
            <span className="font-bold text-slate-200">{formatEta(navState.etaMinutes)}</span>
          </div>

          {navState.unopenedSectionIds.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 rounded-lg px-2 py-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                미개통 구간 {navState.unopenedSectionIds.length}개 포함 (
                {navState.unopenedSectionIds.slice(0, 4).join(', ')}
                {navState.unopenedSectionIds.length > 4 ? '…' : ''}구간 · 추정 거리)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
