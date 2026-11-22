import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Map as MapIcon,
  Layers,
  Mountain,
  WifiOff,
  Plus,
  Navigation,
  Edit3,
  Trash2,
  X,
  Phone,
  Clock,
} from 'lucide-react';
import type {
  SectionSummary,
  OverviewSection,
  SectionDetail,
  POI,
  TrekProgress,
  NavigationTarget,
  TrailPoint,
} from '../types';
import {
  buildTrailIndex,
  projectToTrail,
  resolveNavigationTarget,
  computeNavigationState,
} from '../domain/trailGraph';
import { getPoiRepository, normalizePoiRow } from '../services/poiRepository';
import { saveFacilityToDb, deleteFacilityFromDb } from '../services/facilityDb';
import { getSavedMapMode, saveMapMode, MapTypeMode } from '../utils/cookieStorage';
import { playOffTrackWarningBeep } from '../utils/trailMath';
import { MapCanvas, MapBounds } from '../components/map/MapCanvas';
import { NavigationHud } from '../components/map/NavigationHud';
import { ElevationDrawer } from '../components/map/ElevationDrawer';
import { SectionDetailSheet } from '../components/map/SectionDetailSheet';
import { FacilityModal } from '../components/FacilityModal';

const MAX_VISIBLE_POIS = 80;
const DEFAULT_CENTER = { lat: 36.65, lng: 127.85 };

