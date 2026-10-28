import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Map as KakaoMap,
  Polyline,
  CustomOverlayMap,
  useKakaoLoader
} from 'react-kakao-maps-sdk';
import L from 'leaflet';
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
  Compass
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

  const [mapEngine, setMapEngine] = useState<'kakao' | 'leaflet'>('kakao');
  const [kakaoMapType, setKakaoMapType] = useState<'ROADMAP' | 'HYBRID'>('ROADMAP');
  const [kakaoLevel, setKakaoLevel] = useState<number>(6);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: section.start_point.lat,
    lng: section.start_point.lng
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
    lat: section.start_point.lat,
    lng: section.start_point.lng
  });
  const [hoveredPoint, setHoveredPoint] = useState<TrailPoint | null>(null);

  // Leaflet references when in Topo mode
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletHoverMarkerRef = useRef<L.Marker | null>(null);
  const leafletUserMarkerRef = useRef<L.Marker | null>(null);

  const kakaoMapRef = useRef<any>(null);

  // Combine official + user facilities
  const allFacilities: POI[] = [...userFacilities, ...(section.pois || [])];

  // Path coordinates for Kakao Polyline
  const kakaoPath = section.points.map((p) => ({ lat: p.lat, lng: p.lng }));

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
    if (window.kakao && window.kakao.maps) {
      const bounds = new window.kakao.maps.LatLngBounds();
      section.points.forEach((p) => {
        bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng));
      });
      map.setBounds(bounds);
      setKakaoLevel(map.getLevel());
    }
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
        : new window.kakao.maps.LatLng(section.start_point.lat, section.start_point.lng);

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
    if (mapEngine === 'kakao' && kakaoMapRef.current && window.kakao) {
      const targetLatLng = new window.kakao.maps.LatLng(item.lat, item.lng);
      kakaoMapRef.current.panTo(targetLatLng);
      kakaoMapRef.current.setLevel(4);
      setKakaoLevel(4);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.setView([item.lat, item.lng], 16);
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

  // Switch to Leaflet Topo Map when requested
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletContainerRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
    }

    const map = L.map(leafletContainerRef.current, {
      center: [section.start_point.lat, section.start_point.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });
    leafletMapRef.current = map;

    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      subdomains: 'abc'
    }).addTo(map);

    const latLngs: L.LatLngExpression[] = section.points.map((p) => [p.lat, p.lng]);
    if (latLngs.length > 0) {
      L.polyline(latLngs, {
        color: '#0f172a',
        weight: 9,
        opacity: 0.75
      }).addTo(map);

      L.polyline(latLngs, {
        color: section.is_opened !== false ? '#ea580c' : '#f59e0b',
        weight: 5,
        opacity: 1.0,
        dashArray: section.is_opened !== false ? undefined : '6, 8'
      }).addTo(map);

      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    }

    // Facilities on Leaflet
    allFacilities.forEach((fac) => {
      if (!fac.lat || !fac.lng) return;
      const iconChar =
        fac.category === 'shelter' ? '⛺' :
        fac.category === 'toilet' ? '🚻' :
        fac.category === 'restaurant' ? '🍚' :
        fac.category === 'viewpoint' ? '📸' :
        fac.category === 'lodging' ? '🏡' :
        fac.category === 'mart' ? '🏪' :
        fac.category === 'transport' ? '🚕' :
        fac.category === 'cert_center' ? '🚩' : '📍';

      const facIcon = L.divIcon({
        className: 'custom-fac-marker',
        html: `
          <div style="background:white;color:#111827;font-weight:700;font-size:11px;padding:3px 7px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1.5px solid #059669;white-space:nowrap;cursor:pointer;transform:translate(-50%,-50%);">
            <span>${iconChar}</span> <span>${fac.name}</span>
          </div>`,
        iconSize: [0, 0]
      });

      const marker = L.marker([fac.lat, fac.lng], { icon: facIcon }).addTo(map);
      marker.on('click', () => setSelectedFacility(fac));
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      setModalCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setIsModalOpen(true);
    });

    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [mapEngine, section]);

  // Leaflet Hover Marker Sync
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    if (hoveredPoint) {
      const pos: L.LatLngExpression = [hoveredPoint.lat, hoveredPoint.lng];
      if (!leafletHoverMarkerRef.current) {
        const hoverIcon = L.divIcon({
          className: 'custom-hover-pin',
          html: `<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 10px rgba(239,68,68,0.9);transform:translate(-50%,-50%);"></div>`,
          iconSize: [0, 0]
        });
        leafletHoverMarkerRef.current = L.marker(pos, { icon: hoverIcon }).addTo(map);
      } else {
        leafletHoverMarkerRef.current.setLatLng(pos);
      }
    } else if (leafletHoverMarkerRef.current) {
      map.removeLayer(leafletHoverMarkerRef.current);
      leafletHoverMarkerRef.current = null;
    }
  }, [hoveredPoint, mapEngine]);

  // Toggle GPS Track
  const toggleGps = useCallback(() => {
    if (gpsActive) {
      setGpsActive(false);
      setUserLocation(null);
      setOffTrackDist(null);
      if (leafletUserMarkerRef.current && leafletMapRef.current) {
        leafletMapRef.current.removeLayer(leafletUserMarkerRef.current);
        leafletUserMarkerRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      alert('현재 기기나 브라우저에서 GPS 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setGpsActive(true);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserLocation({ lat: uLat, lng: uLng });

        // Calculate minimum distance to trail points
        let minDist = 999999;
        section.points.forEach((pt) => {
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

        if (mapEngine === 'kakao' && kakaoMapRef.current && window.kakao) {
          kakaoMapRef.current.panTo(new window.kakao.maps.LatLng(uLat, uLng));
        } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
          const map = leafletMapRef.current;
          if (!leafletUserMarkerRef.current) {
            const userIcon = L.divIcon({
              className: 'custom-user-pin',
              html: `<div style="width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 12px rgba(37,99,235,0.9);transform:translate(-50%,-50%);"></div>`,
              iconSize: [0, 0]
            });
            leafletUserMarkerRef.current = L.marker([uLat, uLng], { icon: userIcon }).addTo(map);
          } else {
            leafletUserMarkerRef.current.setLatLng([uLat, uLng]);
          }
          map.setView([uLat, uLng]);
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
  }, [gpsActive, mapEngine, section.points]);

  const zoomIn = () => {
    if (mapEngine === 'kakao' && kakaoMapRef.current) {
      const nextLevel = Math.max(1, kakaoMapRef.current.getLevel() - 1);
      kakaoMapRef.current.setLevel(nextLevel);
      setKakaoLevel(nextLevel);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const zoomOut = () => {
    if (mapEngine === 'kakao' && kakaoMapRef.current) {
      const nextLevel = Math.min(14, kakaoMapRef.current.getLevel() + 1);
      kakaoMapRef.current.setLevel(nextLevel);
      setKakaoLevel(nextLevel);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  const handleToggleLayers = () => {
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
    if (kakaoMapType === 'HYBRID') return '스카이뷰';
    return '카카오맵';
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-slate-900 overflow-hidden select-none">
      {/* 1. Kakao Map Engine */}
      {mapEngine === 'kakao' && (
        <>
          {kakaoLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-sm text-emerald-300">카카오 지도 로딩 중...</p>
            </div>
          ) : kakaoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3 p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-400" />
              <p className="text-amber-400 font-bold">카카오 지도 로드 실패 (Key 확인 필요)</p>
              <button
                onClick={() => setMapEngine('leaflet')}
                className="px-4 py-2 bg-emerald-600 rounded-xl text-xs font-bold"
              >
                등고선 지도로 전환
              </button>
            </div>
          ) : (
            <KakaoMap
              center={mapCenter}
              style={{ width: '100%', height: '100%' }}
              level={kakaoLevel}
              mapTypeId={kakaoMapType}
              onCreate={onKakaoMapCreate}
              onZoomChanged={(map) => setKakaoLevel(map.getLevel())}
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
                strokeWeight={9}
                strokeColor="#0f172a"
                strokeOpacity={0.75}
                strokeStyle="solid"
              />
              {/* Core track line */}
              <Polyline
                path={kakaoPath}
                strokeWeight={5}
                strokeColor={section.is_opened !== false ? '#ea580c' : '#f59e0b'}
                strokeOpacity={1.0}
                strokeStyle={section.is_opened !== false ? 'solid' : 'shortdash'}
              />

              {/* Start Marker */}
              <CustomOverlayMap position={section.start_point} yAnchor={1.2}>
                <div className="bg-emerald-800 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-md border-2 border-white whitespace-nowrap flex items-center gap-1">
                  <span>🚩</span> <span>시점: {section.section_number}</span>
                </div>
              </CustomOverlayMap>

              {/* End Marker */}
              <CustomOverlayMap position={section.end_point} yAnchor={1.2}>
                <div className="bg-teal-800 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-md border-2 border-white whitespace-nowrap flex items-center gap-1">
                  <span>🏁</span> <span>종점</span>
                </div>
              </CustomOverlayMap>

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

              {/* Searched Place Highlight Marker */}
              {searchedPlace && (
                <CustomOverlayMap position={{ lat: searchedPlace.lat, lng: searchedPlace.lng }} yAnchor={1.3}>
                  <div className="bg-red-600 text-white px-3 py-1.5 rounded-2xl shadow-2xl border-2 border-white flex flex-col items-center gap-0.5 select-none animate-bounce">
                    <div className="flex items-center gap-1 font-black text-xs">
                      <span>📍</span>
                      <span>{searchedPlace.name}</span>
                    </div>
                    {searchedPlace.address && (
                      <span className="text-[10px] text-red-100 font-normal">{searchedPlace.address}</span>
                    )}
                  </div>
                </CustomOverlayMap>
              )}

              {/* Hovered Point on Elevation Bar */}
              {hoveredPoint && (
                <CustomOverlayMap
                  position={{ lat: hoveredPoint.lat, lng: hoveredPoint.lng }}
                  yAnchor={0.5}
                >
                  <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-lg animate-pulse" />
                </CustomOverlayMap>
              )}

              {/* Real-time GPS Location Dot */}
              {userLocation && (
                <CustomOverlayMap position={userLocation} yAnchor={0.5}>
                  <div className="w-6 h-6 rounded-full bg-blue-600 border-3 border-white shadow-xl animate-pulse" />
                </CustomOverlayMap>
              )}
            </KakaoMap>
          )}
        </>
      )}

      {/* 2. Leaflet Topo Map Engine */}
      {mapEngine === 'leaflet' && (
        <div ref={leafletContainerRef} className="w-full h-full z-10" />
      )}

      {/* Top Floating Bar: Section Pill + Search Input + Off-track Alert */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          {/* Section Pill */}
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-gray-200 pointer-events-auto flex items-center gap-2 text-xs font-bold text-gray-800 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{section.section_number} : {section.region}</span>
            <span className="text-emerald-700 font-extrabold">{section.official_distance_km}km</span>
          </div>

          {/* Integrated Search Box (Priority 1: Section Facilities, Priority 2: Kakao Places) */}
          <div className="relative pointer-events-auto flex-1 max-w-xs sm:max-w-sm">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) setIsSearchOpen(true);
                }}
                placeholder="편의시설(화장실, 마트) / 지명 검색..."
                className="w-full pl-9 pr-8 py-2 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-text"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchOpen(false);
                    setSearchedPlace(null);
                  }}
                  className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 max-h-72 overflow-y-auto divide-y divide-gray-100 z-50">
                <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-500 flex items-center justify-between">
                  <span>검색 결과 ({searchResults.length}건)</span>
                  <span>우선: 구간 내 시설</span>
                </div>
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectResult(item)}
                    className="p-2.5 hover:bg-emerald-50 cursor-pointer transition-colors flex items-start gap-2.5 text-left"
                  >
                    <span className="text-sm mt-0.5">
                      {item.type === 'facility' ? '🚩' : '📍'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900 truncate">
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                            item.type === 'facility'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.type === 'facility' ? '구간 시설' : '카카오 장소'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {item.subText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Off-Track Warning Pill */}
        {offTrackDist !== null && (
          <div
            className={`pointer-events-auto self-end px-3.5 py-1.5 rounded-2xl shadow-lg text-xs font-bold flex items-center gap-1.5 ${
              offTrackDist > 100
                ? 'bg-red-600 text-white animate-bounce'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {offTrackDist > 100 ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>트레일 이탈 주의 ({offTrackDist}m)</span>
              </>
            ) : (
              <span>정상 코스 진행 중 ({offTrackDist}m)</span>
            )}
          </div>
        )}
      </div>

      {/* Right Control Buttons */}
      <div className="absolute top-20 right-4 z-20 flex flex-col gap-2.5">
        <button
          onClick={toggleGps}
          className={`w-11 h-11 rounded-2xl shadow-lg flex items-center justify-center transition-all cursor-pointer ${
            gpsActive
              ? 'bg-blue-600 text-white ring-4 ring-blue-300'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="내 위치 실시간 추적"
        >
          <Navigation className={`w-5 h-5 ${gpsActive ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={handleToggleLayers}
          className="w-11 h-11 bg-white text-gray-700 rounded-2xl shadow-lg flex flex-col items-center justify-center hover:bg-gray-100 p-1 cursor-pointer"
          title="지도 레이어 전환"
        >
          <Layers className="w-4 h-4 text-emerald-700" />
          <span className="text-[8px] font-bold mt-0.5 text-gray-700">
            {getLayerLabel()}
          </span>
        </button>

        <button
          onClick={zoomIn}
          className="w-11 h-11 bg-white text-gray-700 rounded-2xl shadow-lg flex items-center justify-center hover:bg-gray-100 font-bold cursor-pointer"
          title="지도 확대"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <button
          onClick={zoomOut}
          className="w-11 h-11 bg-white text-gray-700 rounded-2xl shadow-lg flex items-center justify-center hover:bg-gray-100 font-bold cursor-pointer"
          title="지도 축소"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Add Facility Button (Bottom Right above elevation chart) */}
      <button
        onClick={() => {
          setModalCoords({
            lat: section.start_point.lat,
            lng: section.start_point.lng
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
        <MapScaleBar level={kakaoLevel} />
      </div>

      {/* Bottom Mini Elevation Bar with Full-Height Hit Testing */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-gray-200">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1 px-1">
          <span className="flex items-center gap-1.5">
            <span>⛰️ 노선 고도 프로필</span>
            <span className="text-[11px] text-gray-500 font-normal hidden sm:inline">
              (차트 상하 전체 호버/터치로 실시간 위치 동기화)
            </span>
          </span>
          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            {hoveredPoint ? `${hoveredPoint.dist}km 지점 · ${hoveredPoint.ele}m` : `최고 ${section.max_elevation_m}m · 최저 ${section.min_elevation_m}m`}
          </span>
        </div>
        <div
          onMouseMove={(e) => handleElevationTrack(e.clientX, e.currentTarget)}
          onTouchMove={(e) => {
            if (e.touches.length > 0) {
              handleElevationTrack(e.touches[0].clientX, e.currentTarget);
            }
          }}
          className="relative h-14 w-full flex items-end gap-[1px] bg-slate-900/5 rounded-xl p-1 overflow-hidden cursor-crosshair group"
        >
          {elevationSamples.map((p: TrailPoint, idx: number) => {
            const maxE = Math.max(section.max_elevation_m, 100);
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
                      ? 'bg-red-500 ring-2 ring-red-400'
                      : section.is_opened !== false
                      ? 'bg-emerald-600 group-hover:bg-emerald-500'
                      : 'bg-amber-600 group-hover:bg-amber-500'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  {getCategoryLabel(selectedFacility.category)}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  {selectedFacility.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFacility(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedFacility.description && (
              <p className="text-xs text-gray-600 leading-relaxed">
                {selectedFacility.description}
              </p>
            )}
            {selectedFacility.memo && (
              <p className="text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100">
                💡 {selectedFacility.memo}
              </p>
            )}

            {selectedFacility.phone && (
              <a
                href={`tel:${selectedFacility.phone}`}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
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
