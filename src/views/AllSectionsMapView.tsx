import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Map as KakaoMap,
  Polyline,
  CustomOverlayMap,
  MapTypeId,
  useKakaoLoader
} from 'react-kakao-maps-sdk';
import { SectionSummary } from '../types';
import { MapScaleBar } from '../components/MapScaleBar';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Map,
  Layers,
  Mountain
} from 'lucide-react';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY || '61ebf0b7a0daf24cba357d92677c8d8a';

export interface OverviewSection {
  section_id: number;
  section_number: string;
  title: string;
  region: string;
  course: string;
  start_name?: string;
  end_name?: string;
  is_opened: boolean;
  distance_km: number;
  elevation_gain_m?: number;
  elevation_loss_m?: number;
  start_point: { lat: number; lng: number };
  end_point: { lat: number; lng: number };
  path: { lat: number; lng: number; ele: number }[];
}

interface AllSectionsMapViewProps {
  onBack: () => void;
  onSelectSection: (sectionId: number) => void;
  onOpenSectionMap?: (sectionId: number) => void;
  summaryList: SectionSummary[];
}

export const AllSectionsMapView: React.FC<AllSectionsMapViewProps> = ({
  onBack,
  onSelectSection,
  onOpenSectionMap
}) => {
  // Load Kakao Maps SDK
  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: KAKAO_APP_KEY,
    libraries: ['services', 'clusterer']
  });

  const [sections, setSections] = useState<OverviewSection[]>([]);
  const [mapMode, setMapMode] = useState<'ROADMAP' | 'HYBRID' | 'TERRAIN'>('ROADMAP');
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 36.5, lng: 127.8 });
  const [level, setLevel] = useState<number>(11);
  const [isLoading, setIsLoading] = useState(true);

  const mapRef = useRef<any>(null);
  const initialFitDoneRef = useRef<boolean>(false);

  // Load only 32 opened sections overview dataset
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/all_sections_overview.json?v=20261028_v4`)
      .then((res) => res.json())
      .then((data: OverviewSection[]) => {
        const openedOnly = data.filter((s) => s.is_opened);
        setSections(openedOnly);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load overview sections:', err);
        setIsLoading(false);
      });
  }, []);

  // Fit bounds to all opened sections (Korea overview)
  const fitAllBounds = useCallback(() => {
    if (!mapRef.current || !window.kakao || !window.kakao.maps || sections.length === 0) return;
    const bounds = new window.kakao.maps.LatLngBounds();
    sections.forEach((sec) => {
      if (sec.start_point) {
        bounds.extend(new window.kakao.maps.LatLng(sec.start_point.lat, sec.start_point.lng));
      }
      if (sec.end_point) {
        bounds.extend(new window.kakao.maps.LatLng(sec.end_point.lat, sec.end_point.lng));
      }
    });
    mapRef.current.setBounds(bounds);
    const c = mapRef.current.getCenter();
    setCenter({ lat: c.getLat(), lng: c.getLng() });
    setLevel(mapRef.current.getLevel());
  }, [sections]);

  // Initial fit bounds when sections arrive - ONLY ONCE
  useEffect(() => {
    if (sections.length > 0 && mapRef.current && !initialFitDoneRef.current) {
      initialFitDoneRef.current = true;
      fitAllBounds();
    }
  }, [sections, fitAllBounds]);

  // Map creation handler
  const onMapCreate = (map: any) => {
    mapRef.current = map;
    if (sections.length > 0 && !initialFitDoneRef.current) {
      initialFitDoneRef.current = true;
      fitAllBounds();
    }
  };

  // Zoom control
  const handleZoomIn = () => {
    if (mapRef.current) {
      const cur = mapRef.current.getLevel();
      const next = Math.max(1, cur - 1);
      mapRef.current.setLevel(next);
      setLevel(next);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const cur = mapRef.current.getLevel();
      const next = Math.min(14, cur + 1);
      mapRef.current.setLevel(next);
      setLevel(next);
    }
  };

  // Compute center position for each section badge (midpoint of path)
  const sectionBadges = useMemo(() => {
    return sections.map((sec) => {
      let badgePos = sec.start_point;
      if (sec.path && sec.path.length > 0) {
        const midIdx = Math.floor(sec.path.length / 2);
        badgePos = { lat: sec.path[midIdx].lat, lng: sec.path[midIdx].lng };
      }
      return {
        section_id: sec.section_id,
        section_number: sec.section_number,
        title: sec.title,
        start_name: sec.start_name,
        end_name: sec.end_name,
        pos: badgePos
      };
    });
  }, [sections]);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-900 select-none">
      {/* Top Floating Controls: 3-way Map Mode Switcher as Icons */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <div className="flex items-center bg-slate-900/95 p-1 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md gap-1">
          <button
            onClick={() => setMapMode('ROADMAP')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mapMode === 'ROADMAP'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="일반 지도"
          >
            <Map className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMapMode('HYBRID')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mapMode === 'HYBRID'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="위성/스카이뷰"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMapMode('TERRAIN')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mapMode === 'TERRAIN'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="지형도"
          >
            <Mountain className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Map Controls (Right Side) */}
      <div className="absolute top-16 right-3 z-30 flex flex-col gap-2">
        {/* Fit All Bounds */}
        <button
          onClick={fitAllBounds}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="전체 코스 한눈에 보기"
        >
          <Maximize2 className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Zoom In (+) */}
        <button
          onClick={handleZoomIn}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="지도 확대 (+)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out (-) */}
        <button
          onClick={handleZoomOut}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="지도 축소 (-)"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      {/* Kakao Map Container */}
      {kakaoLoading ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">카카오 지도 로딩 중...</p>
        </div>
      ) : kakaoError ? (
        <div className="w-full h-full flex items-center justify-center p-6 bg-slate-950 text-rose-400 text-center">
          카카오 지도 로드에 실패했습니다. 인터넷 연결 또는 도메인 설정을 확인하세요.
        </div>
      ) : (
        <KakaoMap
          center={center}
          level={level}
          mapTypeId={mapMode === 'HYBRID' ? 'HYBRID' : 'ROADMAP'}
          onCreate={onMapCreate}
          onCenterChanged={(map) => {
            const c = map.getCenter();
            setCenter({ lat: c.getLat(), lng: c.getLng() });
          }}
          onZoomChanged={(map) => {
            setLevel(map.getLevel());
          }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Topographic Contour Overlay when in TERRAIN mode */}
          {mapMode === 'TERRAIN' && <MapTypeId type="TERRAIN" />}

          {/* Polylines for each of the 32 opened sections */}
          {sections.map((sec) => (
            <Polyline
              key={`line-${sec.section_id}`}
              path={sec.path.map((p) => ({ lat: p.lat, lng: p.lng }))}
              strokeWeight={5}
              strokeColor="#ea580c"
              strokeOpacity={0.92}
              strokeStyle="solid"
              onClick={() => {
                if (onOpenSectionMap) onOpenSectionMap(sec.section_id);
                else onSelectSection(sec.section_id);
              }}
            />
          ))}

          {/* Clickable Section Badges on the Map (Directly opens Trail Map View) */}
          {sectionBadges.map((b) => (
            <CustomOverlayMap
              key={`badge-${b.section_id}`}
              position={b.pos}
              yAnchor={0.5}
              xAnchor={0.5}
              zIndex={25}
            >
              <button
                onClick={() => {
                  if (onOpenSectionMap) onOpenSectionMap(b.section_id);
                  else onSelectSection(b.section_id);
                }}
                className="group px-2 py-1 rounded-full bg-slate-900/95 hover:bg-emerald-600 text-white shadow-md border border-emerald-400/80 flex items-center gap-1 cursor-pointer transition-all hover:scale-115 active:scale-95"
                title={`${b.title}: ${b.start_name || ''} ~ ${b.end_name || ''} (클릭 시 구간 지도 보기)`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:bg-white" />
                <span className="text-[11px] font-black tracking-tight">{b.section_id}구간</span>
              </button>
            </CustomOverlayMap>
          ))}
        </KakaoMap>
      )}

      {/* Map Scale Bar (Always visible bottom-left) */}
      <MapScaleBar level={level} />
    </div>
  );
};