interface UnifiedMapViewProps {
  sectionsSummary: SectionSummary[];
  progress: TrekProgress;
  focusSectionId: number | null;
  detailRequestSectionId: number | null;
  onClearDetailRequest: () => void;
  onActiveSectionChange: (sectionId: number | null) => void;
  onOpenCertModal: (sectionId: number) => void;
  onAddCheckpoint: (sectionId: number, name: string) => void;
  onRemoveCheckpoint: (sectionId: number, cpId: string) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const UnifiedMapView: React.FC<UnifiedMapViewProps> = ({
  sectionsSummary,
  progress,
  focusSectionId,
  detailRequestSectionId,
  onClearDetailRequest,
  onActiveSectionChange,
  onOpenCertModal,
  onAddCheckpoint,
  onRemoveCheckpoint,
  onToast,
}) => {
  const [overviewSections, setOverviewSections] = useState<OverviewSection[]>([]);
  const [officialPois, setOfficialPois] = useState<POI[]>([]);
  const [userPois, setUserPois] = useState<POI[]>([]);
  const [detailCache, setDetailCache] = useState<Record<number, SectionDetail>>({});

  const [center, setCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [level, setLevel] = useState<number>(11);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [mapMode, setMapMode] = useState<MapTypeMode>(() => getSavedMapMode());
  const [forceOffline, setForceOffline] = useState(false);

  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isFollowingGps, setIsFollowingGps] = useState(false);
  const [lockedSectionId, setLockedSectionId] = useState<number | null>(null);
  const [navTarget, setNavTarget] = useState<NavigationTarget | null>(null);

  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [hoverPoint, setHoverPoint] = useState<TrailPoint | null>(null);
  const [detailSheetSectionId, setDetailSheetSectionId] = useState<number | null>(null);
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<POI | null>(null);
  const [draftCoord, setDraftCoord] = useState<{ lat: number; lng: number } | null>(null);

  const mapRef = useRef<kakao.maps.Map | null>(null);
  const lastBeepAtRef = useRef<number>(0);
  const levelRef = useRef<number>(level);
  const boundsRef = useRef<MapBounds | null>(bounds);

  const handleViewportChange = useCallback(
    (nextLevel: number, nextBounds: MapBounds | null, isDrag: boolean) => {
      if (nextLevel !== levelRef.current) {
        levelRef.current = nextLevel;
        setLevel(nextLevel);
      }
      if (nextBounds) {
        const prev = boundsRef.current;
        const changed =
          !prev ||
          Math.abs(prev.swLat - nextBounds.swLat) > 1e-5 ||
          Math.abs(prev.swLng - nextBounds.swLng) > 1e-5 ||
          Math.abs(prev.neLat - nextBounds.neLat) > 1e-5 ||
          Math.abs(prev.neLng - nextBounds.neLng) > 1e-5;
        if (changed) {
          boundsRef.current = nextBounds;
          setBounds(nextBounds);
        }
      }
      if (isDrag) {
        setIsFollowingGps(false);
      }
    },
    []
  );

  // 1. Tier 1 static loads: overview polylines + 55-section official POI index + 3-Tier user POIs
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}data/all_sections_overview.json`)
      .then((res) => res.json())
      .then((data: OverviewSection[]) => setOverviewSections(Array.isArray(data) ? data : []))
      .catch((err) => console.warn('Failed to load overview JSON:', err));

    fetch(`${base}data/all_official_pois.json`)
      .then((res) => res.json())
      .then((data: POI[]) => setOfficialPois(Array.isArray(data) ? data : []))
      .catch((err) => console.warn('Failed to load official POIs JSON:', err));

    getPoiRepository()
      .getAllUserPois()
      .then((rows) => setUserPois(rows))
      .catch((err) => console.warn('Failed to load user POIs:', err));
  }, []);

  // 2. Build 1D trail graph index
  const trailIndex = useMemo(
    () => buildTrailIndex(sectionsSummary, overviewSections),
    [sectionsSummary, overviewSections]
  );

  // 3. Merge official POIs with 3-Tier user POIs (single pass across all 55 sections)
  const mergedAllPois = useMemo(() => {
    const userMap = new Map<string, POI>();
    for (const u of userPois) {
      if (u.id) userMap.set(u.id, normalizePoiRow(u));
    }

    const result: POI[] = [];
    for (const off of officialPois) {
      const normalized = normalizePoiRow(off);
      const id = normalized.id!;
      const override = userMap.get(id);
      if (override) {
        if (!override.is_deleted) {
          result.push({ ...normalized, ...override, is_official: true });
        }
        userMap.delete(id);
      } else {
        result.push({ ...normalized, is_official: true });
      }
    }

    for (const u of userMap.values()) {
      if (!u.is_deleted) {
        result.push(u);
      }
    }

    return result;
  }, [officialPois, userPois]);

  // 4. Geolocation watcher
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const nextPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsPos(nextPos);
        if (isFollowingGps) {
          setCenter(nextPos);
        }
      },
      () => {
        // GPS permission denied or unavailable; user can still browse freely
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isFollowingGps]);

  // 5. Project current GPS (or map center when GPS unavailable) onto 1D trail graph with 50m hysteresis
  const currentProjection = useMemo(() => {
    const refCoord = gpsPos || (focusSectionId ? null : center);
    if (!refCoord || trailIndex.sections.length === 0) return null;
    return projectToTrail(trailIndex, refCoord.lat, refCoord.lng, lockedSectionId);
  }, [gpsPos, center, focusSectionId, trailIndex, lockedSectionId]);

  useEffect(() => {
    if (currentProjection && currentProjection.sectionId !== lockedSectionId) {
      setLockedSectionId(currentProjection.sectionId);
    }
  }, [currentProjection, lockedSectionId]);

  const activeSectionId = focusSectionId ?? currentProjection?.sectionId ?? null;

  useEffect(() => {
    onActiveSectionChange(activeSectionId);
  }, [activeSectionId, onActiveSectionChange]);

  // Off-trail warning beep (> 50m when GPS active, 30s cooldown)
  useEffect(() => {
    if (!gpsPos || !currentProjection) return;
    if (currentProjection.offTrailM > 50) {
      const now = Date.now();
      if (now - lastBeepAtRef.current > 30_000) {
        lastBeepAtRef.current = now;
        playOffTrackWarningBeep();
      }
    }
  }, [gpsPos, currentProjection]);

  // 6. Navigation state
  const navState = useMemo(() => {
    if (!currentProjection) return null;
    return computeNavigationState(trailIndex, currentProjection, navTarget);
  }, [trailIndex, currentProjection, navTarget]);

  // 7. Tier 2 lazy load: load section_{id}.json for active N, adjacent N-1/N+1, target, and detail sheet
  const loadSectionDetail = useCallback(
    async (sectionId: number) => {
      if (sectionId < 1 || sectionId > 55) return;
      if (detailCache[sectionId]) return;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/sections/section_${sectionId}.json`);
        if (!res.ok) return;
        const detail: SectionDetail = await res.json();
        setDetailCache((prev) => (prev[sectionId] ? prev : { ...prev, [sectionId]: detail }));
      } catch {
        // ignore offline miss
      }
    },
    [detailCache]
  );

  useEffect(() => {
    const idsToLoad = new Set<number>();
    if (activeSectionId) {
      idsToLoad.add(activeSectionId);
      if (activeSectionId > 1) idsToLoad.add(activeSectionId - 1);
      if (activeSectionId < 55) idsToLoad.add(activeSectionId + 1);
    }
    if (navTarget?.sectionId) {
      idsToLoad.add(navTarget.sectionId);
    }
    if (detailSheetSectionId) {
      idsToLoad.add(detailSheetSectionId);
    }
    idsToLoad.forEach((id) => {
      if (!detailCache[id]) {
        void loadSectionDetail(id);
      }
    });
  }, [activeSectionId, navTarget, detailSheetSectionId, detailCache, loadSectionDetail]);

  // Handle external focusSectionId change from Header
  useEffect(() => {
    if (!focusSectionId) return;
    const sec = overviewSections.find((s) => s.section_id === focusSectionId);
    const pt = sec?.path?.[Math.floor((sec.path?.length || 0) / 2)] || sec?.start_point;
    if (pt) {
      setIsFollowingGps(false);
      setCenter({ lat: pt.lat, lng: pt.lng });
      setLevel(7);
      if (mapRef.current) {
        mapRef.current.setCenter(new kakao.maps.LatLng(pt.lat, pt.lng));
        mapRef.current.setLevel(7);
      }
    }
  }, [focusSectionId, overviewSections]);

  useEffect(() => {
    if (detailRequestSectionId) {
      setDetailSheetSectionId(detailRequestSectionId);
      onClearDetailRequest();
    }
  }, [detailRequestSectionId, onClearDetailRequest]);

  // 8. Zoom & viewport BBox POI culling (level <= 8, capped at 80)
  const visiblePois = useMemo(() => {
    if (level >= 9) return [];
    const filtered = bounds
      ? mergedAllPois.filter(
          (p) =>
            typeof p.lat === 'number' &&
            typeof p.lng === 'number' &&
            p.lat >= bounds.swLat &&
            p.lat <= bounds.neLat &&
            p.lng >= bounds.swLng &&
            p.lng <= bounds.neLng
        )
      : mergedAllPois;
    return filtered.slice(0, MAX_VISIBLE_POIS);
  }, [level, bounds, mergedAllPois]);

  const loadedDetailPaths = useMemo(() => {
    const map: Record<number, TrailPoint[]> = {};
    for (const [idStr, detail] of Object.entries(detailCache)) {
      if (detail.points && detail.points.length > 0) {
        map[Number(idStr)] = detail.points;
      }
    }
    return map;
  }, [detailCache]);

  const currentSectionSummary = useMemo(
    () => sectionsSummary.find((s) => s.section_id === activeSectionId) || null,
    [sectionsSummary, activeSectionId]
  );

  const activeSectionDetail = activeSectionId ? detailCache[activeSectionId] || null : null;
  const activeSectionPois = useMemo(
    () => (activeSectionId ? mergedAllPois.filter((p) => p.section_id === activeSectionId) : []),
    [mergedAllPois, activeSectionId]
  );

  const detailSheetSection = detailSheetSectionId ? detailCache[detailSheetSectionId] || null : null;
  const detailSheetPois = useMemo(
    () =>
      detailSheetSectionId
        ? mergedAllPois.filter((p) => p.section_id === detailSheetSectionId)
        : [],
    [mergedAllPois, detailSheetSectionId]
  );

  const handleSetPoiAsTarget = (poi: POI) => {
    if (typeof poi.lat !== 'number' || typeof poi.lng !== 'number') return;
    const resolved = resolveNavigationTarget(trailIndex, {
      kind: 'poi',
      label: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      sectionId: poi.section_id,
      poiId: poi.id,
    });
    if (resolved) {
      setNavTarget(resolved);
      setSelectedPoi(null);
      onToast(`목적지 설정: ${poi.name}`, 'info');
    }
  };

  const handleFitRoute = () => {
    if (!mapRef.current || !navState?.target) return;
    const ref = gpsPos || navState.current.snappedPoint;
    const latLngBounds = new kakao.maps.LatLngBounds();
    latLngBounds.extend(new kakao.maps.LatLng(ref.lat, ref.lng));
    latLngBounds.extend(new kakao.maps.LatLng(navState.target.lat, navState.target.lng));
    setIsFollowingGps(false);
    mapRef.current.setBounds(latLngBounds);
  };

  const handleRecenterGps = () => {
    if (gpsPos) {
      setIsFollowingGps(true);
      setCenter(gpsPos);
      if (mapRef.current) {
        mapRef.current.setCenter(new kakao.maps.LatLng(gpsPos.lat, gpsPos.lng));
        if (level > 6) {
          mapRef.current.setLevel(6);
          setLevel(6);
        }
      }
    } else {
      onToast('GPS 위치를 수신 중입니다. 위치 권한을 확인해 주세요.', 'info');
    }
  };

  const handleSaveFacility = async (fac: POI) => {
    const targetSectionId = fac.section_id || activeSectionId || 1;
    try {
      const saved = await saveFacilityToDb(targetSectionId, fac);
      setUserPois((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
      });
      setSelectedPoi(saved);
      onToast(`'${saved.name}' 시설이 저장되었습니다.`, 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : '시설 저장에 실패했습니다.', 'error');
    }
  };

  const handleDeleteFacility = async (fac: POI) => {
    const targetSectionId = fac.section_id || activeSectionId || 1;
    try {
      await deleteFacilityFromDb(targetSectionId, fac);
      const updated = await getPoiRepository().getAllUserPois();
      setUserPois(updated);
      setSelectedPoi(null);
      onToast(`'${fac.name}' 시설이 삭제되었습니다.`, 'info');
    } catch (err) {
      onToast(err instanceof Error ? err.message : '시설 삭제에 실패했습니다.', 'error');
    }
  };

  const handleChangeMapMode = (mode: MapTypeMode) => {
    setMapMode(mode);
    saveMapMode(mode);
  };

  return (
    <div className="relative w-full h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden bg-slate-100">
      <div className="relative flex-1 min-h-0">
        <MapCanvas
          center={center}
          level={level}
          mapMode={mapMode}
          forceOffline={forceOffline}
          overviewSections={overviewSections}
          loadedDetailPaths={loadedDetailPaths}
          completedSectionIds={progress.completedSections}
          activeSectionId={activeSectionId}
          visiblePois={visiblePois}
          allPois={mergedAllPois}
          selectedPoi={selectedPoi}
          gpsPos={gpsPos}
          navState={navState}
          currentSection={currentSectionSummary}
          hoverPoint={hoverPoint}
          onMapReady={(map) => {
            mapRef.current = map;
          }}
          onViewportChange={handleViewportChange}
          onSelectPoi={setSelectedPoi}
          onSelectSectionBadge={(sectionId) => {
            const sec = overviewSections.find((s) => s.section_id === sectionId);
            const pt = sec?.path?.[Math.floor((sec.path?.length || 0) / 2)] || sec?.start_point;
            if (pt && mapRef.current) {
              setIsFollowingGps(false);
              mapRef.current.setCenter(new kakao.maps.LatLng(pt.lat, pt.lng));
              mapRef.current.setLevel(7);
              setLevel(7);
            }
          }}
          onMapClick={(lat, lng) => {
            setDraftCoord({ lat, lng });
          }}
          onRetryOnline={() => setForceOffline(false)}
          onSelectPoiTarget={handleSetPoiAsTarget}
          onOpenSectionDetail={(sectionId) => setDetailSheetSectionId(sectionId)}
        />

        {/* Top Live Navigation HUD */}
        {!forceOffline && (
          <NavigationHud
            navState={navState}
            currentSection={currentSectionSummary}
            isFollowingGps={isFollowingGps}
            onOpenSectionDetail={(sectionId) => setDetailSheetSectionId(sectionId)}
            onClearTarget={() => setNavTarget(null)}
            onFitRoute={handleFitRoute}
            onRecenterGps={handleRecenterGps}
          />
        )}

        {/* Right Floating Map Controls */}
        <div className="absolute right-3 bottom-4 z-20 flex flex-col gap-2">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl p-1 flex flex-col gap-1 shadow-lg">
            <button
              type="button"
              onClick={() => handleChangeMapMode('ROADMAP')}
              className={`p-2 rounded-xl text-xs font-bold cursor-pointer ${
                mapMode === 'ROADMAP' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="일반 지도"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleChangeMapMode('HYBRID')}
              className={`p-2 rounded-xl text-xs font-bold cursor-pointer ${
                mapMode === 'HYBRID' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="위성 지도"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleChangeMapMode('TERRAIN')}
              className={`p-2 rounded-xl text-xs font-bold cursor-pointer ${
                mapMode === 'TERRAIN' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="지형 지도"
            >
              <Mountain className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setForceOffline((prev) => !prev)}
            className={`p-2.5 rounded-2xl border shadow-lg cursor-pointer ${
              forceOffline
                ? 'bg-amber-500 text-slate-950 border-amber-300'
                : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
            title="오프라인 HUD 전환"
          >
            <WifiOff className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingFacility(null);
              setDraftCoord(gpsPos || center);
              setIsFacilityModalOpen(true);
            }}
            className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 shadow-lg cursor-pointer"
            title="현재 위치에 편의시설 등록"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Selected POI Bottom Popup Card */}
        {selectedPoi && !forceOffline && (
          <div className="absolute left-3 right-16 bottom-4 z-30 max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-3.5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-black text-gray-900 truncate">{selectedPoi.name}</div>
                <div className="text-xs text-gray-500">
                  {selectedPoi.section_id ? `${selectedPoi.section_id}구간` : ''}{' '}
                  {selectedPoi.is_official ? '· 공식' : '· 사용자 제보'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoi(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedPoi.photo_url && (
              <img
                src={selectedPoi.photo_url}
                alt={selectedPoi.name}
                loading="lazy"
                className="w-full h-28 object-cover rounded-xl border border-gray-200"
              />
            )}

            {(selectedPoi.phone || selectedPoi.business_hours) && (
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                {selectedPoi.phone && (
                  <a href={`tel:${selectedPoi.phone}`} className="flex items-center gap-1 text-emerald-700 font-bold">
                    <Phone className="w-3.5 h-3.5" />
                    {selectedPoi.phone}
                  </a>
                )}
                {selectedPoi.business_hours && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {selectedPoi.business_hours}
                  </span>
                )}
              </div>
            )}

            {selectedPoi.memo && (
              <p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-2 line-clamp-2">{selectedPoi.memo}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSetPoiAsTarget(selectedPoi)}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>목적지로 설정</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingFacility(selectedPoi);
                  setIsFacilityModalOpen(true);
                }}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                title="수정"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFacility(selectedPoi)}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Elevation Drawer (Current Section N) */}
      <ElevationDrawer
        sectionDetail={activeSectionDetail}
        sectionPois={activeSectionPois}
        onHoverPoint={setHoverPoint}
      />

      {/* On-Demand Section Detail Overlay Sheet */}
      <SectionDetailSheet
        isOpen={detailSheetSectionId !== null}
        section={detailSheetSection}
        allSections={sectionsSummary}
        progress={progress}
        facilities={detailSheetPois}
        onClose={() => setDetailSheetSectionId(null)}
        onNavigateSection={(sectionId) => setDetailSheetSectionId(sectionId)}
        onOpenCertModal={() => {
          if (detailSheetSectionId) onOpenCertModal(detailSheetSectionId);
        }}
        onFocusOnMap={(sectionId) => {
          const sec = overviewSections.find((s) => s.section_id === sectionId);
          const pt = sec?.path?.[Math.floor((sec.path?.length || 0) / 2)] || sec?.start_point;
          if (pt && mapRef.current) {
            setIsFollowingGps(false);
            mapRef.current.setCenter(new kakao.maps.LatLng(pt.lat, pt.lng));
            mapRef.current.setLevel(7);
            setLevel(7);
          }
        }}
        onAddFacility={handleSaveFacility}
        onRemoveFacility={(facilityId) => {
          const found = mergedAllPois.find((p) => p.id === facilityId);
          if (found) void handleDeleteFacility(found);
        }}
        onAddCheckpoint={onAddCheckpoint}
        onRemoveCheckpoint={onRemoveCheckpoint}
      />

      {/* POI Add / Edit Modal */}
      <FacilityModal
        isOpen={isFacilityModalOpen}
        onClose={() => {
          setIsFacilityModalOpen(false);
          setEditingFacility(null);
        }}
        onSubmit={handleSaveFacility}
        lat={editingFacility?.lat ?? draftCoord?.lat ?? gpsPos?.lat ?? center.lat}
        lng={editingFacility?.lng ?? draftCoord?.lng ?? gpsPos?.lng ?? center.lng}
        defaultSectionName={currentSectionSummary?.section_number || ''}
        initialFacility={editingFacility}
      />
    </div>
  );
};
