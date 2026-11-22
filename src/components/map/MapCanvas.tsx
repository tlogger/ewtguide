import React, { useEffect, useState } from 'react';
import {
  Map as KakaoMap,
  Polyline,
  CustomOverlayMap,
  MapTypeId,
  useKakaoLoader,
} from 'react-kakao-maps-sdk';
import type { OverviewSection, POI, NavigationState, SectionSummary, TrailPoint } from '../../types';
import { MapScaleBar } from '../MapScaleBar';
import { CategoryIcon } from '../CategoryIcon';
import { MapTypeMode } from '../../utils/cookieStorage';
import { OfflineHudView } from './OfflineHudView';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY || '61ebf0b7a0daf24cba357d92677c8d8a';
const SDK_TIMEOUT_MS = 5000;

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

interface MapCanvasProps {
  center: { lat: number; lng: number };
  level: number;
  mapMode: MapTypeMode;
  forceOffline: boolean;
  overviewSections: OverviewSection[];
  loadedDetailPaths: Record<number, TrailPoint[]>;
  completedSectionIds: number[];
  activeSectionId: number | null;
  visiblePois: POI[];
  allPois: POI[];
  selectedPoi: POI | null;
  gpsPos: { lat: number; lng: number } | null;
  navState: NavigationState | null;
  currentSection: SectionSummary | null;
  hoverPoint: TrailPoint | null;
  onMapReady: (map: kakao.maps.Map) => void;
  onViewportChange: (level: number, bounds: MapBounds | null, isDrag: boolean) => void;
  onSelectPoi: (poi: POI | null) => void;
  onSelectSectionBadge: (sectionId: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  onRetryOnline: () => void;
  onSelectPoiTarget: (poi: POI) => void;
  onOpenSectionDetail: (sectionId: number) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  center,
  level,
  mapMode,
  forceOffline,
  overviewSections,
  loadedDetailPaths,
  completedSectionIds,
  activeSectionId,
  visiblePois,
  allPois,
  selectedPoi,
  gpsPos,
  navState,
  currentSection,
  hoverPoint,
  onMapReady,
  onViewportChange,
  onSelectPoi,
  onSelectSectionBadge,
  onMapClick,
  onRetryOnline,
  onSelectPoiTarget,
  onOpenSectionDetail,
}) => {
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey: KAKAO_APP_KEY,
    libraries: ['services'],
  });
  const [sdkTimedOut, setSdkTimedOut] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const onOffline = () => setIsOffline(true);
    const onOnline = () => {
      setIsOffline(false);
      setSdkTimedOut(false);
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    if (!sdkLoading) {
      setSdkTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => {
      if (sdkLoading) setSdkTimedOut(true);
    }, SDK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [sdkLoading]);

  const showOfflineHud = forceOffline || isOffline || Boolean(sdkError) || sdkTimedOut;

  if (showOfflineHud) {
    return (
      <OfflineHudView
        gpsPos={gpsPos}
        navState={navState}
        currentSection={currentSection}
        allPois={allPois}
        onRetryOnline={() => {
          setSdkTimedOut(false);
          setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
          onRetryOnline();
        }}
        onSelectPoiTarget={onSelectPoiTarget}
        onOpenSectionDetail={onOpenSectionDetail}
      />
    );
  }

  if (sdkLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-600 gap-2">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
        <span className="text-xs font-bold">통합 지도를 불러오는 중...</span>
      </div>
    );
  }

  const readBounds = (map: kakao.maps.Map): MapBounds | null => {
    try {
      const b = map.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      return {
        swLat: sw.getLat(),
        swLng: sw.getLng(),
        neLat: ne.getLat(),
        neLng: ne.getLng(),
      };
    } catch {
      return null;
    }
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden sm:block">
        <MapScaleBar level={level} />
      </div>

      <KakaoMap
        center={center}
        level={level}
        className="w-full h-full"
        onCreate={(map) => {
          onMapReady(map);
          onViewportChange(map.getLevel(), readBounds(map), false);
        }}
        onDragStart={(map) => {
          onViewportChange(map.getLevel(), readBounds(map), true);
        }}
        onIdle={(map) => {
          onViewportChange(map.getLevel(), readBounds(map), false);
        }}
        onZoomChanged={(map) => {
          onViewportChange(map.getLevel(), readBounds(map), false);
        }}
        onClick={(_map, mouseEvent) => {
          onSelectPoi(null);
          if (mouseEvent?.latLng) {
            onMapClick(mouseEvent.latLng.getLat(), mouseEvent.latLng.getLng());
          }
        }}
      >
        {mapMode === 'HYBRID' && <MapTypeId type={kakao.maps.MapTypeId.HYBRID} />}
        {mapMode === 'TERRAIN' && <MapTypeId type={kakao.maps.MapTypeId.TERRAIN} />}

        {/* 55-section polylines (Tier 2 high-res when loaded, else Tier 1 overview) */}
        {overviewSections.map((sec) => {
          const detailPts = loadedDetailPaths[sec.section_id];
          const path = detailPts && detailPts.length > 0 ? detailPts : sec.path;
          if (!path || path.length < 2) return null;

          const isActive = activeSectionId === sec.section_id;
          const isCompleted = completedSectionIds.includes(sec.section_id);
          const strokeColor = isActive
            ? '#ef4444'
            : isCompleted
            ? '#10b981'
            : sec.is_opened
            ? '#2563eb'
            : '#94a3b8';

          return (
            <Polyline
              key={`sec-line-${sec.section_id}`}
              path={path.map((p) => ({ lat: p.lat, lng: p.lng }))}
              strokeWeight={isActive ? 6 : 3.5}
              strokeColor={strokeColor}
              strokeOpacity={isActive ? 0.95 : sec.is_opened ? 0.78 : 0.55}
              strokeStyle={sec.is_opened ? 'solid' : 'shortdash'}
            />
          );
        })}

        {/* Wide zoom (level >= 9): show section number badges only */}
        {level >= 9 &&
          overviewSections.map((sec) => {
            const mid = sec.path && sec.path.length > 0 ? sec.path[Math.floor(sec.path.length / 2)] : sec.start_point;
            if (!mid) return null;
            const isActive = activeSectionId === sec.section_id;
            const isCompleted = completedSectionIds.includes(sec.section_id);
            return (
              <CustomOverlayMap key={`sec-badge-${sec.section_id}`} position={{ lat: mid.lat, lng: mid.lng }} yAnchor={0.5}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSectionBadge(sec.section_id);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-black shadow-md border cursor-pointer transition-transform hover:scale-110 ${
                    isActive
                      ? 'bg-rose-600 text-white border-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white border-emerald-200'
                      : sec.is_opened
                      ? 'bg-slate-900/90 text-white border-sky-400/70'
                      : 'bg-slate-600/80 text-slate-200 border-slate-400'
                  }`}
                >
                  {sec.section_id}
                </button>
              </CustomOverlayMap>
            );
          })}

        {/* Close/mid zoom (level <= 8): show viewport-culled POI markers (capped at 80) */}
        {level <= 8 &&
          visiblePois.map((poi) => {
            if (typeof poi.lat !== 'number' || typeof poi.lng !== 'number') return null;
            const isSelected = selectedPoi?.id === poi.id;
            return (
              <CustomOverlayMap
                key={`poi-${poi.id}`}
                position={{ lat: poi.lat, lng: poi.lng }}
                yAnchor={0.5}
                zIndex={isSelected ? 40 : 15}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPoi(poi);
                  }}
                  className={`rounded-full shadow-md transition-transform cursor-pointer ${
                    isSelected ? 'scale-125 ring-2 ring-amber-400' : 'hover:scale-110'
                  }`}
                  title={poi.name}
                >
                  <CategoryIcon category={poi.category} size="sm" selected={isSelected} />
                </button>
              </CustomOverlayMap>
            );
          })}

        {/* Current GPS Position Marker */}
        {gpsPos && (
          <CustomOverlayMap position={gpsPos} yAnchor={0.5} zIndex={50}>
            <div className="relative flex items-center justify-center">
              <span className="w-6 h-6 rounded-full bg-sky-500/30 animate-ping absolute" />
              <span className="w-3.5 h-3.5 rounded-full bg-sky-500 border-2 border-white shadow-md relative" />
            </div>
          </CustomOverlayMap>
        )}

        {/* Active Destination Target Marker */}
        {navState?.target && (
          <CustomOverlayMap
            position={{ lat: navState.target.lat, lng: navState.target.lng }}
            yAnchor={1}
            zIndex={55}
          >
            <div className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-xl border-2 border-white whitespace-nowrap">
              🎯 {navState.target.label}
            </div>
          </CustomOverlayMap>
        )}

        {/* Elevation Hover Point Marker */}
        {hoverPoint && (
          <CustomOverlayMap position={{ lat: hoverPoint.lat, lng: hoverPoint.lng }} yAnchor={0.5} zIndex={45}>
            <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900 shadow" />
          </CustomOverlayMap>
        )}
      </KakaoMap>
    </div>
  );
};
