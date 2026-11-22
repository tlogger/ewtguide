import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LocalDevPoiAdapter,
  CdnHybridPoiAdapter,
  assertNoBase64PhotoUrl,
  mergeSectionPois,
  resetPoiRepositoryForTest,
  L1_TTL_MS,
} from '../poiRepository';
import type { POI } from '../../types';

// Mock @supabase/supabase-js for CdnHybridPoiAdapter write tests
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockUpsert = vi.fn(() => ({ select: mockSelect }));
const mockEq = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({
  upsert: mockUpsert,
  delete: mockDelete,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('poiRepository (Phase 1A)', () => {
  beforeEach(() => {
    const mockStorage = createMemoryStorage();
    Object.defineProperty(window, 'localStorage', { value: mockStorage, configurable: true, writable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true, writable: true });
    resetPoiRepositoryForTest();
    vi.restoreAllMocks();
    mockSingle.mockReset();
    mockSelect.mockClear();
    mockUpsert.mockClear();
    mockEq.mockReset();
    mockDelete.mockClear();
    mockFrom.mockClear();
  });

  it('rejects data: Base64 photo_url', () => {
    expect(() => assertNoBase64PhotoUrl('data:image/jpeg;base64,/9j/4AAQ')).toThrow();
    expect(() => assertNoBase64PhotoUrl('https://blob.vercel-storage.com/pois/1/a.webp')).not.toThrow();
    expect(() => assertNoBase64PhotoUrl(null)).not.toThrow();
  });

  it('LocalDevPoiAdapter performs full CRUD with zero network calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const repo = new LocalDevPoiAdapter();

    expect(await repo.getAllUserPois()).toEqual([]);

    const created = await repo.upsertPoi(12, {
      name: '테스트 식수대',
      category: 'viewpoint',
      categories: ['viewpoint'],
      lat: 36.5,
      lng: 127.5,
      photo_url: '/images/local-photo-placeholder.svg',
    });

    expect(created.id).toBeTruthy();
    expect(created.section_id).toBe(12);

    const list1 = await repo.getAllUserPois();
    expect(list1).toHaveLength(1);
    expect(list1[0].name).toBe('테스트 식수대');

    // Update
    const updated = await repo.upsertPoi(12, { ...created, memo: '깨끗함' });
    expect(updated.memo).toBe('깨끗함');

    // Hard delete user-created POI
    await repo.deletePoi(12, updated);
    expect(await repo.getAllUserPois()).toHaveLength(0);

    // Tombstone official POI
    const official: POI = {
      id: 'poi_official_1',
      section_id: 12,
      name: '공식 대피소',
      category: 'cert_center',
      lat: 36.51,
      lng: 127.51,
      is_official: true,
    };
    await repo.deletePoi(12, official);
    const listAfterOfficialDel = await repo.getAllUserPois();
    expect(listAfterOfficialDel).toHaveLength(1);
    expect(listAfterOfficialDel[0].is_deleted).toBe(true);

    const merged = mergeSectionPois(12, [official], listAfterOfficialDel);
    expect(merged).toHaveLength(0);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('CdnHybridPoiAdapter uses L1 60s TTL and handles ETag 304 without re-downloading body', async () => {
    const repo = new CdnHybridPoiAdapter();
    const sampleRows: POI[] = [
      {
        id: 'poi_1',
        section_id: 1,
        name: '태안 화장실',
        category: 'toilet',
        categories: ['toilet'],
        lat: 36.7,
        lng: 126.3,
        updated_at: '2026-11-22T01:00:00.000Z',
      },
    ];

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ pois: sampleRows }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ETag: '"abc123"' },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 304 }));

    // 1st call -> fetches /api/pois
    const first = await repo.getAllUserPois();
    expect(first).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // 2nd call within 60s TTL -> 0 network requests
    const second = await repo.getAllUserPois();
    expect(second).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Expire TTL -> sends If-None-Match and handles 304
    localStorage.setItem('ewt_pois_fetched_at_v2', String(Date.now() - L1_TTL_MS - 1000));
    const third = await repo.getAllUserPois();
    expect(third).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [, init] = fetchSpy.mock.calls[1];
    expect((init?.headers as Record<string, string>)['If-None-Match']).toBe('"abc123"');
  });

  it('CdnHybridPoiAdapter protects pendingOverrides using server updated_at and rolls back on write error', async () => {
    const repo = new CdnHybridPoiAdapter();

    // Simulate successful write returning server updated_at
    mockSingle.mockResolvedValueOnce({
      data: { updated_at: '2026-11-22T02:05:00.000Z' },
      error: null,
    });

    const saved = await repo.upsertPoi(
      12,
      {
        id: 'poi_12_water',
        name: '12구간 식수대',
        category: 'mart',
        lat: 36.6,
        lng: 127.4,
        memo: '수정된 메모',
      },
      '00000000-0000-4000-8000-000000000001'
    );
    expect(saved.updated_at).toBe('2026-11-22T02:05:00.000Z');

    // Stale CDN snapshot (older updated_at) must NOT overwrite pending edit
    const staleRow: POI = {
      id: 'poi_12_water',
      section_id: 12,
      name: '12구간 식수대',
      category: 'mart',
      lat: 36.6,
      lng: 127.4,
      memo: '이전 메모',
      updated_at: '2026-11-22T02:00:00.000Z',
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ pois: [staleRow] }), {
        status: 200,
        headers: { ETag: '"stale"' },
      })
    );

    const afterStale = await repo.getAllUserPois(true);
    expect(afterStale.find((p) => p.id === 'poi_12_water')?.memo).toBe('수정된 메모');

    // Write failure must throw and NOT leave a dirty pending override
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'network error' },
    });
    await expect(
      repo.upsertPoi(12, {
        id: 'poi_fail',
        name: '실패 테스트',
        category: 'other',
        lat: 36.6,
        lng: 127.4,
      })
    ).rejects.toThrow('시설 저장에 실패했습니다');

    const afterFail = await repo.getAllUserPois();
    expect(afterFail.find((p) => p.id === 'poi_fail')).toBeUndefined();
  });

  it('survives localStorage QuotaExceededError via in-memory fallback', async () => {
    const repo = new LocalDevPoiAdapter();
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const saved = await repo.upsertPoi(1, {
      name: '메모리 폴백 테스트',
      category: 'other',
      lat: 36.7,
      lng: 126.3,
    });
    expect(saved.name).toBe('메모리 폴백 테스트');
  });
});
