import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Map as KakaoMap,
  Polyline,
  CustomOverlayMap,
  MapTypeId,
  useKakaoLoader
} from 'react-kakao-maps-sdk';
import { SectionDetail, SectionSummary, POI, TrailPoint, FacilityCategory } from '../types';
import { FacilityModal } from '../components/FacilityModal';
import { MapScaleBar } from '../components/MapScaleBar';
import { CategoryIcon } from '../components/CategoryIcon';
import {
  getSavedMapMode,
  saveMapMode,
  getSavedElevationOpen,
  saveElevationOpen,
  MapTypeMode
} from '../utils/cookieStorage';
import {
  getDistanceMeters,
  getBearing,
  getBearingDirectionText,
  findNearestTrailPoint,
  calculateWalkingTime,
  playOffTrackWarningBeep
} from '../utils/trailMath';
import {
  Navigation,
  Plus,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  MapPin,
  Phone,
  Search,
  X,
  Maximize2,
  Map,
  Layers,
  Mountain,
  ChevronUp,
  ChevronDown,
  Edit3,
  Camera,
  Trash2,
  FlaskConical,
  Volume2,
  VolumeX,
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
  allSections?: SectionSummary[];
  userFacilities: POI[];
  onAddFacility: (facility: POI) => void;
  onRemoveFacility?: (facility: POI | string) => void;
  onNavigateSection?: (sectionId: number) => void;
  onBackToDetail: () => void;
}

