import React, { useMemo } from 'react';
import { WifiOff, Compass, Navigation, RefreshCw, MapPin } from 'lucide-react';
import type { NavigationState, POI, SectionSummary } from '../../types';
import { getBearing, getBearingDirectionText, getDistanceMeters } from '../../utils/trailMath';

interface OfflineHudViewProps {
  gpsPos: { lat: number; lng: number } | null;
  navState: NavigationState | null;
  currentSection: SectionSummary | null;
  allPois: POI[];
  onRetryOnline: () => void;
  onSelectPoiTarget: (poi: POI) => void;
  onOpenSectionDetail: (sectionId: number) => void;
}

function formatEta(minutes: number): string {
  if (minutes <= 0) return '0분';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? (m > 0 ? `약 ${h}시간 ${m}분` : `약 ${h}시간`) : `약 ${m}분`;
}

export const OfflineHudView: React.FC<OfflineHudViewProps> = ({
  gpsPos,
  navState,
  currentSection,
  allPois,
  onRetryOnline,
  onSelectPoiTarget,
  onOpenSectionDetail,
}) => {
  const trailReturnDirection = useMemo(() => {
    if (!gpsPos || !navState?.current?.snappedPoint) return null;
    const bearing = getBearing(
      gpsPos.lat,
      gpsPos.lng,
      navState.current.snappedPoint.lat,
      navState.current.snappedPoint.lng
    );
    return { bearing, ...getBearingDirectionText(bearing) };
  }, [gpsPos, navState]);

  const nearbyPois = useMemo(() => {
    const ref = gpsPos || navState?.current?.snappedPoint;
    if (!ref) return [];
    return allPois
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number' && !p.is_deleted)
      .map((poi) => {
        const distM = getDistanceMeters(ref.lat, ref.lng, poi.lat!, poi.lng!);
        const bearing = getBearing(ref.lat, ref.lng, poi.lat!, poi.lng!);
        return { poi, distM, dir: getBearingDirectionText(bearing) };
      })
      .filter((item) => item.distM <= 2000)
      .sort((a, b) => a.distM - b.distM)
      .slice(0, 12);
  }, [gpsPos, navState, allPois]);

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 overflow-y-auto p-4 pb-24 flex flex-col gap-4">
      <div className="flex items-center justify-between bg-amber-950/60 border border-amber-500/40 rounded-2xl p-3.5">
        <div className="flex items-center gap-2.5">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="text-sm font-black text-amber-200">오프라인 폴백 HUD</div>
            <div className="text-xs text-amber-300/80">
              캐시된 트레일·POI 데이터로 GPS 방향과 거리를 안내합니다.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetryOnline}
          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>지도 재시도</span>
        </button>
      </div>

      {/* Current Section & Off-Trail Compass Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">현재 가장 가까운 구간</div>
            <div className="text-lg font-black text-emerald-400">
              {currentSection
                ? `${currentSection.section_number} · ${currentSection.region}`
                : 'GPS 위치 수신 대기 중'}
            </div>
          </div>
          {currentSection && (
            <button
              type="button"
              onClick={() => onOpenSectionDetail(currentSection.section_id)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer"
            >
              구간 상세
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800">
            <div className="text-xs text-slate-400 mb-1">트레일 이탈 거리</div>
            <div
              className={`text-xl font-black ${
                (navState?.current.offTrailM ?? 0) > 50 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {navState ? `${navState.current.offTrailM} m` : '-'}
            </div>
          </div>
          <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>합류 방위</span>
            </div>
            <div className="text-xl font-black text-sky-300">
              {trailReturnDirection
                ? `${trailReturnDirection.arrow} ${trailReturnDirection.text} (${trailReturnDirection.bearing}°)`
                : '-'}
            </div>
          </div>
        </div>

        {navState?.target && (
          <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" />
                목적지: {navState.target.label}
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200">
                {navState.direction === 'east' ? '서→동 (정방향)' : '동→서 (역방향)'}
              </span>
            </div>
            <div className="text-sm font-black text-white">
              남은 트레일 {navState.trailDistanceKm.toFixed(1)} km · {formatEta(navState.etaMinutes)}
              {navState.approachDistanceM > 0 && (
                <span className="text-amber-300 ml-1.5 text-xs">
                  (+ 합류 {navState.approachDistanceM}m)
                </span>
              )}
            </div>
            {navState.unopenedSectionIds.length > 0 && (
              <div className="text-xs font-bold text-amber-300">
                ⚠ 미개통 구간 {navState.unopenedSectionIds.length}개 포함 (추정 거리)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nearby Cached POIs within 2km */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="text-sm font-black text-slate-200 mb-2.5 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>반경 2km 내 캐시 편의시설 ({nearbyPois.length})</span>
        </div>
        {nearbyPois.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center">
            현재 위치 반경 2km 내에 캐시된 편의시설이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {nearbyPois.map(({ poi, distM, dir }) => (
              <button
                key={poi.id}
                type="button"
                onClick={() => onSelectPoiTarget(poi)}
                className="w-full text-left p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{poi.name}</div>
                  <div className="text-xs text-slate-400">
                    {poi.section_id ? `${poi.section_id}구간` : ''} · {dir.arrow} {dir.text}
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-400 shrink-0">
                  {distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
