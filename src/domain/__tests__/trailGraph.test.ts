import { describe, it, expect } from 'vitest';
import {
  buildTrailIndex,
  projectToTrail,
  resolveNavigationTarget,
  computeNavigationState,
  calculateMunterEtaMinutes,
} from '../trailGraph';
import type { SectionSummary, OverviewSection } from '../../types';

const sampleSummaries: SectionSummary[] = [
  {
    section_id: 12,
    section_number: '12구간',
    title: '12구간',
    region: '세종시',
    course: 'A ~ B',
    is_opened: true,
    official_distance_km: 10,
    elevation_gain_m: 400,
    elevation_loss_m: 200,
    start_point: { lat: 36.5, lng: 127.0 },
    end_point: { lat: 36.5, lng: 127.1 },
  },
  {
    section_id: 13,
    section_number: '13구간',
    title: '13구간 (미개통)',
    region: '청주시',
    course: 'B ~ C',
    is_opened: false,
    official_distance_km: 12,
    elevation_gain_m: 0,
    elevation_loss_m: 0,
    start_point: null,
    end_point: null,
  },
  {
    section_id: 14,
    section_number: '14구간',
    title: '14구간',
    region: '보은군',
    course: 'C ~ D',
    is_opened: true,
    official_distance_km: 14,
    elevation_gain_m: 600,
    elevation_loss_m: 400,
    start_point: { lat: 36.5, lng: 127.2 },
    end_point: { lat: 36.5, lng: 127.3 },
  },
];

const sampleOverview: OverviewSection[] = [
  {
    section_id: 12,
    section_number: '12구간',
    title: '12구간',
    region: '세종시',
    course: 'A ~ B',
    is_opened: true,
    distance_km: 10,
    path: [
      { lat: 36.5, lng: 127.0 },
      { lat: 36.5, lng: 127.05 },
      { lat: 36.5, lng: 127.1 },
    ],
  },
  {
    section_id: 13,
    section_number: '13구간',
    title: '13구간 (미개통)',
    region: '청주시',
    course: 'B ~ C',
    is_opened: false,
    distance_km: 12,
    path: [],
  },
  {
    section_id: 14,
    section_number: '14구간',
    title: '14구간',
    region: '보은군',
    course: 'C ~ D',
    is_opened: true,
    distance_km: 14,
    path: [
      { lat: 36.5, lng: 127.2 },
      { lat: 36.5, lng: 127.25 },
      { lat: 36.5, lng: 127.3 },
    ],
  },
];

describe('trailGraph (Phase 1B)', () => {
  it('indexes 1D trailKm using official_distance_km and handles unopened null/empty sections safely', () => {
    const idx = buildTrailIndex(sampleSummaries, sampleOverview);
    expect(idx.totalKm).toBe(36);
    expect(idx.byId.get(12)?.startKm).toBe(0);
    expect(idx.byId.get(12)?.endKm).toBe(10);
    expect(idx.byId.get(13)?.bbox).toBeNull();
    expect(idx.byId.get(13)?.isOpened).toBe(false);
    expect(idx.byId.get(14)?.startKm).toBe(22);
    expect(idx.byId.get(14)?.endKm).toBe(36);
  });

  it('applies 50m hysteresis to keep locked section near boundaries', () => {
    const boundaryOverview: OverviewSection[] = [
      { ...sampleOverview[0], path: [{ lat: 36.5, lng: 127.0 }, { lat: 36.5, lng: 127.1 }] },
      sampleOverview[1],
      // Overlapping boundary point 20m away from section 12 end
      { ...sampleOverview[2], path: [{ lat: 36.5, lng: 127.1002 }, { lat: 36.5, lng: 127.2 }] },
    ];
    const idx = buildTrailIndex(sampleSummaries, boundaryOverview);

    // Coordinate right on section 14 start, ~18m from section 12 end
    const kept = projectToTrail(idx, 36.5, 127.1002, 12);
    expect(kept?.sectionId).toBe(12);

    // Coordinate far from section 12 (> 50m) switches to section 14
    const switched = projectToTrail(idx, 36.5, 127.15, 12);
    expect(switched?.sectionId).toBe(14);
  });

  it('infers east/west direction, detects unopened sections, and computes Munter/Tobler ETA', () => {
    const idx = buildTrailIndex(sampleSummaries, sampleOverview);
    const cur = projectToTrail(idx, 36.5, 127.05)!; // Midpoint of section 12 (~5km)
    expect(cur.sectionId).toBe(12);

    // Default state with no target
    const idleState = computeNavigationState(idx, cur, null);
    expect(idleState.direction).toBeNull();
    expect(idleState.toSectionStartKm).toBeCloseTo(5, 0);
    expect(idleState.toSectionEndKm).toBeCloseTo(5, 0);

    // Target in section 14 midpoint (~29km) -> east + crosses unopened section 13
    const eastTarget = resolveNavigationTarget(idx, {
      kind: 'poi',
      label: '14구간 대피소',
      sectionId: 14,
      lat: 36.5,
      lng: 127.25,
    })!;
    const eastNav = computeNavigationState(idx, cur, eastTarget);
    expect(eastNav.direction).toBe('east');
    expect(eastNav.trailDistanceKm).toBeCloseTo(24, 0);
    expect(eastNav.unopenedSectionIds).toEqual([13]);
    expect(eastNav.etaMinutes).toBeGreaterThan(300);

    // Reverse travel (14 -> 12) infers west
    const cur14 = projectToTrail(idx, 36.5, 127.25)!;
    const westTarget = resolveNavigationTarget(idx, {
      kind: 'poi',
      label: '12구간 시점',
      sectionId: 12,
      lat: 36.5,
      lng: 127.0,
    })!;
    const westNav = computeNavigationState(idx, cur14, westTarget);
    expect(westNav.direction).toBe('west');
    expect(westNav.unopenedSectionIds).toEqual([13]);
  });

  it('splits off-trail approach distance when > 50m from trail', () => {
    const idx = buildTrailIndex(sampleSummaries, sampleOverview);
    // ~555m north of section 12 midpoint
    const offProj = projectToTrail(idx, 36.505, 127.05)!;
    expect(offProj.offTrailM).toBeGreaterThan(500);

    const target = resolveNavigationTarget(idx, {
      kind: 'point',
      label: '12구간 종점',
      sectionId: 12,
      lat: 36.5,
      lng: 127.1,
    })!;
    const nav = computeNavigationState(idx, offProj, target);
    expect(nav.approachDistanceM).toBeGreaterThan(500);
    expect(nav.trailDistanceKm).toBeCloseTo(5, 0);
  });

  it('matches SectionDetailView Munter/Tobler ETA formula', () => {
    // 7km / 3.5 = 2h, 400m / 400 = 1h, 800m / 800 = 1h => 4h = 240min
    expect(calculateMunterEtaMinutes(7, 400, 800)).toBe(240);
    expect(calculateMunterEtaMinutes(0, 0, 0)).toBe(0);
  });
});
