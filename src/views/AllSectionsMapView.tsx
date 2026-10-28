import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Map as KakaoMap,
  Polyline,
  CustomOverlayMap,
  useKakaoLoader
} from 'react-kakao-maps-sdk';
import L from 'leaflet';
import { SectionSummary } from '../types';
import { MapScaleBar } from '../components/MapScaleBar';
import {
  ArrowLeft,
  Layers,
  Compass,
  Eye,
  ZoomIn,
  ZoomOut,
  MapPin,
  TrendingUp,
  Clock,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY || '61ebf0b7a0daf24cba357d92677c8d8a';

interface SectionMarkerInfo {
  section_id: number;
  section_number: string;
  title: string;
  region: string;
  is_opened: boolean;
  distance_km: number;
  start_point: { lat: number; lng: number };
  end_point: { lat: number; lng: number };
}

interface FullTrailData {
  total_distance_km: number;
  total_points: number;
  epsilon_meters: number;
  sections_count: number;
  section_markers: SectionMarkerInfo[];
  track: { lat: number; lng: number; is_opened: boolean; section_id: number }[];
}

interface AllSectionsMapViewProps {
  onBack: () => void;
  onSelectSection: (sectionId: number) => void;
  summaryList: SectionSummary[];
}

export const AllSectionsMapView: React.FC<AllSectionsMapViewProps> = ({
  onBack,
  onSelectSection,
  summaryList
}) => {
  // Load Kakao Maps SDK
  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: KAKAO_APP_KEY,
    libraries: ['services', 'clusterer']
  });

  const [fullTrail, setFullTrail] = useState<FullTrailData | null>(null);
  const [filter, setFilter] = useState<'all' | 'opened' | 'unopened'>('all');
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [mapEngine, setMapEngine] = useState<'kakao' | 'leaflet'>('kakao');
  const [kakaoMapType, setKakaoMapType] = useState<'ROADMAP' | 'HYBRID'>('ROADMAP');
  const [kakaoLevel, setKakaoLevel] = useState<number>(11);
  const [isLoading, setIsLoading] = useState(true);

  const kakaoMapRef = useRef<any>(null);
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  // Load single full trail track (epsilon = 4.0m)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/full_trail_track.json`)
      .then((res) => res.json())
      .then((data: FullTrailData) => {
        setFullTrail(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load full trail track:', err);
        setIsLoading(false);
      });
  }, []);

  // Full path coordinates for Kakao Polyline
  const fullPath = useMemo(() => {
    if (!fullTrail || !fullTrail.track) return [];
    return fullTrail.track.map((p) => ({ lat: p.lat, lng: p.lng }));
  }, [fullTrail]);

  // Filtered markers
  const filteredMarkers = useMemo(() => {
    if (!fullTrail || !fullTrail.section_markers) return [];
    return fullTrail.section_markers.filter((m) => {
      if (filter === 'opened') return m.is_opened;
      if (filter === 'unopened') return !m.is_opened;
      return true;
    });
  }, [fullTrail, filter]);

  // Selected section details
  const selectedSection = useMemo(() => {
    if (!selectedSectionId || !summaryList) return null;
    return summaryList.find((s) => s.section_id === selectedSectionId) || null;
  }, [selectedSectionId, summaryList]);

  // Fit bounds covering whole corridor (Taean to Uljin)
  const fitAllBounds = () => {
    if (mapEngine === 'kakao' && kakaoMapRef.current && window.kakao && fullPath.length > 0) {
      const bounds = new window.kakao.maps.LatLngBounds();
      // Add bounds samples
      const step = Math.max(1, Math.floor(fullPath.length / 80));
      for (let i = 0; i < fullPath.length; i += step) {
        bounds.extend(new window.kakao.maps.LatLng(fullPath[i].lat, fullPath[i].lng));
      }
      bounds.extend(new window.kakao.maps.LatLng(fullPath[0].lat, fullPath[0].lng));
      bounds.extend(new window.kakao.maps.LatLng(fullPath[fullPath.length - 1].lat, fullPath[fullPath.length - 1].lng));
      kakaoMapRef.current.setBounds(bounds);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current && fullPath.length > 0) {
      const b = L.latLngBounds(fullPath.map((p) => [p.lat, p.lng]));
      leafletMapRef.current.fitBounds(b, { padding: [24, 24] });
    }
  };

  const onKakaoMapCreate = (map: any) => {
    kakaoMapRef.current = map;
    if (window.kakao && window.kakao.maps && fullPath.length > 0) {
      fitAllBounds();
    }
  };

  // Setup Leaflet map when switched to Topo mode
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletContainerRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
    }

    const map = L.map(leafletContainerRef.current, {
      center: [36.65, 128.0],
      zoom: 8,
      zoomControl: false,
      attributionControl: false
    });
    leafletMapRef.current = map;

    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      subdomains: 'abc'
    }).addTo(map);

    if (fullPath.length > 0) {
      const latLngs: L.LatLngExpression[] = fullPath.map((p) => [p.lat, p.lng]);
      L.polyline(latLngs, {
        color: '#0f172a',
        weight: 7,
        opacity: 0.65
      }).addTo(map);

      L.polyline(latLngs, {
        color: '#ea580c',
        weight: 4,
        opacity: 0.95
      }).addTo(map);

      map.fitBounds(L.latLngBounds(latLngs), { padding: [24, 24] });
    }

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [mapEngine, fullPath]);

  // Zoom controls
  const handleZoomIn = () => {
    if (mapEngine === 'kakao' && kakaoMapRef.current) {
      const nextLevel = Math.max(1, kakaoMapRef.current.getLevel() - 1);
      kakaoMapRef.current.setLevel(nextLevel);
      setKakaoLevel(nextLevel);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapEngine === 'kakao' && kakaoMapRef.current) {
      const nextLevel = Math.min(14, kakaoMapRef.current.getLevel() + 1);
      kakaoMapRef.current.setLevel(nextLevel);
      setKakaoLevel(nextLevel);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  const handleToggleLayer = () => {
    if (mapEngine === 'kakao') {
      if (kakaoMapType === 'ROADMAP') {
        setKakaoMapType('HYBRID');
      } else {
        setMapEngine('leaflet');
      }
    } else {
      setMapEngine('kakao');
      setKakaoMapType('ROADMAP');
    }
  };

  const getLayerLabel = () => {
    if (mapEngine === 'leaflet') return '등고선';
    return kakaoMapType === 'HYBRID' ? '스카이뷰' : '카카오맵';
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-slate-950 overflow-hidden select-none">
      {/* 1. Primary Engine: Kakao Map */}
      {mapEngine === 'kakao' && (
        <>
          {kakaoLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-sm text-emerald-300">카카오 전국 대지도 로딩 중...</p>
            </div>
          ) : kakaoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3 p-6 text-center">
              <p className="text-amber-400 font-bold">카카오 지도 로드에 실패했습니다.</p>
              <button
                onClick={() => setMapEngine('leaflet')}
                className="px-4 py-2 bg-emerald-600 rounded-xl text-xs font-bold"
              >
                등고선 지도로 전환
              </button>
            </div>
          ) : (
            <KakaoMap
              center={{ lat: 36.65, lng: 128.0 }}
              style={{ width: '100%', height: '100%' }}
              level={kakaoLevel}
              mapTypeId={kakaoMapType}
              onCreate={onKakaoMapCreate}
              onZoomChanged={(map) => setKakaoLevel(map.getLevel())}
            >
              {/* Outer Halo Polyline (Shadow for high contrast) */}
              {fullPath.length > 0 && (
                <Polyline
                  path={fullPath}
                  strokeWeight={8}
                  strokeColor="#0f172a"
                  strokeOpacity={0.7}
                  strokeStyle="solid"
                />
              )}

              {/* Core Vibrant Trail Line (Single Unified GPX Track, epsilon=4m) */}
              {fullPath.length > 0 && (
                <Polyline
                  path={fullPath}
                  strokeWeight={4.5}
                  strokeColor="#ea580c"
                  strokeOpacity={0.95}
                  strokeStyle="solid"
                />
              )}

              {/* Special Marker: West Starting Point (태안 안면도) */}
              {fullPath.length > 0 && (
                <CustomOverlayMap position={fullPath[0]} yAnchor={1.2}>
                  <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-full font-black text-xs shadow-xl border-2 border-white flex items-center gap-1.5 whitespace-nowrap animate-pulse">
                    <span>🌊 서해 기점 (태안)</span>
                  </div>
                </CustomOverlayMap>
              )}

              {/* Special Marker: East Ending Point (울진 망양정) */}
              {fullPath.length > 0 && (
                <CustomOverlayMap position={fullPath[fullPath.length - 1]} yAnchor={1.2}>
                  <div className="bg-sky-600 text-white px-3 py-1.5 rounded-full font-black text-xs shadow-xl border-2 border-white flex items-center gap-1.5 whitespace-nowrap animate-pulse">
                    <span>🌅 동해 종점 (울진)</span>
                  </div>
                </CustomOverlayMap>
              )}

              {/* Section Milestone Pins (Start of each section) */}
              {filteredMarkers.map((marker) => {
                const isSelected = selectedSectionId === marker.section_id;
                return (
                  <CustomOverlayMap
                    key={marker.section_id}
                    position={marker.start_point}
                    yAnchor={1.1}
                  >
                    <div
                      onClick={() => setSelectedSectionId(marker.section_id)}
                      className={`cursor-pointer transition-transform active:scale-90 ${
                        isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                      }`}
                    >
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border shadow-md select-none whitespace-nowrap ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-white ring-2 ring-amber-300'
                            : marker.is_opened
                            ? 'bg-emerald-700 text-white border-emerald-300/80'
                            : 'bg-amber-700 text-amber-100 border-amber-300/80'
                        }`}
                      >
                        {marker.section_id}
                      </span>
                    </div>
                  </CustomOverlayMap>
                );
              })}
            </KakaoMap>
          )}
        </>
      )}

      {/* 2. Fallback / Topo Engine: Leaflet */}
      {mapEngine === 'leaflet' && (
        <div ref={leafletContainerRef} className="w-full h-full z-10" />
      )}

      {/* Top Floating Header & Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 text-gray-800 font-bold text-sm hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-700" />
            <span>목록으로</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 text-white backdrop-blur-md rounded-2xl shadow-lg border border-slate-700">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="font-extrabold text-sm tracking-tight">
              전체 코스 보기 (태안 ~ 울진 867km)
            </span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleToggleLayer}
            className="px-3.5 py-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 hover:bg-gray-100 active:scale-95 cursor-pointer"
            title="지도 레이어 전환"
          >
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>{getLayerLabel()}</span>
          </button>

          <button
            onClick={fitAllBounds}
            className="px-3.5 py-2.5 bg-emerald-700 text-white rounded-2xl shadow-lg border border-emerald-600 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-800 active:scale-95 cursor-pointer"
            title="전국 전체 코스 한눈에 보기"
          >
            <Eye className="w-4 h-4" />
            <span>전체보기</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="absolute top-18 left-4 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-md border border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          전체 (55)
        </button>
        <button
          onClick={() => setFilter('opened')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'opened'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          개통 (32)
        </button>
        <button
          onClick={() => setFilter('unopened')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'unopened'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          미개통 (23)
        </button>
      </div>

      {/* Floating Zoom Buttons (Right) */}
      <div className="absolute top-32 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-11 h-11 bg-white text-gray-800 rounded-2xl shadow-lg flex items-center justify-center hover:bg-gray-100 active:scale-95 cursor-pointer font-bold"
          title="지도 확대"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-11 h-11 bg-white text-gray-800 rounded-2xl shadow-lg flex items-center justify-center hover:bg-gray-100 active:scale-95 cursor-pointer font-bold"
          title="지도 축소"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      {/* Always Visible Scale Bar Overlay (Bottom Left) */}
      <div className="absolute bottom-6 left-4 z-20">
        <MapScaleBar level={kakaoLevel} />
      </div>

      {/* Selected Section Bottom Drawer Card */}
      {selectedSection && (
        <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-30 bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-gray-200 animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    selectedSection.is_opened
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedSection.is_opened ? '개통 완료' : '미개통'}
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {selectedSection.region}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-gray-900 mt-1">
                {selectedSection.title}
              </h3>
            </div>

            <button
              onClick={() => setSelectedSectionId(null)}
              className="text-gray-400 hover:text-gray-600 p-1 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-gray-600 line-clamp-2 mb-3">
            {selectedSection.course}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-gray-50 p-2 rounded-xl flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{selectedSection.official_distance_km} km</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{selectedSection.hiking_time_text || '예상 소요시간'}</span>
            </div>
          </div>

          <button
            onClick={() => onSelectSection(selectedSection.section_id)}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>구간 상세 보기</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
