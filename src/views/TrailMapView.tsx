import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SectionDetail, POI, TrailPoint } from '../types';
import { FacilityModal } from '../components/FacilityModal';
import {
  Navigation,
  Plus,
  Compass,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  MapPin,
  Phone
} from 'lucide-react';

interface TrailMapViewProps {
  section: SectionDetail;
  userFacilities: POI[];
  onAddFacility: (facility: POI) => void;
  onBackToDetail: () => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export const TrailMapView: React.FC<TrailMapViewProps> = ({
  section,
  userFacilities,
  onAddFacility,
  onBackToDetail
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapInstance = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);
  const userLocationMarkerRef = useRef<any>(null);

  const [mapType, setMapType] = useState<'ROADMAP' | 'HYBRID'>('ROADMAP');
  const [gpsActive, setGpsActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [offTrackDist, setOffTrackDist] = useState<number | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<POI | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCoords, setModalCoords] = useState<{ lat: number; lng: number }>({
    lat: section.start_point.lat,
    lng: section.start_point.lng
  });
  const [hoveredPoint, setHoveredPoint] = useState<TrailPoint | null>(null);
  const [kakaoLoaded, setKakaoLoaded] = useState(false);

  // Combine official + user facilities
  const allFacilities: POI[] = [...userFacilities, ...(section.pois || [])];

  // Check if Kakao Maps SDK is available
  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        setKakaoLoaded(true);
      });
    } else {
      // Check if we need to load or fallback
      setKakaoLoaded(false);
    }
  }, []);

  // Initialize Kakao Map
  useEffect(() => {
    if (!kakaoLoaded || !mapContainerRef.current) return;

    const { kakao } = window;
    const centerLat = section.start_point.lat;
    const centerLng = section.start_point.lng;

    const options = {
      center: new kakao.maps.LatLng(centerLat, centerLng),
      level: 6
    };

    const map = new kakao.maps.Map(mapContainerRef.current, options);
    kakaoMapInstance.current = map;

    // Draw Trail Polyline
    const linePath = section.points.map((p) => new kakao.maps.LatLng(p.lat, p.lng));
    const polyline = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 6,
      strokeColor: '#059669',
      strokeOpacity: 0.9,
      strokeStyle: 'solid'
    });
    polyline.setMap(map);
    polylineRef.current = polyline;

    // Set Bounds to fit entire section
    const bounds = new kakao.maps.LatLngBounds();
    linePath.forEach((pt) => bounds.extend(pt));
    map.setBounds(bounds);

    // Click map to register facility
    kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;
      setModalCoords({
        lat: latlng.getLat(),
        lng: latlng.getLng()
      });
      setIsModalOpen(true);
    });

    // Start / End Markers
    const startPos = new kakao.maps.LatLng(section.start_point.lat, section.start_point.lng);
    const endPos = new kakao.maps.LatLng(section.end_point.lat, section.end_point.lng);

    // Custom overlay for Start
    const startOverlayContent = `
      <div style="background:#047857;color:white;font-weight:bold;font-size:11px;padding:4px 8px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;transform:translate(-50%,-100%);">
        🚩 시점: ${section.section_number}
      </div>`;
    new kakao.maps.CustomOverlay({
      map,
      position: startPos,
      content: startOverlayContent,
      yAnchor: 1.2
    });

    // Custom overlay for End
    const endOverlayContent = `
      <div style="background:#0f766e;color:white;font-weight:bold;font-size:11px;padding:4px 8px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;transform:translate(-50%,-100%);">
        🏁 종점
      </div>`;
    new kakao.maps.CustomOverlay({
      map,
      position: endPos,
      content: endOverlayContent,
      yAnchor: 1.2
    });

    // Facility Markers
    allFacilities.forEach((fac) => {
      if (!fac.lat || !fac.lng) return;
      const markerPos = new kakao.maps.LatLng(fac.lat, fac.lng);
      const icon =
        fac.category === 'shelter' ? '⛺' :
        fac.category === 'toilet' ? '🚻' :
        fac.category === 'restaurant' ? '🍚' :
        fac.category === 'lodging' ? '🏡' :
        fac.category === 'transport' ? '🚕' : '📍';

      const facContent = document.createElement('div');
      facContent.style.cssText =
        'background:white;color:#111827;font-weight:bold;font-size:11px;padding:3px 6px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1.5px solid #059669;cursor:pointer;display:flex;align-items:center;gap:3px;transform:translate(-50%,-50%);';
      facContent.innerHTML = `<span>${icon}</span><span>${fac.name}</span>`;
      facContent.onclick = (e) => {
        e.stopPropagation();
        setSelectedFacility(fac);
      };

      new kakao.maps.CustomOverlay({
        map,
        position: markerPos,
        content: facContent,
        yAnchor: 0.5
      });
    });
  }, [kakaoLoaded, section]);

  // Sync Hovered Point on Map
  useEffect(() => {
    if (!kakaoMapInstance.current || !window.kakao) return;
    const { kakao } = window;
    const map = kakaoMapInstance.current;

    if (hoveredPoint) {
      const pos = new kakao.maps.LatLng(hoveredPoint.lat, hoveredPoint.lng);
      if (!hoverMarkerRef.current) {
        const markerEl = document.createElement('div');
        markerEl.style.cssText =
          'width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 8px rgba(239,68,68,0.8);transform:translate(-50%,-50%);';
        hoverMarkerRef.current = new kakao.maps.CustomOverlay({
          map,
          position: pos,
          content: markerEl,
          yAnchor: 0.5
        });
      } else {
        hoverMarkerRef.current.setPosition(pos);
        hoverMarkerRef.current.setMap(map);
      }
    } else if (hoverMarkerRef.current) {
      hoverMarkerRef.current.setMap(null);
    }
  }, [hoveredPoint]);

  // Toggle GPS Track
  const toggleGps = useCallback(() => {
    if (gpsActive) {
      setGpsActive(false);
      setUserLocation(null);
      setOffTrackDist(null);
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null);
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

        // Update GPS marker
        if (kakaoMapInstance.current && window.kakao) {
          const { kakao } = window;
          const userPos = new kakao.maps.LatLng(uLat, uLng);
          if (!userLocationMarkerRef.current) {
            const gpsContent = document.createElement('div');
            gpsContent.style.cssText =
              'width:22px;height:22px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.9);transform:translate(-50%,-50%);animation:pulse 2s infinite;';
            userLocationMarkerRef.current = new kakao.maps.CustomOverlay({
              map: kakaoMapInstance.current,
              position: userPos,
              content: gpsContent,
              yAnchor: 0.5
            });
          } else {
            userLocationMarkerRef.current.setPosition(userPos);
            userLocationMarkerRef.current.setMap(kakaoMapInstance.current);
          }
        }
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsActive(false);
        alert('GPS 위치를 가져올 수 없습니다. 위치 권한을 허용해 주세요.');
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [gpsActive, section]);

  // Map Controls
  const zoomIn = () => {
    if (kakaoMapInstance.current) {
      kakaoMapInstance.current.setLevel(kakaoMapInstance.current.getLevel() - 1);
    }
  };
  const zoomOut = () => {
    if (kakaoMapInstance.current) {
      kakaoMapInstance.current.setLevel(kakaoMapInstance.current.getLevel() + 1);
    }
  };
  const toggleLayer = () => {
    if (!kakaoMapInstance.current || !window.kakao) return;
    const { kakao } = window;
    if (mapType === 'ROADMAP') {
      kakaoMapInstance.current.setMapTypeId(kakao.maps.MapTypeId.HYBRID);
      setMapType('HYBRID');
    } else {
      kakaoMapInstance.current.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
      setMapType('ROADMAP');
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-104px)] bg-gray-100 overflow-hidden select-none">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full">
        {!kakaoLoaded && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-emerald-50">
            <Compass className="w-16 h-16 text-emerald-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-emerald-950 mb-2">
              카카오맵 지도를 불러오는 중입니다...
            </h3>
            <p className="text-sm text-emerald-800 max-w-md leading-relaxed mb-4">
              카카오 지도 API 키가 설정되지 않은 경우에도 아래의 고도표 및 구간 정보를 정상 이용하실 수 있습니다.
            </p>
            <button
              onClick={onBackToDetail}
              className="px-5 py-2.5 bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md"
            >
              상세 화면으로 돌아가기
            </button>
          </div>
        )}
      </div>

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
          onClick={toggleLayer}
          className="w-12 h-12 bg-white text-gray-700 rounded-2xl shadow-lg flex items-center justify-center hover:bg-gray-100"
          title="위성/일반 지도 전환"
        >
          <Layers className="w-6 h-6" />
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
          <span>⛰️ 노선 고도 (터치 시 지도 동기화)</span>
          <span className="text-emerald-700">
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