export const TrailMapView: React.FC<TrailMapViewProps> = ({
  section,
  allSections = [],
  userFacilities,
  onAddFacility,
  onRemoveFacility,
  onNavigateSection,
  onBackToDetail
}) => {
  // Load Kakao SDK
  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: KAKAO_APP_KEY,
    libraries: ['services', 'clusterer']
  });

  const [mapMode, setMapModeState] = useState<MapTypeMode>(getSavedMapMode());
  const setMapMode = (mode: MapTypeMode) => {
    setMapModeState(mode);
    saveMapMode(mode);
  };

  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: section.start_point?.lat || 36.5,
    lng: section.start_point?.lng || 126.8
  });
  const [level, setLevel] = useState<number>(6);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [facSearchResults, setFacSearchResults] = useState<SearchResultItem[]>([]);
  const [kakaoSearchResults, setKakaoSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);

  // Elevation Profile Drawer State (Preserved in Cookie)
  const [isElevationOpen, setIsElevationOpenState] = useState(getSavedElevationOpen());
  const setIsElevationOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    setIsElevationOpenState((prev) => {
      const next = typeof open === 'function' ? open(prev) : open;
      saveElevationOpen(next);
      return next;
    });
  };
  const [hoveredPoint, setHoveredPoint] = useState<TrailPoint | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Adjacent 4 Sections (N-2, N-1, N+1, N+2) State
  const [allSectionsOverview, setAllSectionsOverview] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/all_sections_overview.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load sections overview');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setAllSectionsOverview(data);
        }
      })
      .catch((err) => console.warn('Adjacent sections fetch warning:', err));
  }, []);

  const adjacentSections = useMemo(() => {
    if (!allSectionsOverview || allSectionsOverview.length === 0) return [];

    const currentIndex = allSectionsOverview.findIndex(
      (s) => s.section_id === section.section_id || s.section_number === section.section_number
    );

    if (currentIndex === -1) return [];

    const results: Array<{
      section_id: number;
      section_number: string;
      title: string;
      path: Array<{ lat: number; lng: number; ele?: number }>;
      color: string;
      label: string;
    }> = [];

    const colorMap = {
      prev2: '#0284c7', // Sky Blue 600
      prev1: '#2563eb', // Blue 600
      next1: '#9333ea', // Purple 600
      next2: '#e11d48'  // Rose 600
    };

    // Previous 2 sections
    if (currentIndex - 2 >= 0) {
      const s = allSectionsOverview[currentIndex - 2];
      if (s.path && s.path.length > 0) {
        results.push({
          section_id: s.section_id,
          section_number: s.section_number,
          title: s.title,
          path: s.path,
          color: colorMap.prev2,
          label: `${s.section_number}`
        });
      }
    }

    // Previous 1 section
    if (currentIndex - 1 >= 0) {
      const s = allSectionsOverview[currentIndex - 1];
      if (s.path && s.path.length > 0) {
        results.push({
          section_id: s.section_id,
          section_number: s.section_number,
          title: s.title,
          path: s.path,
          color: colorMap.prev1,
          label: `${s.section_number}`
        });
      }
    }

    // Next 1 section
    if (currentIndex + 1 < allSectionsOverview.length) {
      const s = allSectionsOverview[currentIndex + 1];
      if (s.path && s.path.length > 0) {
        results.push({
          section_id: s.section_id,
          section_number: s.section_number,
          title: s.title,
          path: s.path,
          color: colorMap.next1,
          label: `${s.section_number}`
        });
      }
    }

    // Next 2 section
    if (currentIndex + 2 < allSectionsOverview.length) {
      const s = allSectionsOverview[currentIndex + 2];
      if (s.path && s.path.length > 0) {
        results.push({
          section_id: s.section_id,
          section_number: s.section_number,
          title: s.title,
          path: s.path,
          color: colorMap.next2,
          label: `${s.section_number}`
        });
      }
    }

    return results;
  }, [allSectionsOverview, section.section_id, section.section_number]);

  // Adjacent Sections POIs (Excluding Start and End Points)
  const [adjacentPois, setAdjacentPois] = useState<Array<POI & { sectionColor?: string; sectionName?: string }>>([]);

  useEffect(() => {
    if (!adjacentSections || adjacentSections.length === 0) {
      setAdjacentPois([]);
      return;
    }

    let isMounted = true;
    const loadAdjacentPois = async () => {
      try {
        const fetchedPois: Array<POI & { sectionColor?: string; sectionName?: string }> = [];

        await Promise.all(
          adjacentSections.map(async (adj) => {
            try {
              const res = await fetch(`${import.meta.env.BASE_URL}data/sections/section_${adj.section_id}.json`);
              if (!res.ok) return;
              const data = await res.json();
              if (Array.isArray(data.pois)) {
                const sName = (data.start_name || '').trim().toLowerCase();
                const eName = (data.end_name || '').trim().toLowerCase();

                const filtered = data.pois.filter((poi: POI) => {
                  const pName = (poi.name || '').trim().toLowerCase();
                  const pCat = (poi.category || '').toLowerCase();
                  // 시점, 종점 제외
                  if (pCat === 'start' || pCat === 'end' || pCat === 'start_point' || pCat === 'end_point') return false;
                  if (pName.endsWith('시점') || pName.endsWith('종점') || pName.includes('코스 시점') || pName.includes('코스 종점')) return false;
                  if (sName && pName === sName) return false;
                  if (eName && pName === eName) return false;
                  return true;
                });

                filtered.forEach((p: POI) => {
                  fetchedPois.push({
                    ...p,
                    sectionColor: adj.color,
                    sectionName: adj.section_number
                  });
                });
              }
            } catch (err) {
              console.warn(`Failed to load POIs for section ${adj.section_id}:`, err);
            }
          })
        );

        if (isMounted) {
          setAdjacentPois(fetchedPois);
        }
      } catch (err) {
        console.warn('Error loading adjacent POIs:', err);
      }
    };

    loadAdjacentPois();

    return () => {
      isMounted = false;
    };
  }, [adjacentSections]);

  // Dynamic Canvas Height to fit actual available mobile viewport
  const [containerHeight, setContainerHeight] = useState<string>('calc(100dvh - 56px)');

  useEffect(() => {
    const updateViewportHeight = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      setContainerHeight(`${Math.max(300, vh - 56)}px`);
    };

    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);
    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    window.visualViewport?.addEventListener('scroll', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
      window.visualViewport?.removeEventListener('scroll', updateViewportHeight);
    };
  }, []);

  // Test Mode Simulation State (Off-track alert & distance test without GPS)
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [mockLocation, setMockLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [testNearestPoint, setTestNearestPoint] = useState<{
    point: { lat: number; lng: number };
    distance: number;
  } | null>(null);
  const [testBearingInfo, setTestBearingInfo] = useState<{
    bearing: number;
    text: string;
    arrow: string;
  } | null>(null);
  const [testStartInfo, setTestStartInfo] = useState<{
    distanceKm: number;
    timeText: string;
  } | null>(null);
  const [testEndInfo, setTestEndInfo] = useState<{
    distanceKm: number;
    timeText: string;
  } | null>(null);
  const [testNotification, setTestNotification] = useState<string | null>(null);
  const offTrackTimerRef = useRef<any>(null);

  const clearOffTrackTimer = () => {
    if (offTrackTimerRef.current) {
      clearInterval(offTrackTimerRef.current);
      offTrackTimerRef.current = null;
    }
  };

  const handleToggleTestMode = () => {
    if (isTestMode) {
      setIsTestMode(false);
      setMockLocation(null);
      setTestNearestPoint(null);
      setTestBearingInfo(null);
      setTestStartInfo(null);
      setTestEndInfo(null);
      setTestNotification(null);
      clearOffTrackTimer();
    } else {
      setIsTestMode(true);
      setTestNotification('🧪 테스트 모드: 지도 클릭하여 가상 위치 지정');
    }
  };

  const handleTestLocationUpdate = useCallback(
    (coord: { lat: number; lng: number }) => {
      setMockLocation(coord);
      clearOffTrackTimer();

      if (!section.points || section.points.length === 0) return;

      // 1. Find nearest trail point & distance
      const nearestResult = findNearestTrailPoint(coord, section.points);
      if (!nearestResult) return;

      const nearestPoint = nearestResult.nearest;
      const distanceM = nearestResult.distanceM;
      setTestNearestPoint({ point: nearestPoint, distance: distanceM });

      // 2. Bearing from mock location to trail
      const bearing = getBearing(coord.lat, coord.lng, nearestPoint.lat, nearestPoint.lng);
      const dirText = getBearingDirectionText(bearing);
      setTestBearingInfo({ bearing, text: dirText.text, arrow: dirText.arrow });

      // 3. Distance & estimated walking time to Start Point
      if (section.start_point) {
        const startDistM = getDistanceMeters(
          coord.lat,
          coord.lng,
          section.start_point.lat,
          section.start_point.lng
        );
        const startDistKm = parseFloat((startDistM / 1000).toFixed(1));
        setTestStartInfo({
          distanceKm: startDistKm,
          timeText: calculateWalkingTime(startDistKm)
        });
      }

      // 4. Distance & estimated walking time to End Point
      if (section.end_point) {
        const endDistM = getDistanceMeters(
          coord.lat,
          coord.lng,
          section.end_point.lat,
          section.end_point.lng
        );
        const endDistKm = parseFloat((endDistM / 1000).toFixed(1));
        setTestEndInfo({
          distanceKm: endDistKm,
          timeText: calculateWalkingTime(endDistKm)
        });
      }

      // 5. Off-track check (> 50m) - Format: '<- 156m'
      if (distanceM > 50) {
        playOffTrackWarningBeep();
        const shortFormat = `${dirText.arrow} ${distanceM}m`;
        setTestNotification(`🚨 ${shortFormat}`);

        // 30 seconds repeat timer
        offTrackTimerRef.current = setInterval(() => {
          playOffTrackWarningBeep();
          setTestNotification(`🚨 ${shortFormat}`);
        }, 30000);
      } else {
        setTestNotification(`✅ ${distanceM}m (정상 경로)`);
      }
    },
    [section.points, section.start_point, section.end_point]
  );

  useEffect(() => {
    return () => {
      clearOffTrackTimer();
    };
  }, []);

  // GPS Tracking & In-App Toast
  const [gpsActive, setGpsActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [offTrackDist, setOffTrackDist] = useState<number | null>(null);
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);

  // Modals & Popups
  const [selectedFacility, setSelectedFacility] = useState<POI | null>(null);
  const [facilityToDelete, setFacilityToDelete] = useState<POI | null>(null);
  const [editingFacility, setEditingFacility] = useState<POI | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCoords, setModalCoords] = useState<{ lat: number; lng: number }>({
    lat: section.start_point?.lat || 36.5,
    lng: section.start_point?.lng || 126.8
  });

  // In-app confirm dialog for map long-press (no browser confirm)
  const [confirmRegisterOpen, setConfirmRegisterOpen] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number }>({
    lat: section.start_point?.lat || 36.5,
    lng: section.start_point?.lng || 126.8
  });

  // Long press timer & tracker specifically for the map canvas
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const kakaoMapRef = useRef<any>(null);
  const initialFitDoneRef = useRef<boolean>(false);

  // Combine official + user facilities (userFacilities already holds merged list from Supabase DB)
  const allFacilities: POI[] = userFacilities.length > 0 ? userFacilities : (section.pois || []);

  // Path coordinates for Kakao Polyline
  const kakaoPath = useMemo(() => {
    return (section.points || []).map((p) => ({ lat: p.lat, lng: p.lng }));
  }, [section.points]);

  // Sampled points for elevation profile SVG
  const elevationSamples = useMemo(() => {
    if (!section.points || section.points.length === 0) return [];
    const step = Math.max(1, Math.floor(section.points.length / 120));
    return section.points.filter((_, i) => i % step === 0);
  }, [section.points]);

  // Elevation min/max
  const { minEle, maxEle } = useMemo(() => {
    if (elevationSamples.length === 0) return { minEle: 0, maxEle: 100 };
    let min = Infinity;
    let max = -Infinity;
    elevationSamples.forEach((p) => {
      if (p.ele < min) min = p.ele;
      if (p.ele > max) max = p.ele;
    });
    return {
      minEle: Math.max(0, Math.floor(min)),
      maxEle: Math.max(min + 20, Math.ceil(max))
    };
  }, [elevationSamples]);

  // Fit bounds to current section
  const fitSectionBounds = useCallback(() => {
    if (!kakaoMapRef.current || !window.kakao || !window.kakao.maps || !section.points || section.points.length === 0) return;
    const bounds = new window.kakao.maps.LatLngBounds();
    section.points.forEach((p) => {
      bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng));
    });
    kakaoMapRef.current.setBounds(bounds);
    const c = kakaoMapRef.current.getCenter();
    setCenter({ lat: c.getLat(), lng: c.getLng() });
    setLevel(kakaoMapRef.current.getLevel());
  }, [section.points]);

  // Initial fit bounds when map is ready
  const onKakaoMapCreate = (map: any) => {
    kakaoMapRef.current = map;
    if (!initialFitDoneRef.current) {
      initialFitDoneRef.current = true;
      fitSectionBounds();
    }
  };

  // Search Executor: Triggered ONLY on Enter key or magnifying glass click
  const executeSearch = () => {
    const q = searchQuery.trim();
    if (!q) {
      setFacSearchResults([]);
      setKakaoSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const lowerQ = q.toLowerCase();

    // 1. Search facilities in this section
    const facResults: SearchResultItem[] = allFacilities
      .filter((fac) => {
        const nameMatch = fac.name.toLowerCase().includes(lowerQ);
        const catMatch = getCategoryLabel(fac.category).toLowerCase().includes(lowerQ);
        const descMatch = (fac.description || '').toLowerCase().includes(lowerQ);
        const memoMatch = (fac.memo || '').toLowerCase().includes(lowerQ);
        return nameMatch || catMatch || descMatch || memoMatch;
      })
      .map((fac, idx) => ({
        type: 'facility',
        id: `fac-${fac.id || idx}`,
        title: fac.name,
        categoryText: getCategoryLabel(fac.category),
        subText: fac.memo || fac.description || getCategoryLabel(fac.category),
        lat: fac.lat || 36.5,
        lng: fac.lng || 126.8,
        facilityData: fac
      }));

    setFacSearchResults(facResults);

    // 2. Search Kakao Places around current map center (with fallback to nationwide)
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      const places = new window.kakao.maps.services.Places();
      const currentMapCenter = kakaoMapRef.current
        ? kakaoMapRef.current.getCenter()
        : new window.kakao.maps.LatLng(center.lat, center.lng);

      const processKakaoData = (data: any[]) => {
        return (data || []).slice(0, 15).map((place) => ({
          type: 'kakao' as const,
          id: `kakao-${place.id}`,
          title: place.place_name,
          categoryText: place.category_group_name || '장소',
          subText: place.road_address_name || place.address_name,
          lat: parseFloat(place.y),
          lng: parseFloat(place.x)
        }));
      };

      // 1st attempt: within 30km of map center
      places.keywordSearch(
        q,
        (data: any[], status: any) => {
          if (status === window.kakao.maps.services.Status.OK && data && data.length > 0) {
            const kakaoItems = processKakaoData(data);
            setKakaoSearchResults(kakaoItems);
            setIsSearchOpen(true);
          } else {
            // 2nd attempt: nationwide fallback (in case user searches well-known place or district outside radius)
            places.keywordSearch(q, (data2: any[], status2: any) => {
              if (status2 === window.kakao.maps.services.Status.OK && data2 && data2.length > 0) {
                const kakaoItems = processKakaoData(data2);
                setKakaoSearchResults(kakaoItems);
              } else {
                setKakaoSearchResults([]);
              }
              setIsSearchOpen(facResults.length > 0 || (data2 && data2.length > 0));
            });
          }
        },
        {
          location: currentMapCenter,
          radius: 30000
        }
      );
    } else {
      setKakaoSearchResults([]);
      setIsSearchOpen(facResults.length > 0);
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    setIsSearchOpen(false);
    if (kakaoMapRef.current && window.kakao) {
      const targetLatLng = new window.kakao.maps.LatLng(item.lat, item.lng);
      kakaoMapRef.current.panTo(targetLatLng);
      kakaoMapRef.current.setLevel(4);
      setCenter({ lat: item.lat, lng: item.lng });
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
      setGpsErrorMessage(null);
      return;
    }

    if (!navigator.geolocation) {
      setGpsErrorMessage('현재 기기나 브라우저에서 GPS 위치 서비스를 지원하지 않습니다.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserLocation({ lat: uLat, lng: uLng });
        setGpsErrorMessage(null);

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
          setCenter({ lat: uLat, lng: uLng });
        }
      },
      (err) => {
        console.warn('GPS location error:', err);
        setGpsErrorMessage('GPS 신호를 수신할 수 없습니다.');
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

  // Map-only Long-press Detection (Accurate coordinates via projection coordsFromContainerPoint)
  const handleMapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTestMode) return; // Do not trigger facility registration while testing virtual positions
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    const clientX = e.clientX;
    const clientY = e.clientY;

    longPressTimerRef.current = setTimeout(() => {
      if (kakaoMapRef.current && mapContainerRef.current && window.kakao?.maps) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        const point = new window.kakao.maps.Point(clientX - rect.left, clientY - rect.top);
        const projection = kakaoMapRef.current.getProjection();
        if (projection) {
          const latlng = projection.coordsFromContainerPoint(point);
          setPendingCoords({ lat: latlng.getLat(), lng: latlng.getLng() });
          setConfirmRegisterOpen(true);
        }
      }
    }, 500);
  };

  const handleMapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchStartPosRef.current) return;
    const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
    if (dx > 8 || dy > 8) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleMapPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  // Facility Edit (Direct open without confirm prompt)
  const handleOpenEditFacility = (fac: POI) => {
    setSelectedFacility(null);
    setEditingFacility(fac);
    setModalCoords({ lat: fac.lat || center.lat, lng: fac.lng || center.lng });
    setIsModalOpen(true);
  };

  // Elevation Profile SVG Path Generator
  const chartWidth = 500;
  const chartHeight = 72;

  const { linePath, areaPath } = useMemo(() => {
    if (elevationSamples.length < 2) return { linePath: '', areaPath: '' };
    const eleRange = Math.max(1, maxEle - minEle);

    const points = elevationSamples.map((p, idx) => {
      const x = (idx / (elevationSamples.length - 1)) * chartWidth;
      const normalizedY = (p.ele - minEle) / eleRange;
      const y = chartHeight - normalizedY * (chartHeight - 14) - 6;
      return { x, y };
    });

    const lPath = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
    const aPath = `${lPath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

    return { linePath: lPath, areaPath: aPath };
  }, [elevationSamples, minEle, maxEle]);

  // Elevation SVG Hover & Mobile Touch tracking
  const updateElevationPoint = (clientX: number, clientY: number, target: SVGSVGElement | HTMLElement) => {
    if (elevationSamples.length === 0) return;
    const rect = target.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, relX / rect.width));
    const index = Math.min(elevationSamples.length - 1, Math.floor(ratio * elevationSamples.length));
    setHoveredPoint(elevationSamples[index]);
    setHoverCoord({ x: ratio * chartWidth, y: relY });
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.stopPropagation();
    updateElevationPoint(e.clientX, e.clientY, e.currentTarget);
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' || e.buttons > 0) {
      updateElevationPoint(e.clientX, e.clientY, e.currentTarget);
    }
  };

  const handleSvgTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      updateElevationPoint(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    }
  };

  const handleSvgTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      updateElevationPoint(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    }
  };

  return (
    <div
      className="relative w-full bg-slate-900 overflow-hidden select-none"
      style={{ height: containerHeight }}
    >
      {/* 1. Kakao Map Container with direct pointer tracking for accurate coordinates */}
      <div
        ref={mapContainerRef}
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={handleMapPointerUp}
        className="w-full h-full"
      >
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
            center={center}
            style={{ width: '100%', height: '100%' }}
            level={level}
            mapTypeId={mapMode === 'HYBRID' ? 'HYBRID' : 'ROADMAP'}
            onCreate={onKakaoMapCreate}
            onClick={(_target, mouseEvent) => {
              if (isTestMode) {
                const latlng = mouseEvent.latLng;
                const clickedCoord = { lat: latlng.getLat(), lng: latlng.getLng() };
                handleTestLocationUpdate(clickedCoord);
              }
            }}
            onCenterChanged={(map) => {
              const c = map.getCenter();
              setCenter({ lat: c.getLat(), lng: c.getLng() });
            }}
            onZoomChanged={(map) => {
              setLevel(map.getLevel());
            }}
            onRightClick={(_target, mouseEvent) => {
              const latlng = mouseEvent.latLng;
              setPendingCoords({ lat: latlng.getLat(), lng: latlng.getLng() });
              setConfirmRegisterOpen(true);
            }}
            className="w-full h-full z-10"
          >
            {/* Topographic Contour Overlay when in TERRAIN mode */}
            {mapMode === 'TERRAIN' && <MapTypeId type="TERRAIN" />}

            {/* Adjacent 4 Sections Polylines (Thinner line to strongly emphasize current section) */}
            {adjacentSections.map((adj) => {
              const midIndex = Math.floor(adj.path.length / 2);
              const midPoint = adj.path[midIndex] || adj.path[0];
              return (
                <React.Fragment key={`adj-${adj.section_id}`}>
                  {/* Subtle thin casing */}
                  <Polyline
                    path={adj.path.map((p) => ({ lat: p.lat, lng: p.lng }))}
                    strokeWeight={3.5}
                    strokeColor="#0f172a"
                    strokeOpacity={0.3}
                    strokeStyle="solid"
                  />
                  {/* Thinner line (weight: 2.2) to make current section stand out */}
                  <Polyline
                    path={adj.path.map((p) => ({ lat: p.lat, lng: p.lng }))}
                    strokeWeight={2.2}
                    strokeColor={adj.color}
                    strokeOpacity={0.75}
                    strokeStyle="solid"
                  />
                  {/* Clickable section badge */}
                  {midPoint && onNavigateSection && (
                    <CustomOverlayMap
                      position={{ lat: midPoint.lat, lng: midPoint.lng }}
                      yAnchor={0.5}
                      zIndex={25}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateSection(adj.section_id);
                        }}
                        style={{ backgroundColor: adj.color }}
                        className="text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/80 hover:scale-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
                        title={`${adj.title} (클릭하여 이동)`}
                      >
                        <span>{adj.label}</span>
                      </button>
                    </CustomOverlayMap>
                  )}
                </React.Fragment>
              );
            })}

            {/* High contrast dark halo casing for Current Trail */}
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

            {/* Start Point Badge with Name & Distance/Walking Time */}
            {section.start_point && (
              <CustomOverlayMap position={section.start_point} yAnchor={1.2}>
                <div className="flex flex-col items-center select-none">
                  <div className="bg-slate-900/95 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-lg border-2 border-emerald-400 whitespace-nowrap flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>시점: {section.start_name || `${section.section_number} 시점`}</span>
                  </div>
                  {/* Distance & Walking Time from Current / Mock Location */}
                  {testStartInfo && (
                    <div className="mt-1 bg-emerald-950/90 text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-lg border border-emerald-500/50 shadow-md whitespace-nowrap animate-in fade-in">
                      현위치에서 {testStartInfo.distanceKm}km ({testStartInfo.timeText})
                    </div>
                  )}
                </div>
              </CustomOverlayMap>
            )}

            {/* End Point Badge with Name & Distance/Walking Time */}
            {section.end_point && (
              <CustomOverlayMap position={section.end_point} yAnchor={1.2}>
                <div className="flex flex-col items-center select-none">
                  <div className="bg-slate-900/95 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-lg border-2 border-orange-400 whitespace-nowrap flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span>종점: {section.end_name || `${section.section_number} 종점`}</span>
                  </div>
                  {/* Distance & Walking Time from Current / Mock Location */}
                  {testEndInfo && (
                    <div className="mt-1 bg-orange-950/90 text-orange-300 font-bold text-[10px] px-2 py-0.5 rounded-lg border border-orange-500/50 shadow-md whitespace-nowrap animate-in fade-in">
                      현위치에서 {testEndInfo.distanceKm}km ({testEndInfo.timeText})
                    </div>
                  )}
                </div>
              </CustomOverlayMap>
            )}

            {/* Facility Markers */}
            {allFacilities.map((fac, idx) => {
              if (!fac.lat || !fac.lng) return null;
              
              // 다중 카테고리 목록 정규화 (fac.categories 우선, 없으면 fac.category 단일)
              const catList: FacilityCategory[] = Array.isArray(fac.categories) && fac.categories.length > 0
                ? (fac.categories as FacilityCategory[])
                : [(fac.category as FacilityCategory) || 'other'];

              return (
                <CustomOverlayMap
                  key={fac.id || idx}
                  position={{ lat: fac.lat, lng: fac.lng }}
                  yAnchor={1.1}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFacility(fac);
                    }}
                    className="flex flex-col items-center group cursor-pointer hover:scale-110 hover:z-30 transition-all select-none"
                  >
                    {/* 상단: 약간 더 커진 시설 아이콘 뱃지들 (여러 개일 경우 가로 나열) */}
                    <div className="flex items-center -space-x-1.5 p-0.5 bg-white/95 rounded-full shadow-md border border-slate-300 group-hover:border-emerald-500 transition-colors">
                      {catList.map((catKey, cIdx) => (
                        <CategoryIcon
                          key={`${catKey}-${cIdx}`}
                          category={catKey}
                          size="sm"
                          variant="solid"
                          className="border border-white shadow-xs"
                        />
                      ))}
                    </div>

                    {/* 하단: 줄바꿈된 시설명 라벨 캡슐 */}
                    <div className="mt-0.5 px-2 py-0.5 bg-slate-900/90 text-white font-bold text-[10px] sm:text-[11px] rounded-md shadow-md border border-slate-700/80 whitespace-nowrap leading-tight group-hover:bg-emerald-700 group-hover:border-emerald-400 transition-colors">
                      {fac.name}
                    </div>
                  </div>
                </CustomOverlayMap>
              );
            })}

            {/* Adjacent Sections POIs (Excluding Start and End Points) */}
            {adjacentPois.map((fac, idx) => {
              if (!fac.lat || !fac.lng) return null;
              const catList: FacilityCategory[] = Array.isArray(fac.categories) && fac.categories.length > 0
                ? (fac.categories as FacilityCategory[])
                : [(fac.category as FacilityCategory) || 'other'];

              return (
                <CustomOverlayMap
                  key={`adj-poi-${fac.id || idx}`}
                  position={{ lat: fac.lat, lng: fac.lng }}
                  yAnchor={1.1}
                  zIndex={28}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFacility(fac);
                    }}
                    className="flex flex-col items-center group cursor-pointer hover:scale-110 hover:z-30 transition-all select-none opacity-90 hover:opacity-100"
                  >
                    {/* 상단: 인접 구간 고유 색상 링이 둘러진 소형 아이콘 */}
                    <div
                      style={{ borderColor: fac.sectionColor || '#94a3b8' }}
                      className="flex items-center -space-x-1 p-0.5 bg-white/95 rounded-full shadow border-2 group-hover:scale-105 transition-transform"
                    >
                      {catList.map((catKey, cIdx) => (
                        <CategoryIcon
                          key={`adj-${catKey}-${cIdx}`}
                          category={catKey}
                          size="sm"
                          variant="solid"
                          className="border border-white scale-90"
                        />
                      ))}
                    </div>

                    {/* 하단: 시설명 라벨 (인접 구간 번호 소형 태그 포함) */}
                    <div className="mt-0.5 px-1.5 py-0.5 bg-slate-900/85 text-slate-200 font-semibold text-[9.5px] rounded-md shadow border border-slate-700/60 whitespace-nowrap leading-tight group-hover:bg-slate-800 transition-colors flex items-center gap-1">
                      {fac.sectionName && (
                        <span
                          style={{ color: fac.sectionColor || '#38bdf8' }}
                          className="font-bold text-[8.5px]"
                        >
                          {fac.sectionName}
                        </span>
                      )}
                      <span>{fac.name}</span>
                    </div>
                  </div>
                </CustomOverlayMap>
              );
            })}

            {/* Elevation Profile Hover Marker (High contrast neon style for vivid visibility) */}
            {hoveredPoint && (
              <CustomOverlayMap
                position={{ lat: hoveredPoint.lat, lng: hoveredPoint.lng }}
                yAnchor={0.5}
                zIndex={50}
              >
                <div className="relative flex flex-col items-center select-none">
                  {/* Neon Cyan & Neon Yellow Triple Pulsing Rings */}
                  <div className="w-8 h-8 rounded-full bg-cyan-400/40 animate-ping absolute -top-1.5" />
                  <div className="w-5 h-5 rounded-full bg-amber-300/80 animate-ping absolute" />
                  {/* High Visibility Vivid Amber & White Pin Core */}
                  <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-2xl relative z-10" />
                  {/* High contrast bold label */}
                  <div className="mt-1 px-2.5 py-0.5 bg-slate-950 text-amber-300 font-black text-[11px] rounded-lg shadow-2xl whitespace-nowrap border-2 border-amber-400 flex items-center gap-1 animate-in zoom-in-95">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>{hoveredPoint.dist}km · {hoveredPoint.ele}m</span>
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

            {/* Test Mode: Virtual Mock Location Pin & Shortest Connector to Trail */}
            {isTestMode && mockLocation && testNearestPoint && (
              <>
                {/* Dashed connector line to nearest trail point */}
                <Polyline
                  path={[mockLocation, testNearestPoint.point]}
                  strokeWeight={3}
                  strokeColor={testNearestPoint.distance > 50 ? '#f43f5e' : '#a855f7'}
                  strokeOpacity={0.9}
                  strokeStyle="dash"
                />

                {/* Nearest Trail Point on Course (Flashing purple dot) */}
                <CustomOverlayMap position={testNearestPoint.point} yAnchor={0.5} zIndex={45}>
                  <div className="relative flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-purple-500/50 animate-ping absolute" />
                    <div className="w-3 h-3 rounded-full bg-purple-600 border-2 border-white shadow-md" />
                  </div>
                </CustomOverlayMap>

                {/* Virtual Mock Location Pin with Direction & Distance Badge (Format: '<- 156m') */}
                <CustomOverlayMap position={mockLocation} yAnchor={1.15} zIndex={50}>
                  <div className="flex flex-col items-center select-none animate-in zoom-in-90 duration-150">
                    <div
                      className={`px-2.5 py-1 rounded-xl shadow-xl border-2 border-white text-white font-black text-xs flex items-center gap-1.5 whitespace-nowrap ${
                        testNearestPoint.distance > 50
                          ? 'bg-rose-600 animate-bounce'
                          : 'bg-purple-600'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>
                        {testBearingInfo ? `${testBearingInfo.arrow} ` : ''}{testNearestPoint.distance}m
                      </span>
                    </div>
                    {/* Pin Marker Arrow Point */}
                    <div
                      className={`w-3 h-3 rotate-45 -mt-1.5 border-r-2 border-b-2 border-white shadow-sm ${
                        testNearestPoint.distance > 50 ? 'bg-rose-600' : 'bg-purple-600'
                      }`}
                    />
                  </div>
                </CustomOverlayMap>
              </>
            )}
          </KakaoMap>
        )}
      </div>

      {/* Top Floating Controls Bar (Stops propagation to prevent map long-press) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          {/* Search Box with Search Button */}
          <div className="relative flex-1">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') executeSearch();
                }}
                placeholder="시설명 또는 지명 검색 (예: 화장실, 쉼터)"
                className="w-full pl-3 pr-16 py-2 bg-slate-900/90 text-white placeholder-slate-400 text-xs rounded-xl shadow-lg border border-slate-700/80 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFacSearchResults([]);
                      setKakaoSearchResults([]);
                      setIsSearchOpen(false);
                      setSearchedPlace(null);
                    }}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={executeSearch}
                  className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                  title="검색 실행"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Dropdown Results: Grouped by Facility vs Kakao Places */}
            {isSearchOpen && (facSearchResults.length > 0 || kakaoSearchResults.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-xl shadow-2xl z-40 divide-y divide-slate-800">
                {/* 1. Section Facilities Group */}
                {facSearchResults.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 bg-slate-800/90 text-emerald-400 font-bold text-[11px] flex items-center justify-between border-b border-slate-700/60 sticky top-0 z-10 backdrop-blur-md">
                      <span>🚩 구간 내 시설 & 명소</span>
                      <span className="text-[10px] bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-600/40 text-emerald-300">
                        {facSearchResults.length}건
                      </span>
                    </div>
                    {facSearchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectResult(item)}
                        className="w-full text-left p-2.5 hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 cursor-pointer border-b border-slate-800/50"
                      >
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {item.categoryText}
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

                {/* 2. Kakao Map Places Group */}
                {kakaoSearchResults.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 bg-slate-800/90 text-amber-400 font-bold text-[11px] flex items-center justify-between border-b border-slate-700/60 sticky top-0 z-10 backdrop-blur-md">
                      <span>🔍 카카오 지도 검색 결과</span>
                      <span className="text-[10px] bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-600/40 text-amber-300">
                        {kakaoSearchResults.length}건
                      </span>
                    </div>
                    {kakaoSearchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectResult(item)}
                        className="w-full text-left p-2.5 hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 cursor-pointer border-b border-slate-800/50"
                      >
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.categoryText}
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
            )}
          </div>

          {/* Section Direct Navigation Combo Box */}
          {allSections && allSections.length > 0 && onNavigateSection && (
            <div className="relative shrink-0">
              <select
                value={section.section_id}
                onChange={(e) => onNavigateSection(Number(e.target.value))}
                className="appearance-none bg-slate-900/95 text-emerald-400 font-extrabold text-xs pl-3 pr-6 py-2 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                title="구간 바로 이동"
              >
                {allSections
                  .filter((s) => s.is_opened !== false)
                  .map((s) => (
                    <option key={s.section_id} value={s.section_id} className="bg-slate-900 text-white font-semibold">
                      {s.section_number} ({s.region.replace(/,/g, ' ').trim().split(/\s+/)[0]})
                    </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>
          )}

          {/* 3-way Map Mode Switcher as Icons: Map / Layers / Mountain */}
          <div className="flex items-center bg-slate-900/95 p-1 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md shrink-0 gap-1">
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

        {/* Off Track Warning */}
        {gpsActive && offTrackDist !== null && offTrackDist > 50 && (
          <div className="self-center bg-rose-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-rose-400 backdrop-blur-md flex items-center gap-1.5 animate-bounce">
            <AlertTriangle className="w-4 h-4" />
            <span>경로 이탈 주의: 코스에서 {offTrackDist}m 벗어났습니다!</span>
          </div>
        )}

        {/* Test Mode Notification & Repeat Alarm Banner */}
        {isTestMode && testNotification && (
          <div className="self-center bg-purple-950/95 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-2xl border border-purple-400 backdrop-blur-md flex items-center gap-2 animate-in fade-in">
            <FlaskConical className="w-4 h-4 text-purple-300 shrink-0 animate-pulse" />
            <span className="leading-tight">{testNotification}</span>
            <button
              onClick={() => playOffTrackWarningBeep()}
              className="ml-1 p-1 bg-purple-700/80 hover:bg-purple-600 rounded-md text-[10px] text-white cursor-pointer transition-colors"
              title="비프음 수동 테스트"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* GPS Error Toast */}
        {gpsErrorMessage && (
          <div className="self-center bg-amber-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-amber-400 backdrop-blur-md flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>{gpsErrorMessage}</span>
          </div>
        )}
      </div>

      {/* Floating Map Controls (Right Side, Stops propagation) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-16 right-3 z-30 flex flex-col gap-2"
      >
        {/* Test Mode Toggle Button (Off-track alert simulation without GPS) */}
        <button
          onClick={handleToggleTestMode}
          className={`p-2.5 rounded-xl shadow-xl border backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
            isTestMode
              ? 'bg-purple-600 text-white border-purple-300 ring-4 ring-purple-500/40 animate-pulse'
              : 'bg-slate-900/90 text-white border-slate-700/80 hover:bg-slate-800'
          }`}
          title={isTestMode ? '테스트 모드 끄기' : '이탈 경보 & 거리/소요시간 시뮬레이션 Test 모드'}
        >
          <FlaskConical className={`w-5 h-5 ${isTestMode ? 'text-white' : 'text-purple-400'}`} />
        </button>

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

        {/* Fit Section Bounds */}
        <button
          onClick={fitSectionBounds}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="구간 전체 맞추기"
        >
          <Maximize2 className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Zoom In (+) */}
        <button
          onClick={zoomIn}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="지도 확대 (+)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out (-) */}
        <button
          onClick={zoomOut}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white shadow-lg border border-slate-700/80 backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="지도 축소 (-)"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      {/* Elevation Profile Drawer Toggle Button (Positioned safely above mobile browser toolbar) */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          setIsElevationOpen((prev) => {
            const next = !prev;
            if (!next) {
              setHoveredPoint(null);
              setHoverCoord(null);
            }
            return next;
          });
        }}
        style={{
          bottom: isElevationOpen
            ? 'calc(170px + env(safe-area-inset-bottom, 0px))'
            : 'calc(48px + env(safe-area-inset-bottom, 0px))'
        }}
        className={`absolute left-4 px-3.5 py-2 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700/80 shadow-xl backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer ${
          isElevationOpen ? 'z-30' : 'z-20'
        }`}
        title="고도 프로파일 열기/닫기"
      >
        <span>고도 프로파일</span>
        {isElevationOpen ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronUp className="w-4 h-4 text-emerald-400" />}
      </button>

      {/* Map Scale Bar (Always positioned ABOVE the elevation profile button & drawer) */}
      <div
        style={{
          bottom: isElevationOpen
            ? 'calc(216px + env(safe-area-inset-bottom, 0px))'
            : 'calc(94px + env(safe-area-inset-bottom, 0px))'
        }}
        className={`absolute left-4 transition-all duration-200 ${isElevationOpen ? 'z-30' : 'z-20'}`}
      >
        <MapScaleBar level={level} />
      </div>

      {/* Elevation Profile Drawer (Compact integrated chart, high-contrast neon drag indicator) */}
      {isElevationOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            bottom: 'calc(44px + env(safe-area-inset-bottom, 0px))'
          }}
          className="absolute left-3 right-3 z-30 bg-slate-900/95 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl border border-slate-700/80 text-white animate-in slide-in-from-bottom duration-200"
        >
          {/* SVG Gradient Area & Line Chart Container */}
          <div className="relative w-full h-24 bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800">
            {/* Integrated Header inside Chart */}
            <div className="absolute top-1.5 left-2.5 z-10 flex items-center gap-2 pointer-events-none">
              <span className="font-extrabold text-white text-xs tracking-tight bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700/60 shadow-xs">
                고도 프로파일
              </span>
              <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] shadow-xs transition-all ${
                hoveredPoint
                  ? 'bg-amber-400 text-slate-950 font-black border-2 border-amber-300 scale-105'
                  : 'text-emerald-300 bg-slate-900/80 border border-emerald-500/30'
              }`}>
                {hoveredPoint
                  ? `📍 ${hoveredPoint.dist}km 지점 · ${hoveredPoint.ele}m`
                  : `최고 ${section.max_elevation_m || maxEle}m · 최저 ${section.min_elevation_m || minEle}m`}
              </span>
            </div>

            {/* Close Button inside Chart */}
            <button
              onClick={() => {
                setIsElevationOpen(false);
                setHoveredPoint(null);
                setHoverCoord(null);
              }}
              className="absolute top-1.5 right-1.5 z-10 text-slate-400 hover:text-white p-1 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 shadow-xs cursor-pointer transition-colors"
              title="닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* SVG Chart (Touch drag enabled for mobile apps & pointer support) */}
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              className="w-full h-full cursor-crosshair touch-none select-none"
              style={{ touchAction: 'none' }}
              onPointerDown={handleSvgPointerDown}
              onPointerMove={handleSvgPointerMove}
              onTouchStart={handleSvgTouchStart}
              onTouchMove={handleSvgTouchMove}
              onPointerLeave={(e) => {
                if (e.pointerType === 'mouse') {
                  setHoveredPoint(null);
                  setHoverCoord(null);
                }
              }}
            >
              <defs>
                {/* Vertical Elevation Gradient */}
                <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#047857" stopOpacity="0.80" />
                  <stop offset="60%" stopColor="#064e3b" stopOpacity="0.50" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.90" />
                </linearGradient>

                {/* High contrast Neon Yellow & Cyan Column Glow */}
                <linearGradient id="cursorColumnGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                  <stop offset="50%" stopColor="#facc15" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              {areaPath && (
                <path d={areaPath} fill="url(#elevationGrad)" />
              )}

              {/* Symmetric high-contrast neon vertical band around drag line */}
              {hoverCoord && (
                <rect
                  x={Math.max(0, hoverCoord.x - 22)}
                  y={0}
                  width={44}
                  height={chartHeight}
                  fill="url(#cursorColumnGlow)"
                  pointerEvents="none"
                />
              )}

              {/* Thin line path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* High-visibility Neon Yellow vertical guide line centered at cursor */}
              {hoverCoord && (
                <g pointerEvents="none">
                  {/* Outer bright neon yellow line */}
                  <line
                    x1={hoverCoord.x}
                    y1={0}
                    x2={hoverCoord.x}
                    y2={chartHeight}
                    stroke="#fde047"
                    strokeWidth="2.2"
                    opacity="1"
                  />
                  {/* Inner crisp white core */}
                  <line
                    x1={hoverCoord.x}
                    y1={0}
                    x2={hoverCoord.x}
                    y2={chartHeight}
                    stroke="#ffffff"
                    strokeWidth="0.8"
                    opacity="0.95"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Bottom Center Hint: "길게 클릭 = 새로운 시설 등록" (Positioned safely above browser bottom toolbar) */}
      <div
        style={{
          bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))'
        }}
        className="absolute left-1/2 -translate-x-1/2 z-20 px-3.5 py-1 bg-slate-900/85 backdrop-blur-md rounded-full border border-slate-700/80 text-[11px] font-semibold text-slate-300 shadow-xl pointer-events-none whitespace-nowrap"
      >
        길게 클릭 = 새로운 시설 등록
      </div>

      {/* Facility Selected Popup Modal with Photo Support */}
      {selectedFacility && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-3.5 text-white animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(selectedFacility.categories && selectedFacility.categories.length > 0
                    ? selectedFacility.categories
                    : [selectedFacility.category]
                  ).map((cat) => (
                    <span
                      key={cat}
                      className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded"
                    >
                      {getCategoryLabel(cat)}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg font-black text-white mt-1.5">
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

            {/* Photo Preview if Available */}
            {selectedFacility.photo_url ? (
              <div className="w-full h-44 rounded-2xl overflow-hidden border border-slate-700 shadow-inner bg-slate-950">
                <img
                  src={selectedFacility.photo_url}
                  alt={selectedFacility.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full py-4 rounded-xl border border-dashed border-slate-800 flex items-center justify-center gap-2 text-slate-500 text-xs">
                <Camera className="w-4 h-4" />
                <span>등록된 사진 없음</span>
              </div>
            )}

            {/* Description & Memo */}
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

            {/* Actions: Phone & Edit & Delete */}
            <div className="flex items-center gap-2 pt-1">
              {selectedFacility.phone && (
                <a
                  href={`tel:${selectedFacility.phone}`}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>전화걸기</span>
                </a>
              )}
              <button
                onClick={() => handleOpenEditFacility(selectedFacility)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>수정</span>
              </button>
              <button
                onClick={() => setFacilityToDelete(selectedFacility)}
                className="px-3.5 py-2.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="시설 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app Confirm Dialog for Facility Deletion */}
      {facilityToDelete && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="bg-slate-900 border border-rose-700/60 rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>시설 삭제 확인</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-white">[{facilityToDelete.name}]</span> 포인트를 삭제하시겠습니까?
              <br />
              <span className="text-[11px] text-slate-400 mt-1 block">
                삭제된 포인트는 향후 데이터 갱신 시에도 다시 나타나지 않습니다.
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onRemoveFacility && facilityToDelete) {
                    onRemoveFacility(facilityToDelete);
                  }
                  setFacilityToDelete(null);
                  setSelectedFacility(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer text-white"
              >
                예, 삭제합니다
              </button>
              <button
                onClick={() => setFacilityToDelete(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app Confirm Dialog for Map Long-Press (No browser confirm, No origin text) */}
      {confirmRegisterOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4 text-white animate-in zoom-in-95">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📍</span> 새 편의시설 등록
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              선택하신 위치에 새로운 편의시설 또는 명소를 등록하시겠습니까?
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setConfirmRegisterOpen(false);
                  setEditingFacility(null);
                  setModalCoords(pendingCoords);
                  setIsModalOpen(true);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                등록하기
              </button>
              <button
                onClick={() => setConfirmRegisterOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facility Registration & Edit Modal */}
      <FacilityModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFacility(null);
        }}
        onSubmit={(fac) => {
          onAddFacility(fac);
          setIsModalOpen(false);
          setEditingFacility(null);
        }}
        onDelete={(fac) => {
          if (onRemoveFacility) {
            onRemoveFacility(fac);
          }
          setIsModalOpen(false);
          setEditingFacility(null);
          setSelectedFacility(null);
        }}
        lat={modalCoords.lat}
        lng={modalCoords.lng}
        defaultSectionName={section.section_number}
        initialFacility={editingFacility}
      />
    </div>
  );
};

function getCategoryLabel(category?: string): string {
  switch (category) {
    case 'viewpoint': return '명소';
    case 'restaurant': return '음식료';
    case 'transport': return '교통';
    case 'lodging': return '숙소/야영';
    case 'cert_center': return '안내소';
    case 'mart': return '마트';
    case 'toilet': return '화장실';
    case 'shelter': return '기타';
    case 'other': return '기타';
    default: return '명소';
  }
}
