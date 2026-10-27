import React, { useEffect, useRef, useState, useCallback } from 'react';
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

interface TrailMapViewProps {
  section: SectionDetail;
  userFacilities: POI[];
  onAddFacility: (facility: POI) => void;
  onBackToDetail: () => void;
}

const TILE_PROVIDERS = {
  topo: {
    name: '등고선 등산도',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: {
      maxZoom: 17,
      attribution: '© OpenTopoMap, OSM'
    }
  },
  roadmap: {
    name: '일반 지도',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: {
      maxZoom: 19,
      attribution: '© CartoDB, OSM'
    }
  },
  satellite: {
    name: '항공 위성',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      maxZoom: 19,
      attribution: '© Esri, Maxar'
    }
  }
};

export const TrailMapView: React.FC<TrailMapViewProps> = ({
  section,
  userFacilities,
  onAddFacility,
  onBackToDetail
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const hoverMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [currentLayerType, setCurrentLayerType] = useState<'topo' | 'roadmap' | 'satellite'>('roadmap');
  const [gpsActive, setGpsActive] = useState(false);
  const [offTrackDist, setOffTrackDist] = useState<number | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<POI | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCoords, setModalCoords] = useState<{ lat: number; lng: number }>({
    lat: section.start_point.lat,
    lng: section.start_point.lng
  });
  const [hoveredPoint, setHoveredPoint] = useState<TrailPoint | null>(null);

  // Combine official + user facilities
  const allFacilities: POI[] = [...userFacilities, ...(section.pois || [])];

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    });
    mapRef.current = map;

    // Default tile layer
    const provider = TILE_PROVIDERS[currentLayerType];
    const tileLayer = L.tileLayer(provider.url, provider.options).addTo(map);
    tileLayerRef.current = tileLayer;

    // Trail Polyline
    const latLngs: L.LatLngExpression[] = section.points.map((p) => [p.lat, p.lng]);
    
    // Polyline shadow/outline for contrast
    L.polyline(latLngs, {
      color: '#064e3b',
      weight: 8,
      opacity: 0.5,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Main Polyline
    const polyline = L.polyline(latLngs, {
      color: '#059669',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    polylineRef.current = polyline;

    // Fit Bounds
    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    // Start Marker
    const startIcon = L.divIcon({
      className: 'custom-start-marker',
      html: `
        <div style="background:#047857;color:white;font-weight:800;font-size:11px;padding:4px 9px;border-radius:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid white;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;transform:translate(-50%,-100%);">
          <span>🚩</span> <span>시점: ${section.section_number}</span>
        </div>`,
      iconSize: [0, 0]
    });
    L.marker([section.start_point.lat, section.start_point.lng], { icon: startIcon }).addTo(map);

    // End Marker
    const endIcon = L.divIcon({
      className: 'custom-end-marker',
      html: `
        <div style="background:#0f766e;color:white;font-weight:800;font-size:11px;padding:4px 9px;border-radius:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid white;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;transform:translate(-50%,-100%);">
          <span>🏁</span> <span>종점</span>
        </div>`,
      iconSize: [0, 0]
    });
    L.marker([section.end_point.lat, section.end_point.lng], { icon: endIcon }).addTo(map);

    // Facility Markers
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
          <div style="background:white;color:#111827;font-weight:700;font-size:11px;padding:3px 7px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1.5px solid #059669;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;cursor:pointer;transform:translate(-50%,-50%);">
            <span>${iconChar}</span> <span>${fac.name}</span>
          </div>`,
        iconSize: [0, 0]
      });

      const marker = L.marker([fac.lat, fac.lng], { icon: facIcon }).addTo(map);
      marker.on('click', () => {
        setSelectedFacility(fac);
      });
    });

    // Click map to register facility
    map.on('click', (e: L.LeafletMouseEvent) => {
      setModalCoords({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
      setIsModalOpen(true);
    });

    // Force resize calculation
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [section]);

  // Switch Tile Layer
  const handleSwitchLayer = () => {
    if (!mapRef.current) return;
    const nextType: 'topo' | 'roadmap' | 'satellite' =
      currentLayerType === 'roadmap' ? 'topo' :
      currentLayerType === 'topo' ? 'satellite' : 'roadmap';

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const provider = TILE_PROVIDERS[nextType];
    const newLayer = L.tileLayer(provider.url, provider.options).addTo(mapRef.current);
    tileLayerRef.current = newLayer;
    setCurrentLayerType(nextType);
  };

  // Sync Hovered Point from Elevation Bar to Map
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (hoveredPoint) {
      const pos: L.LatLngExpression = [hoveredPoint.lat, hoveredPoint.lng];
      if (!hoverMarkerRef.current) {
        const hoverIcon = L.divIcon({
          className: 'custom-hover-pin',
          html: `<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 10px rgba(239,68,68,0.9);transform:translate(-50%,-50%);"></div>`,
          iconSize: [0, 0]
        });
        hoverMarkerRef.current = L.marker(pos, { icon: hoverIcon }).addTo(map);
      } else {
        hoverMarkerRef.current.setLatLng(pos);
      }
    } else if (hoverMarkerRef.current) {
      map.removeLayer(hoverMarkerRef.current);
      hoverMarkerRef.current = null;
    }
  }, [hoveredPoint]);

  // GPS Tracking
  const toggleGps = useCallback(() => {
    if (gpsActive) {
      setGpsActive(false);
      setOffTrackDist(null);
      if (userMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
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

        // Calculate minimum distance to section points
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
        if (mapRef.current) {
          const map = mapRef.current;
          const userPos: L.LatLngExpression = [uLat, uLng];

          if (!userMarkerRef.current) {
            const gpsIcon = L.divIcon({
              className: 'custom-gps-pin',
              html: `<div style="width:22px;height:22px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 12px rgba(37,99,235,0.95);transform:translate(-50%,-50%);"></div>`,
              iconSize: [0, 0]
            });
            userMarkerRef.current = L.marker(userPos, { icon: gpsIcon }).addTo(map);
            map.panTo(userPos);
          } else {
            userMarkerRef.current.setLatLng(userPos);
          }
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
  }, [gpsActive, section]);

  const zoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };
  const zoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  return (
    <div className="relative w-full h-[calc(100vh-104px)] bg-gray-100 overflow-hidden select-none">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

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
          onClick={handleSwitchLayer}
          className="w-12 h-12 bg-white text-gray-700 rounded-2xl shadow-lg flex flex-col items-center justify-center hover:bg-gray-100 p-1"
          title={`지도 전환 (현재: ${TILE_PROVIDERS[currentLayerType].name})`}
        >
          <Layers className="w-5 h-5 text-emerald-700" />
          <span className="text-[9px] font-bold mt-0.5 text-gray-600">
            {currentLayerType === 'roadmap' ? '일반' : currentLayerType === 'topo' ? '등고선' : '위성'}
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
