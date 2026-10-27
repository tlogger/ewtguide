import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { SectionSummary } from '../types';
import { ArrowLeft, Layers, Compass, Eye, MapPin, Clock, TrendingUp } from 'lucide-react';

interface OverviewSection {
  section_id: number;
  section_number: string;
  title: string;
  region: string;
  is_opened: boolean;
  distance_km: number;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  path: { lat: number; lng: number }[];
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
  const [sections, setSections] = useState<OverviewSection[]>([]);
  const [filter, setFilter] = useState<'all' | 'opened' | 'unopened'>('all');
  const [selectedSection, setSelectedSection] = useState<OverviewSection | null>(null);
  const [mapType, setMapType] = useState<'osm' | 'topo'>('osm');
  const [isLoading, setIsLoading] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylinesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const activePolylineRef = useRef<L.Polyline | null>(null);

  // Load all_sections_overview.json
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/all_sections_overview.json`)
      .then((res) => res.json())
      .then((data: OverviewSection[]) => {
        setSections(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load overview data:', err);
        setIsLoading(false);
      });
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center of South Korea (East-West corridor latitude ~36.5, longitude ~128.0)
    const map = L.map(mapContainerRef.current, {
      center: [36.65, 128.0],
      zoom: 8,
      zoomControl: false,
      attributionControl: false
    });
    mapRef.current = map;

    // Layer group for polylines
    const layerGroup = L.layerGroup().addTo(map);
    polylinesLayerGroupRef.current = layerGroup;

    // Tile layer
    const tileLayer = L.tileLayer(
      mapType === 'topo'
        ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 18,
        subdomains: 'abcd'
      }
    ).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Tile Layer when mapType changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });

    const newUrl =
      mapType === 'topo'
        ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(newUrl, {
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(mapRef.current);
  }, [mapType]);

  // Render Polylines whenever sections or filter change
  useEffect(() => {
    if (!mapRef.current || !polylinesLayerGroupRef.current || sections.length === 0) return;

    const layerGroup = polylinesLayerGroupRef.current;
    layerGroup.clearLayers();

    const allBounds = L.latLngBounds([]);

    sections.forEach((sec) => {
      if (filter === 'opened' && !sec.is_opened) return;
      if (filter === 'unopened' && sec.is_opened) return;

      const latLngs: L.LatLngExpression[] = sec.path.map((p) => [p.lat, p.lng]);
      if (latLngs.length === 0) return;

      latLngs.forEach((coord) => allBounds.extend(coord as L.LatLngTuple));

      // 1. Halo / Shadow line for contrast
      const halo = L.polyline(latLngs, {
        color: '#0f172a',
        weight: 7,
        opacity: 0.65,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // 2. Core colored line (Vibrant Orange for opened, Amber dashed for unopened)
      const coreColor = sec.is_opened ? '#ea580c' : '#d97706';
      const core = L.polyline(latLngs, {
        color: coreColor,
        weight: 4,
        opacity: 0.95,
        dashArray: sec.is_opened ? undefined : '6, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // 3. Transparent wider hit area for easy tapping on mobile
      const hitArea = L.polyline(latLngs, {
        color: 'transparent',
        weight: 22,
        opacity: 0.01
      }).addTo(layerGroup);

      const handleSelect = () => {
        setSelectedSection(sec);

        // Highlight selection
        if (activePolylineRef.current) {
          layerGroup.removeLayer(activePolylineRef.current);
          activePolylineRef.current = null;
        }

        const activeLine = L.polyline(latLngs, {
          color: '#2563eb',
          weight: 8,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layerGroup);

        activePolylineRef.current = activeLine;
      };

      hitArea.on('click', handleSelect);
      core.on('click', handleSelect);
      halo.on('click', handleSelect);

      // Section midpoint label marker (subtle badge)
      if (sec.path.length > 0) {
        const midIdx = Math.floor(sec.path.length / 2);
        const midPt = sec.path[midIdx];
        const labelHtml = `
          <div style="transform: translate(-50%, -50%); cursor: pointer;">
            <span style="
              background: ${sec.is_opened ? '#065f46' : '#78350f'};
              color: white;
              padding: 2px 6px;
              border-radius: 9999px;
              font-size: 10px;
              font-weight: 800;
              border: 1px solid rgba(255,255,255,0.7);
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
              white-space: nowrap;
            ">
              ${sec.section_id}
            </span>
          </div>
        `;
        const midMarker = L.marker([midPt.lat, midPt.lng], {
          icon: L.divIcon({
            html: labelHtml,
            className: '',
            iconSize: [20, 20]
          })
        }).addTo(layerGroup);

        midMarker.on('click', handleSelect);
      }
    });

    // Special Start Point: Taean (Section 1)
    const sec1 = sections.find((s) => s.section_id === 1);
    if (sec1 && sec1.start) {
      const startHtml = `
        <div style="background: #16a34a; color: white; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); border: 2px solid white; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span>🌊 서해 기점 (태안)</span>
        </div>
      `;
      L.marker([sec1.start.lat, sec1.start.lng], {
        icon: L.divIcon({ html: startHtml, className: '', iconSize: [120, 26] })
      }).addTo(layerGroup);
    }

    // Special End Point: Uljin (Section 55)
    const sec55 = sections.find((s) => s.section_id === 55);
    if (sec55 && sec55.end) {
      const endHtml = `
        <div style="background: #0284c7; color: white; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); border: 2px solid white; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span>🌅 동해 종점 (울진)</span>
        </div>
      `;
      L.marker([sec55.end.lat, sec55.end.lng], {
        icon: L.divIcon({ html: endHtml, className: '', iconSize: [120, 26] })
      }).addTo(layerGroup);
    }

    // Fit map bounds to whole trail on initial render
    if (allBounds.isValid()) {
      mapRef.current.fitBounds(allBounds, { padding: [24, 24] });
    }
  }, [sections, filter]);

  // Match selected section with summary details
  const matchingSummary = useMemo(() => {
    if (!selectedSection) return null;
    return summaryList.find((s) => s.section_id === selectedSection.section_id);
  }, [selectedSection, summaryList]);

  const fitAllBounds = () => {
    if (!mapRef.current || sections.length === 0) return;
    const b = L.latLngBounds([]);
    sections.forEach((s) => s.path.forEach((p) => b.extend([p.lat, p.lng])));
    if (b.isValid()) {
      mapRef.current.fitBounds(b, { padding: [24, 24] });
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-slate-900 overflow-hidden select-none">
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Top Header Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 text-gray-800 font-bold text-sm hover:bg-gray-100 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-700" />
            <span>목록으로</span>
          </button>

          {/* Title Chip */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 text-white backdrop-blur-md rounded-2xl shadow-lg border border-slate-700">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="font-extrabold text-sm tracking-tight">
              동서트레일 55개 전 구간 전국 조망 대지도
            </span>
          </div>
        </div>

        {/* Right Map Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setMapType(mapType === 'osm' ? 'topo' : 'osm')}
            className="px-3.5 py-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 hover:bg-gray-100 active:scale-95"
            title="지도 스타일 전환"
          >
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>{mapType === 'topo' ? '등고선' : '일반지도'}</span>
          </button>

          <button
            onClick={fitAllBounds}
            className="px-3.5 py-2.5 bg-emerald-700 text-white rounded-2xl shadow-lg border border-emerald-600 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-800 active:scale-95"
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
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          전체 (55)
        </button>
        <button
          onClick={() => setFilter('opened')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'opened'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          개통 구간 (32)
        </button>
        <button
          onClick={() => setFilter('unopened')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'unopened'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          미개통 구간 (23)
        </button>
      </div>

      {/* Legend Badge (Top Right below controls) */}
      <div className="hidden md:flex absolute top-18 right-4 z-20 flex-col gap-1.5 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-md border border-gray-200 text-xs font-semibold text-gray-700">
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-[#ea580c] rounded-full inline-block" />
          <span>개통 구간 (32개 · 508.9km)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 border-t-2 border-dashed border-[#d97706] inline-block" />
          <span>미개통 구간 (23개 · 358.2km)</span>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-bold text-emerald-950">
            55개 전 구간 전국 트레일 데이터를 불러오는 중...
          </p>
        </div>
      )}

      {/* Bottom Drawer: Selected Section Card */}
      {selectedSection && (
        <div className="absolute bottom-6 left-4 right-4 max-w-lg mx-auto z-30 bg-white/98 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-gray-200 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                  {selectedSection.section_id}
                </span>
                <h3 className="text-lg font-black text-gray-900">
                  {selectedSection.section_number}
                </h3>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                  {selectedSection.region}
                </span>
                {selectedSection.is_opened ? (
                  <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold">
                    개통 완료
                  </span>
                ) : (
                  <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-md font-bold">
                    미개통 · 조성 중
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{selectedSection.title}</span>
              </p>
            </div>

            <button
              onClick={() => setSelectedSection(null)}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 my-3 text-center bg-gray-50 rounded-2xl p-2.5 border border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 font-medium block">총 거리</span>
              <strong className="text-gray-900 font-bold text-sm">
                {selectedSection.distance_km} km
              </strong>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">예상 보행시간</span>
              <strong className="text-emerald-700 font-bold text-sm">
                {matchingSummary?.hiking_time_text || '계산 중'}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">누적 상승</span>
              <strong className="text-gray-900 font-bold text-sm">
                {matchingSummary?.elevation_gain_m ? `+${matchingSummary.elevation_gain_m}m` : '-'}
              </strong>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onSelectSection(selectedSection.section_id)}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98"
          >
            <span>{selectedSection.section_number} 구간 상세 안내 열기</span>
            <span>➔</span>
          </button>
        </div>
      )}
    </div>
  );
};
