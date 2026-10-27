import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Map as KakaoMap,
  Polyline,
  CustomOverlayMap,
  useKakaoLoader
} from 'react-kakao-maps-sdk';
import L from 'leaflet';
import { SectionDetail, POI, TrailPoint } from '../types';
import { FacilityModal } from '../components/FacilityModal';
import {
  Navigation,
  Plus,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  MapPin,
  Phone
} from 'lucide-react';

// Kakao Map JavaScript Key imported from exfish
const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY || '61ebf0b7a0daf24cba357d92677c8d8a';

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

  // Fit bounds for Kakao Map on load
  const onKakaoMapCreate = (map: any) => {
    kakaoMapRef.current = map;
    if (window.kakao && window.kakao.maps) {
      const bounds = new window.kakao.maps.LatLngBounds();
      section.points.forEach((p) => {
        bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng));
      });
      map.setBounds(bounds);
    }
  };

  // Switch to Leaflet Topo Map when requested
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletContainerRef.current) return;

    const map = L.map(leafletContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    });
    leafletMapRef.current = map;

    // OpenTopoMap tile layer
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '© OpenTopoMap, OSM'
    }).addTo(map);

    // Trail Polyline
    const latLngs: L.LatLngExpression[] = section.points.map((p) => [p.lat, p.lng]);
    L.polyline(latLngs, {
      color: '#064e3b',
      weight: 8,
      opacity: 0.5,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    const polyline = L.polyline(latLngs, {
      color: '#059669',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    // Start / End Markers
    const startIcon = L.divIcon({
      className: 'custom-start-marker',
      html: `
        <div style="background:#047857;color:white;font-weight:800;font-size:11px;padding:4px 9px;border-radius:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid white;white-space:nowrap;transform:translate(-50%,-100%);">
          🚩 시점: ${section.section_number}
        </div>`,
      iconSize: [0, 0]
    });
    L.marker([section.start_point.lat, section.start_point.lng], { icon: startIcon }).addTo(map);

    const endIcon = L.divIcon({
      className: 'custom-end-marker',
      html: `
        <div style="background:#0f766e;color:white;font-weight:800;font-size:11px;padding:4px 9px;border-radius:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid white;white-space:nowrap;transform:translate(-50%,-100%);">
          🏁 종점
        </div>`,
      iconSize: [0, 0]
    });
    L.marker([section.end_point.lat, section.end_point.lng], { icon: endIcon }).addTo(map);

    // Facilities
    allFacilities.forEach((fac) => {
      if (!fac.lat || !fac.lng) return;
      const iconChar =
        fac.category === 'shelter' ? '⛺' :
        fac.category === 'toilet' ? '🚻' :
        fac.category === 'restaurant' ? '🍚' :
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

        // Calculate minimum distance to section points (cross track error)
        let minDist = 999999;
        section.points.forEach((p) => {
          const d = Math.hypot(
            (p.lat - uLat) * 110540,
            (p.lng - uLng) * 111320 * Math.cos((uLat * Math.PI) / 180)
          );
          if (d < minDist) minDist = d;
        });
        setOffTrackDist(Math.round(minDist));

        // Pan map to user position
        if (mapEngine === 'kakao' && kakaoMapRef.current && window.kakao) {
          kakaoMapRef.current.panTo(new window.kakao.maps.LatLng(uLat, uLng));
        } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
          leafletMapRef.current.panTo([uLat, uLng]);
        }
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsActive(false);
        alert('GPS 위치를 가져올 수 없습니다. 위치 권한을 확인해 주세요.');
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [gpsActive, section, mapEngine]);

  // Map Controls
  const zoomIn = () => {
    if (mapEngine === 'kakao' && kakaoMapRef.current) {
      kakaoMapRef.current.setLevel(kakaoMapRef.current.getLevel() - 1);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const zoomOut = () => {
    if (mapEngine === 'kakao' && kakaoMapRef.current) {
      kakaoMapRef.current.setLevel(kakaoMapRef.current.getLevel() + 1);
    } else if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  // Toggle Map Engine / Layers
  const handleToggleLayers = () => {
    if (mapEngine === 'kakao') {
      if (kakaoMapType === 'ROADMAP') {
        setKakaoMapType('HYBRID');
      } else {
        // Switch from Kakao SkyView to Leaflet Topo Map
        setMapEngine('leaflet');
      }
    } else {
      // Switch back from Leaflet Topo to Kakao Roadmap
      setMapEngine('kakao');
      setKakaoMapType('ROADMAP');
    }
  };

  const getLayerLabel = () => {
    if (mapEngine === 'leaflet') return '등고선';
    if (kakaoMapType === 'HYBRID') return '스카이뷰';
    return '카카오';
  };

  return (
    <div className="relative w-full h-[calc(100vh-104px)] bg-gray-100 overflow-hidden select-none">
      {/* 1. Kakao Map Engine */}
      {mapEngine === 'kakao' && (
        <>
          {kakaoLoading ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-emerald-50">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-base font-bold text-emerald-950">
                카카오 지도를 불러오는 중입니다...
              </p>
            </div>
          ) : kakaoError ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-amber-50">
              <p className="text-base font-bold text-amber-950 mb-2">
                카카오 지도 연결 지연으로 등고선 지도로 자동 전환합니다.
              </p>
              <button
                onClick={() => setMapEngine('leaflet')}
                className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl text-sm"
              >
                등고선 등산도 열기
              </button>
            </div>
          ) : (
            <KakaoMap
              center={mapCenter}
              level={kakaoLevel}
              mapTypeId={kakaoMapType}
              onCreate={onKakaoMapCreate}
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
              {/* Trail Polyline */}
              <Polyline
                path={kakaoPath}
                strokeWeight={6}
                strokeColor="#059669"
                strokeOpacity={0.95}
                strokeStyle="solid"
              />

              {/* Start Marker */}
              <CustomOverlayMap
                position={section.start_point}
                yAnchor={1.2}
              >
                <div className="bg-emerald-800 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-md border-2 border-white whitespace-nowrap flex items-center gap-1">
                  <span>🚩</span> <span>시점: {section.section_number}</span>
                </div>
              </CustomOverlayMap>

              {/* End Marker */}
              <CustomOverlayMap
                position={section.end_point}
                yAnchor={1.2}
              >
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
                <CustomOverlayMap
                  position={userLocation}
                  yAnchor={0.5}
                >
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

      {/* Top Floating Status Pill */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xs px-4 py-2.5 rounded-2xl shadow-lg border border-gray-200 pointer-events-auto flex items-center gap-2.5 text-xs sm:text-sm font-bold text-gray-800">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span>{section.section_number} : {section.region}</span>
          <span className="text-emerald-700 font-extrabold">{section.official_distance_km}km</span>
        </div>

        {/* Off-Track Warning Pill */}
        {offTrackDist !== null && (
          <div
            className={`pointer-events-auto px-3.5 py-2 rounded-2xl shadow-lg text-xs font-bold flex items-center gap-1.5 ${
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
          className={`w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all ${
            gpsActive
              ? 'bg-blue-600 text-white ring-4 ring-blue-300'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="내 위치 실시간 추적"
        >
          <Navigation className={`w-6 h-6 ${gpsActive ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={handleToggleLayers}
          className="w-12 h-12 bg-white text-gray-700 rounded-2xl shadow-lg flex flex-col items-center justify-center hover:bg-gray-100 p-1"
          title="지도 레이어 전환 (카카오 / 스카이뷰 / 등고선)"
        >
          <Layers className="w-5 h-5 text-emerald-700" />
          <span className="text-[9px] font-bold mt-0.5 text-gray-700">
            {getLayerLabel()}
          </span>
        </button>

        <button
          onClick={zoomIn}
          className="w-12 h-12 bg-white text-gray-700 rounded-2xl shadow-lg flex items-center justify-center hover:bg-gray-100 font-bold text-xl"
          title="지도 확대"
        >
          <ZoomIn className="w-6 h-6" />
        </button>

        <button
          onClick={zoomOut}
          className="w-12 h-12 bg-white text-gray-700 rounded-2xl shadow-lg flex items-center justify-center hover:bg-gray-100 font-bold text-xl"
          title="지도 축소"
        >
          <ZoomOut className="w-6 h-6" />
        </button>
      </div>

      {/* Floating Add Facility Button (Bottom Right) */}
      <button
        onClick={() => {
          setModalCoords({
            lat: section.start_point.lat,
            lng: section.start_point.lng
          });
          setIsModalOpen(true);
        }}
        className="absolute bottom-28 right-4 z-20 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm transition-transform active:scale-95"
      >
        <Plus className="w-5 h-5" />
        <span>시설 등록</span>
      </button>

      {/* Bottom Mini Elevation Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 backdrop-blur-xs rounded-2xl p-3 shadow-xl border border-gray-200">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1 px-1">
          <span>⛰️ 노선 고도 프로필 (터치 시 지도 실시간 동기화)</span>
          <span className="text-emerald-700 font-bold">
            {hoveredPoint ? `${hoveredPoint.dist}km / ${hoveredPoint.ele}m` : `최고 ${section.max_elevation_m}m`}
          </span>
        </div>
        <div className="h-14 w-full flex items-end gap-[1px] bg-gray-50 rounded-lg p-1 overflow-hidden">
          {section.points
            .filter((_, i) => i % Math.max(1, Math.floor(section.points.length / 80)) === 0)
            .map((p, idx) => {
              const maxE = Math.max(section.max_elevation_m, 100);
              const heightPercent = Math.max(10, Math.min(100, (p.ele / maxE) * 100));
              const isHover = hoveredPoint && hoveredPoint.dist === p.dist;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onClick={() => setHoveredPoint(p)}
                  className={`flex-1 rounded-xs transition-colors cursor-pointer ${
                    isHover ? 'bg-red-500 ring-2 ring-red-400' : 'bg-emerald-600 hover:bg-emerald-400'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
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
                  {selectedFacility.category}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  {selectedFacility.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFacility(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
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
