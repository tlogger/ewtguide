import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Map as KakaoMap,
  Polyline,
  CustomOverlayMap,
  useKakaoLoader
} from 'react-kakao-maps-sdk';
import { SectionSummary } from '../types';
import { MapScaleBar } from '../components/MapScaleBar';
import {
  ArrowLeft,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2
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
  summaryList: SectionSummary[];
}

export const AllSectionsMapView: React.FC<AllSectionsMapViewProps> = ({
  onBack,
  onSelectSection
}) => {
  // Load Kakao Maps SDK
  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: KAKAO_APP_KEY,
    libraries: ['services', 'clusterer']
  });

  const [sections, setSections] = useState<OverviewSection[]>([]);
  const [mapType, setMapType] = useState<'ROADMAP' | 'HYBRID'>('ROADMAP');
  const [level, setLevel] = useState<number>(11);
  const [isLoading, setIsLoading] = useState(true);

  const mapRef = useRef<any>(null);

  // Load only 32 opened sections overview dataset
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/all_sections_overview.json?v=20261028_v3`)
      .then((res) => res.json())
      .then((data: OverviewSection[]) => {
        // Guarantee only opened sections are displayed
        const openedOnly = data.filter((s) => s.is_opened);
        setSections(openedOnly);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load overview sections:', err);
        setIsLoading(false);
      });
  }, []);

  // Fit bounds to all opened sections on initial create
  const onMapCreate = (map: any) => {
    mapRef.current = map;
    fitAllBounds();
  };

  const fitAllBounds = () => {
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
    setLevel(mapRef.current.getLevel());
  };

  // Re-fit when sections finish loading
  useEffect(() => {
    if (sections.length > 0 && mapRef.current) {
      fitAllBounds();
    }
  }, [sections]);

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

  const toggleMapType = () => {
    const nextType = mapType === 'ROADMAP' ? 'HYBRID' : 'ROADMAP';
    setMapType(nextType);
    if (mapRef.current && window.kakao && window.kakao.maps) {
      mapRef.current.setMapTypeId(
        nextType === 'HYBRID'
          ? window.kakao.maps.MapTypeId.HYBRID
          : window.kakao.maps.MapTypeId.ROADMAP
      );
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
      {/* Top Floating Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md text-sm font-bold transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>구간 목록</span>
        </button>

        <div className="pointer-events-auto px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-semibold text-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>동서트레일 개통 32개 구간</span>
        </div>
      </div>

      {/* Floating Map Controls (Right Side) */}
      <div className="absolute top-16 right-3 z-30 flex flex-col gap-2">
        {/* Layer Mode Toggle (Roadmap / SkyView) */}
        <button
          onClick={toggleMapType}
          className={`p-2.5 rounded-xl shadow-lg border backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
            mapType === 'HYBRID'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-900/90 text-white border-slate-700/80 hover:bg-slate-800'
          }`}
          title={mapType === 'HYBRID' ? '일반 지도로 변경' : '스카이뷰(위성)로 변경'}
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* Fit All Bounds */}
        <button
          onClick={fitAllBounds}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="전체 코스 한눈에 보기"
        >
          <Maximize2 className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="확대"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="축소"
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
          center={{ lat: 36.5, lng: 127.8 }}
          level={level}
          onCreate={onMapCreate}
          onZoomChanged={(map) => setLevel(map.getLevel())}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Polylines for each of the 32 opened sections */}
          {sections.map((sec) => (
            <Polyline
              key={`line-${sec.section_id}`}
              path={sec.path.map((p) => ({ lat: p.lat, lng: p.lng }))}
              strokeWeight={5}
              strokeColor="#ea580c"
              strokeOpacity={0.92}
              strokeStyle="solid"
            />
          ))}

          {/* Clickable Section Badges on the Map (Text +1pt larger: text-[11px] font-black) */}
          {sectionBadges.map((b) => (
            <CustomOverlayMap
              key={`badge-${b.section_id}`}
              position={b.pos}
              yAnchor={0.5}
              xAnchor={0.5}
              zIndex={25}
            >
              <button
                onClick={() => onSelectSection(b.section_id)}
                className="group px-2 py-1 rounded-full bg-slate-900/95 hover:bg-emerald-600 text-white shadow-md border border-emerald-400/80 flex items-center gap-1 cursor-pointer transition-all hover:scale-115 active:scale-95"
                title={`${b.title}: ${b.start_name || ''} ~ ${b.end_name || ''} (클릭 시 상세 이동)`}
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
