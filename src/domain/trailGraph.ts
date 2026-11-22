import type {
  SectionSummary,
  OverviewSection,
  TrailProjection,
  NavigationTarget,
  NavigationState,
} from '../types';
import { getExactDistanceMeters, findNearestTrailPoint } from '../utils/trailMath';

export const HYSTERESIS_METERS = 50;
export const OFF_TRAIL_APPROACH_THRESHOLD_M = 50;

export interface IndexedSection {
  sectionId: number;
  sectionNumber: string;
  title: string;
  region: string;
  isOpened: boolean;
  officialDistanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  startKm: number;
  endKm: number;
  path: Array<{ lat: number; lng: number }>;
  cumulativePathKm: number[];
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
}

export interface TrailIndex {
  sections: IndexedSection[];
  byId: Map<number, IndexedSection>;
  totalKm: number;
}

/**
 * Munter/Tobler walking ETA formula matching SectionDetailView.tsx:
 * hours = dist/3.5 + gain/400 + loss/800
 */
export function calculateMunterEtaMinutes(
  distanceKm: number,
  gainM: number,
  lossM: number
): number {
  const safeDist = Math.max(0, distanceKm);
  const safeGain = Math.max(0, gainM);
  const safeLoss = Math.max(0, lossM);
  if (safeDist === 0 && safeGain === 0 && safeLoss === 0) return 0;
  const hours = safeDist / 3.5 + safeGain / 400 + safeLoss / 800;
  return Math.round(hours * 60);
}

export function buildTrailIndex(
  summaries: SectionSummary[],
  overview: OverviewSection[]
): TrailIndex {
  const overviewById = new Map<number, OverviewSection>();
  for (const item of overview) {
    overviewById.set(item.section_id, item);
  }

  const sortedSummaries = [...summaries].sort((a, b) => a.section_id - b.section_id);
  const sections: IndexedSection[] = [];
  const byId = new Map<number, IndexedSection>();
  let cursorKm = 0;

  for (const summary of sortedSummaries) {
    const ov = overviewById.get(summary.section_id);
    const officialKm = Math.max(0, Number(summary.official_distance_km) || 0);
    const startKm = cursorKm;
    const endKm = cursorKm + officialKm;
    cursorKm = endKm;

    const rawPath = Array.isArray(ov?.path)
      ? ov!.path.filter(
          (pt) => typeof pt?.lat === 'number' && typeof pt?.lng === 'number' && !Number.isNaN(pt.lat) && !Number.isNaN(pt.lng)
        )
      : [];

    const cumulativePathKm: number[] = [];
    let bbox: IndexedSection['bbox'] = null;

    if (rawPath.length > 0) {
      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;
      let accMeters = 0;

      for (let i = 0; i < rawPath.length; i++) {
        const pt = rawPath[i];
        if (pt.lat < minLat) minLat = pt.lat;
        if (pt.lat > maxLat) maxLat = pt.lat;
        if (pt.lng < minLng) minLng = pt.lng;
        if (pt.lng > maxLng) maxLng = pt.lng;

        if (i > 0) {
          accMeters += getExactDistanceMeters(
            rawPath[i - 1].lat,
            rawPath[i - 1].lng,
            pt.lat,
            pt.lng
          );
        }
        cumulativePathKm.push(accMeters / 1000);
      }

      bbox = { minLat, maxLat, minLng, maxLng };
    }

    const indexed: IndexedSection = {
      sectionId: summary.section_id,
      sectionNumber: summary.section_number,
      title: summary.title,
      region: summary.region,
      isOpened: summary.is_opened !== false,
      officialDistanceKm: officialKm,
      elevationGainM: Math.max(0, Number(summary.elevation_gain_m) || 0),
      elevationLossM: Math.max(0, Number(summary.elevation_loss_m) || 0),
      startKm,
      endKm,
      path: rawPath.map((p) => ({ lat: p.lat, lng: p.lng })),
      cumulativePathKm,
      bbox,
    };

    sections.push(indexed);
    byId.set(indexed.sectionId, indexed);
  }

  return { sections, byId, totalKm: cursorKm };
}

function projectOntoSection(
  sec: IndexedSection,
  lat: number,
  lng: number
): TrailProjection | null {
  if (sec.path.length === 0) return null;
  const hit = findNearestTrailPoint({ lat, lng }, sec.path);
  if (!hit) return null;

  const totalPathKm = sec.cumulativePathKm[sec.cumulativePathKm.length - 1] || 0;
  const ratio =
    totalPathKm > 0
      ? Math.min(1, Math.max(0, (sec.cumulativePathKm[hit.index] || 0) / totalPathKm))
      : 0;
  const trailKm = sec.startKm + ratio * sec.officialDistanceKm;

  return {
    sectionId: sec.sectionId,
    trailKm,
    offTrailM: hit.distanceM,
    snappedPoint: { lat: hit.nearest.lat, lng: hit.nearest.lng },
  };
}

