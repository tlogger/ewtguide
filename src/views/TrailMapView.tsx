import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Map as KakaoMap,
  Polyline,
  CustomOverlayMap,
  useKakaoLoader
} from 'react-kakao-maps-sdk';
import { SectionDetail, POI, TrailPoint } from '../types';
import { FacilityModal } from '../components/FacilityModal';
import { MapScaleBar } from '../components/MapScaleBar';
import {
  Navigation,
  Plus,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  MapPin,
  Phone,
  Search,
  X,
  Maximize2
} from 'lucide-react';

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY || '61ebf0b7a0daf24cba357d92677c8d8a';

interface SearchResultItem {
  type: 'facility' | 'kakao';
  id: string;
  title: string;
  categoryText: string;
  subText: string;
  lat: number;
  lng: number;
  facilityData?: POI;
}

interface TrailMapViewProps {
  section: SectionDetail;
  userFacilities: POI[];
  onAddFacility: (facility: POI) => void;
  onBackToDetail: () => void;
}

export const TrailMapView: React.FC<TrailMapViewProps> = ({
  section,
  userFacilities,
  onAddFacility,
  onBackToDetail
}) => {
  // Load Kakao SDK
  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: KAKAO_APP_KEY,
    libraries: ['services', 'clusterer']
  });

  const [mapType, setMapType] = useState<'ROADMAP' | 'HYBRID'>('ROADMAP');
  const [level, setLevel] = useState<number>(6);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: section.start_point?.lat || 36.5,
    lng: section.start_point?.lng || 126.8
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);

  // GPS Tracking
  const [gpsActive, setGpsActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [offTrackDist, setOffTrackDist] = useState<number | null>(null);

  // Modals & Popups
  const [selectedFacility, setSelectedFacility] = useState<POI | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCoords, setModalCoords] = useState<{ lat: number; lng: number }>({
    lat: section.start_point?.lat || 36.5,
    lng: section.start_point?.lng || 126.8
  });
  const [hoveredPoint, setHoveredPoint] = useState<TrailPoint | null>(null);

  const kakaoMapRef = useRef<any>(null);

  // Combine official + user facilities
  const allFacilities: POI[] = [...userFacilities, ...(section.pois || [])];

  // Path coordinates for Kakao Polyline
  const kakaoPath = useMemo(() => {
    return (section.points || []).map((p) => ({ lat: p.lat, lng: p.lng }));
  }, [section.points]);

  // Sampled points for bottom elevation mini-chart (approx 90 points)
  const elevationSamples = useMemo(() => {
    if (!section.points || section.points.length === 0) return [];
    const step = Math.max(1, Math.floor(section.points.length / 90));
    return section.points.filter((_, i) => i % step === 0);
  }, [section.points]);

  const handleElevationTrack = (clientX: number, target: HTMLDivElement) => {
    if (elevationSamples.length === 0) return;
    const rect = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = x / rect.width;
    const index = Math.min(elevationSamples.length - 1, Math.floor(ratio * elevationSamples.length));
    setHoveredPoint(elevationSamples[index]);
  };

  // Fit bounds for Kakao Map on load
  const onKakaoMapCreate = (map: any) => {
    kakaoMapRef.current = map;
    fitSectionBounds();
  };

  const fitSectionBounds = () => {
    if (!kakaoMapRef.current || !window.kakao || !window.kakao.maps || !section.points || section.points.length === 0) return;
    const bounds = new window.kakao.maps.LatLngBounds();
    section.points.forEach((p) => {
      bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng));
    });
    kakaoMapRef.current.setBounds(bounds);
    setLevel(kakaoMapRef.current.getLevel());
  };

  // Facility category label helper
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'toilet': return '화장실';
      case 'restaurant': return '식당';
      case 'viewpoint': return '관광지/뷰포인트';
      case 'mart': return '편의점/마트';
      case 'shelter': return '쉼터/정자';
      case 'lodging': return '숙박';
      case 'transport': return '교통';
      case 'cert_center': return '인증센터';
      default: return '편의시설';
    }
  };

  // Search logic: Priority 1 (Current section facilities), Priority 2 (Kakao Places)
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }
    const term = query.trim().toLowerCase();

    // 1. Priority 1: Current section's facilities
    const facResults: SearchResultItem[] = allFacilities
      .filter((f) => {
        if (!f.lat || !f.lng) return false;
        const nameMatch = f.name?.toLowerCase().includes(term);
        const catMatch = f.category?.toLowerCase().includes(term) || getCategoryLabel(f.category).toLowerCase().includes(term);
        const descMatch = f.description?.toLowerCase().includes(term);
        const memoMatch = f.memo?.toLowerCase().includes(term);
        return nameMatch || catMatch || descMatch || memoMatch;
      })
      .map((f, idx) => ({
        type: 'facility' as const,
        id: `fac-${idx}-${f.name}`,
        title: f.name || getCategoryLabel(f.category),
        categoryText: getCategoryLabel(f.category),
        subText: f.description ? f.description.slice(0, 45) + '...' : '구간 내 편의시설',
        lat: f.lat!,
        lng: f.lng!,
        facilityData: f
      }));

    // 2. Priority 2: Kakao Places Keyword Search
    if (window.kakao && window.kakao.maps && window.kakao.maps.services && window.kakao.maps.services.Places) {
      const places = new window.kakao.maps.services.Places();
      const center = kakaoMapRef.current
        ? kakaoMapRef.current.getCenter()
        : new window.kakao.maps.LatLng(section.start_point?.lat || 36.5, section.start_point?.lng || 126.8);

      places.keywordSearch(
        query,
        (data: any[], status: string) => {
          let kakaoList: SearchResultItem[] = [];
          if (status === window.kakao.maps.services.Status.OK && data && data.length > 0) {
            kakaoList = data.slice(0, 8).map((p) => ({
              type: 'kakao' as const,
              id: p.id || `k-${p.x}-${p.y}`,
              title: p.place_name,
              categoryText: p.category_group_name || '장소/지명',
              subText: p.road_address_name || p.address_name,
              lat: parseFloat(p.y),
              lng: parseFloat(p.x)
            }));
          }
          setSearchResults([...facResults, ...kakaoList]);
          setIsSearchOpen(true);
        },
        {
          location: center,
          radius: 20000
        }
      );
    } else {
      setSearchResults(facResults);
      setIsSearchOpen(true);
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    setIsSearchOpen(false);
    if (kakaoMapRef.current && window.kakao) {
      const targetLatLng = new window.kakao.maps.LatLng(item.lat, item.lng);
      kakaoMapRef.current.panTo(targetLatLng);
      kakaoMapRef.current.setLevel(4);
      setLevel(4);
    }

    if (item.type === 'facility' && item.facilityData) {
      setSelectedFacility(item.facilityData);
      setSearchedPlace(null);
    } else {
      setSearchedPlace({
        name: item.title,
        address: item.subText,
        lat: item.lat,
        lng: item.lng
      });
      setSelectedFacility(null);
    }
  };

  // GPS Tracker
  useEffect(() => {
    if (!gpsActive) {
      setUserLocation(null);
      setOffTrackDist(null);
      return;
    }

    if (!navigator.geolocation) {
      alert('현재 기기나 브라우저에서 GPS 위치 서비스를 지원하지 않습니다.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserLocation({ lat: uLat, lng: uLng });

        // Calculate minimum distance to trail points
        let minDist = 999999;
        (section.points || []).forEach((pt) => {
          const R = 6371e3;
          const p1 = (uLat * Math.PI) / 180;
          const p2 = (pt.lat * Math.PI) / 180;
          const dp = ((pt.lat - uLat) * Math.PI) / 180;
          const dl = ((pt.lng - uLng) * Math.PI) / 180;
          const a =
            Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const d = R * c;
          if (d < minDist) minDist = d;
        });

        setOffTrackDist(Math.round(minDist));

        if (kakaoMapRef.current && window.kakao) {
          kakaoMapRef.current.panTo(new window.kakao.maps.LatLng(uLat, uLng));
        }
      },
      (err) => {
        console.warn('GPS location error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [gpsActive, section.points]);

  // Zoom In / Out
  const zoomIn = () => {
    if (kakaoMapRef.current) {
      const cur = kakaoMapRef.current.getLevel();
      const next = Math.max(1, cur - 1);
      kakaoMapRef.current.setLevel(next);
      setLevel(next);
    }
  };

  const zoomOut = () => {
    if (kakaoMapRef.current) {
      const cur = kakaoMapRef.current.getLevel();
      const next = Math.min(14, cur + 1);
      kakaoMapRef.current.setLevel(next);
      setLevel(next);
    }
  };

  // Toggle Map Type (Roadmap / SkyView)
  const toggleMapType = () => {
    const nextType = mapType === 'ROADMAP' ? 'HYBRID' : 'ROADMAP';
    setMapType(nextType);
    if (kakaoMapRef.current && window.kakao && window.kakao.maps) {
      kakaoMapRef.current.setMapTypeId(
        nextType === 'HYBRID'
          ? window.kakao.maps.MapTypeId.HYBRID
          : window.kakao.maps.MapTypeId.ROADMAP
      );
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-slate-900 overflow-hidden select-none">
      {/* 1. Kakao Map */}
      {kakaoLoading ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-sm text-emerald-300">카카오 지도 로딩 중...</p>
        </div>
      ) : kakaoError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3 p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400" />
          <p className="text-amber-400 font-bold">카카오 지도 로드 실패 (Key 또는 도메인 확인 필요)</p>
        </div>
      ) : (
        <KakaoMap
          center={mapCenter}
          style={{ width: '100%', height: '100%' }}
          level={level}
          onCreate={onKakaoMapCreate}
          onZoomChanged={(map) => setLevel(map.getLevel())}
          onClick={(_target, mouseEvent) => {
            const latlng = mouseEvent.latLng;
            setModalCoords({
              lat: latlng.getLat(),
              lng: latlng.getLng()
            });
            setIsModalOpen(true);
          }}
          className="w-full h-full z-10"
        >
          {/* High contrast dark halo casing */}
          <Polyline
            path={kakaoPath}
            strokeWeight={8}
            strokeColor="#0f172a"
            strokeOpacity={0.65}
            strokeStyle="solid"
          />
          {/* Core track line in Vivid Terracotta Orange */}
          <Polyline
            path={kakaoPath}
            strokeWeight={5}
            strokeColor={section.is_opened !== false ? '#ea580c' : '#f59e0b'}
            strokeOpacity={0.95}
            strokeStyle={section.is_opened !== false ? 'solid' : 'shortdash'}
          />

          {/* Start Point Badge with Name */}
          {section.start_point && (
            <CustomOverlayMap position={section.start_point} yAnchor={1.2}>
              <div className="bg-slate-900/95 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-lg border-2 border-emerald-400 whitespace-nowrap flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>시점: {section.start_name || `${section.section_number} 시점`}</span>
              </div>
            </CustomOverlayMap>
          )}

          {/* End Point Badge with Name */}
          {section.end_point && (
            <CustomOverlayMap position={section.end_point} yAnchor={1.2}>
              <div className="bg-slate-900/95 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-lg border-2 border-orange-400 whitespace-nowrap flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span>종점: {section.end_name || `${section.section_number} 종점`}</span>
              </div>
            </CustomOverlayMap>
          )}

          {/* Facility Markers */}
          {allFacilities.map((fac, idx) => {
            if (!fac.lat || !fac.lng) return null;
            const iconChar =
              fac.category === 'shelter' ? '⛺' :
              fac.category === 'toilet' ? '🚻' :
              fac.category === 'restaurant' ? '🍚' :
              fac.category === 'viewpoint' ? '📸' :
              fac.category === 'lodging' ? '🏡' :
              fac.category === 'mart' ? '🏪' :
              fac.category === 'transport' ? '🚕' :
              fac.category === 'cert_center' ? '🚩' : '📍';

            return (
              <CustomOverlayMap
                key={fac.id || idx}
                position={{ lat: fac.lat, lng: fac.lng }}
                yAnchor={0.5}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFacility(fac);
                  }}
                  className="bg-white text-gray-900 font-bold text-[11px] px-2 py-0.5 rounded-xl shadow-md border border-emerald-600 whitespace-nowrap cursor-pointer flex items-center gap-1 hover:scale-105 transition-transform"
                >
                  <span>{iconChar}</span>
                  <span>{fac.name}</span>
                </div>
              </CustomOverlayMap>
            );
          })}

          {/* Elevation Profile Hover Marker */}
          {hoveredPoint && (
            <CustomOverlayMap
              position={{ lat: hoveredPoint.lat, lng: hoveredPoint.lng }}
              yAnchor={0.5}
              zIndex={50}
            >
              <div className="relative flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-lg animate-ping absolute" />
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg" />
                <div className="mt-1 px-2 py-0.5 bg-slate-900/90 text-white font-extrabold text-[10px] rounded shadow-md whitespace-nowrap border border-red-400">
                  {hoveredPoint.dist}km · {hoveredPoint.ele}m
                </div>
              </div>
            </CustomOverlayMap>
          )}

          {/* Searched Kakao Place Pin */}
          {searchedPlace && (
            <CustomOverlayMap
              position={{ lat: searchedPlace.lat, lng: searchedPlace.lng }}
              yAnchor={1.2}
              zIndex={45}
            >
              <div className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-xl shadow-xl border-2 border-white flex items-center gap-1 whitespace-nowrap">
                <MapPin className="w-3.5 h-3.5 fill-current" />
                <span>{searchedPlace.name}</span>
              </div>
            </CustomOverlayMap>
          )}

          {/* User Live GPS Location Pin */}
          {userLocation && (
            <CustomOverlayMap
              position={userLocation}
              yAnchor={0.5}
              zIndex={40}
            >
              <div className="relative flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-blue-500/40 animate-ping absolute" />
                <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg" />
              </div>
            </CustomOverlayMap>
          )}
        </KakaoMap>
      )}

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Back button */}
          <button
            onClick={onBackToDetail}
            className="px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700/80 backdrop-blur-md text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1"
          >
            <span>← 상세</span>
          </button>

          {/* Search Box */}
          <div className="relative flex-1">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) setIsSearchOpen(true);
                }}
                placeholder="시설명 또는 지명 검색 (예: 화장실, 쉼터, 면사무소)"
                className="w-full pl-9 pr-8 py-2 bg-slate-900/90 text-white placeholder-slate-400 text-xs rounded-xl shadow-lg border border-slate-700/80 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchOpen(false);
                    setSearchedPlace(null);
                  }}
                  className="absolute right-2.5 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Dropdown Results */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl shadow-2xl z-40 divide-y divide-slate-800">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectResult(item)}
                    className="w-full text-left p-2.5 hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 cursor-pointer"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 shrink-0 ${
                        item.type === 'facility'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {item.type === 'facility' ? '구간시설' : '카카오장소'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.subText}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Off Track Warning */}
        {gpsActive && offTrackDist !== null && offTrackDist > 50 && (
          <div className="self-center bg-rose-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-rose-400 backdrop-blur-md flex items-center gap-1.5 animate-bounce">
            <AlertTriangle className="w-4 h-4" />
            <span>경로 이탈 주의: 코스에서 {offTrackDist}m 벗어났습니다!</span>
          </div>
        )}
      </div>

      {/* Floating Map Controls (Right Side) */}
      <div className="absolute top-20 right-3 z-30 flex flex-col gap-2">
        {/* GPS Track Toggle */}
        <button
          onClick={() => setGpsActive(!gpsActive)}
          className={`p-2.5 rounded-xl shadow-lg border backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
            gpsActive
              ? 'bg-blue-600 text-white border-blue-400'
              : 'bg-slate-900/90 text-white border-slate-700/80 hover:bg-slate-800'
          }`}
          title="내 위치 실시간 추적"
        >
          <Navigation className={`w-5 h-5 ${gpsActive ? 'fill-current' : ''}`} />
        </button>

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

        {/* Fit Section Bounds */}
        <button
          onClick={fitSectionBounds}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="구간 전체 맞추기"
        >
          <Maximize2 className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Zoom In */}
        <button
          onClick={zoomIn}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="지도 확대"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={zoomOut}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="지도 축소"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Add Facility Button (Bottom Right above elevation chart) */}
      <button
        onClick={() => {
          setModalCoords({
            lat: section.start_point?.lat || 36.5,
            lng: section.start_point?.lng || 126.8
          });
          setIsModalOpen(true);
        }}
        className="absolute bottom-28 right-4 z-20 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-1.5 font-bold text-xs transition-transform active:scale-95 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>시설 등록</span>
      </button>

      {/* Always Visible Scale Bar Overlay (Bottom Left above elevation chart) */}
      <div className="absolute bottom-28 left-4 z-20">
        <MapScaleBar level={level} />
      </div>

      {/* Bottom Mini Elevation Bar with Full-Height Hit Testing */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-slate-700/80 text-white">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-1 px-1">
          <span className="flex items-center gap-1.5">
            <span>⛰️ 노선 고도 프로필</span>
            <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
              (차트 상하 전체 호버/터치로 실시간 위치 동기화)
            </span>
          </span>
          <span className="text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/40">
            {hoveredPoint ? `${hoveredPoint.dist}km 지점 · ${hoveredPoint.ele}m` : `최고 ${section.max_elevation_m || 0}m · 최저 ${section.min_elevation_m || 0}m`}
          </span>
        </div>
        <div
          onMouseMove={(e) => handleElevationTrack(e.clientX, e.currentTarget)}
          onTouchMove={(e) => {
            if (e.touches.length > 0) {
              handleElevationTrack(e.touches[0].clientX, e.currentTarget);
            }
          }}
          className="relative h-14 w-full flex items-end gap-[1px] bg-slate-950/60 rounded-xl p-1 overflow-hidden cursor-crosshair group"
        >
          {elevationSamples.map((p: TrailPoint, idx: number) => {
            const maxE = Math.max(section.max_elevation_m || 100, 100);
            const heightPercent = Math.max(12, Math.min(100, (p.ele / maxE) * 100));
            const isHover = hoveredPoint && Math.abs(hoveredPoint.dist - p.dist) < 0.25;
            return (
              <div
                key={idx}
                className="flex-1 h-full flex items-end pointer-events-none"
              >
                <div
                  className={`w-full rounded-t-xs transition-colors ${
                    isHover
                      ? 'bg-rose-500 ring-2 ring-rose-400'
                      : section.is_opened !== false
                      ? 'bg-emerald-500 group-hover:bg-emerald-400'
                      : 'bg-amber-500 group-hover:bg-amber-400'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Facility Selected Popup Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-white">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded">
                  {getCategoryLabel(selectedFacility.category)}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedFacility.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFacility(null)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedFacility.description && (
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedFacility.description}
              </p>
            )}
            {selectedFacility.memo && (
              <p className="text-xs bg-slate-800 text-emerald-300 p-2.5 rounded-xl border border-slate-700">
                💡 {selectedFacility.memo}
              </p>
            )}

            {selectedFacility.phone && (
              <a
                href={`tel:${selectedFacility.phone}`}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{selectedFacility.phone} 전화걸기</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Facility Registration Modal */}
      <FacilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={onAddFacility}
        lat={modalCoords.lat}
        lng={modalCoords.lng}
      />
    </div>
  );
};