/**
 * Project GPS coordinate onto the 55-section 1D trail graph with 50m hysteresis.
 * Safely skips unopened sections that have empty path geometry.
 */
export function projectToTrail(
  index: TrailIndex,
  lat: number,
  lng: number,
  lockedSectionId?: number | null
): TrailProjection | null {
  if (lockedSectionId != null) {
    const locked = index.byId.get(lockedSectionId);
    if (locked && locked.path.length > 0) {
      const lockedProj = projectOntoSection(locked, lat, lng);
      if (lockedProj && lockedProj.offTrailM <= HYSTERESIS_METERS) {
        return lockedProj;
      }
    }
  }

  let best: TrailProjection | null = null;
  for (const sec of index.sections) {
    if (sec.path.length === 0) continue;
    const proj = projectOntoSection(sec, lat, lng);
    if (proj && (!best || proj.offTrailM < best.offTrailM)) {
      best = proj;
    }
  }

  return best;
}

/**
 * Resolve a target POI or map point into a NavigationTarget anchored on the 1D trailKm graph.
 */
export function resolveNavigationTarget(
  index: TrailIndex,
  input: {
    kind: 'poi' | 'point';
    label: string;
    lat: number;
    lng: number;
    sectionId?: number;
    poiId?: string;
  }
): NavigationTarget | null {
  const hintSec = input.sectionId ? index.byId.get(input.sectionId) : undefined;
  if (hintSec) {
    if (hintSec.path.length > 0) {
      const proj = projectOntoSection(hintSec, input.lat, input.lng);
      if (proj) {
        return {
          kind: input.kind,
          label: input.label,
          sectionId: hintSec.sectionId,
          trailKm: proj.trailKm,
          lat: input.lat,
          lng: input.lng,
          poiId: input.poiId,
        };
      }
    } else {
      // Unopened section without polyline: anchor at section midpoint
      return {
        kind: input.kind,
        label: input.label,
        sectionId: hintSec.sectionId,
        trailKm: (hintSec.startKm + hintSec.endKm) / 2,
        lat: input.lat,
        lng: input.lng,
        poiId: input.poiId,
      };
    }
  }

  const proj = projectToTrail(index, input.lat, input.lng);
  if (!proj) return null;

  return {
    kind: input.kind,
    label: input.label,
    sectionId: proj.sectionId,
    trailKm: proj.trailKm,
    lat: input.lat,
    lng: input.lng,
    poiId: input.poiId,
  };
}

/**
 * Compute navigation state from current trail projection to optional destination.
 * Direction (east/west) is inferred automatically from target.trailKm vs current.trailKm.
 */
export function computeNavigationState(
  index: TrailIndex,
  current: TrailProjection,
  target: NavigationTarget | null
): NavigationState {
  const approachDistanceM =
    current.offTrailM > OFF_TRAIL_APPROACH_THRESHOLD_M ? current.offTrailM : 0;

  if (!target) {
    const curSec = index.byId.get(current.sectionId);
    const toSectionStartKm = curSec ? Math.max(0, current.trailKm - curSec.startKm) : 0;
    const toSectionEndKm = curSec ? Math.max(0, curSec.endKm - current.trailKm) : 0;
    return {
      current,
      target: null,
      direction: null,
      approachDistanceM,
      trailDistanceKm: 0,
      etaMinutes: 0,
      unopenedSectionIds: [],
      toSectionStartKm,
      toSectionEndKm,
    };
  }

  const direction: 'east' | 'west' = target.trailKm >= current.trailKm ? 'east' : 'west';
  const minKm = Math.min(current.trailKm, target.trailKm);
  const maxKm = Math.max(current.trailKm, target.trailKm);
  const trailDistanceKm = Math.max(0, maxKm - minKm);

  let totalGainM = 0;
  let totalLossM = 0;
  const unopenedSectionIds: number[] = [];

  for (const sec of index.sections) {
    const overlapStart = Math.max(minKm, sec.startKm);
    const overlapEnd = Math.min(maxKm, sec.endKm);
    const overlapKm = overlapEnd - overlapStart;
    if (overlapKm <= 0) continue;

    if (!sec.isOpened) {
      unopenedSectionIds.push(sec.sectionId);
    }

    const ratio = sec.officialDistanceKm > 0 ? Math.min(1, overlapKm / sec.officialDistanceKm) : 0;
    if (direction === 'east') {
      totalGainM += sec.elevationGainM * ratio;
      totalLossM += sec.elevationLossM * ratio;
    } else {
      // Reverse travel swaps elevation gain and loss
      totalGainM += sec.elevationLossM * ratio;
      totalLossM += sec.elevationGainM * ratio;
    }
  }

  const totalWalkingKm = trailDistanceKm + approachDistanceM / 1000;
  const etaMinutes = calculateMunterEtaMinutes(totalWalkingKm, totalGainM, totalLossM);

  return {
    current,
    target,
    direction,
    approachDistanceM,
    trailDistanceKm,
    etaMinutes,
    unopenedSectionIds,
  };
}
