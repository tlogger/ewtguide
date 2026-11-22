import type { SupabaseClient } from '@supabase/supabase-js';
import type { POI } from '../types';
import { generateDeterministicPoiId } from '../utils/poiId';
import { getApiBaseUrl, getPoiDataMode, PoiDataMode } from '../utils/apiBase';

export const DEFAULT_SUPABASE_URL = 'https://johtqemdlprtbpohdkgu.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

const L1_SNAPSHOT_KEY = 'ewt_pois_snapshot_v2';
const L1_FETCHED_AT_KEY = 'ewt_pois_fetched_at_v2';
const L1_ETAG_KEY = 'ewt_pois_etag_v2';
const L1_PENDING_KEY = 'ewt_pois_pending_v2';
const LOCAL_DEV_DB_KEY = 'ewt_local_dev_db_v2';

export const L1_TTL_MS = 60_000; // 60s client TTL (+ 300s Edge CDN s-maxage <= 6m propagation)
export const PENDING_MAX_TTL_MS = 15 * 60_000; // 15m safety valve

export interface PendingOverride {
  action: 'upsert' | 'delete';
  poi?: POI;
  sectionId: number;
  expectedServerUpdatedAt: string;
  createdAtMs: number;
}

export interface PoiRepository {
  getAllUserPois(forceRefresh?: boolean): Promise<POI[]>;
  upsertPoi(sectionId: number, poi: POI, userId?: string | null): Promise<POI>;
  deletePoi(sectionId: number, poi: POI): Promise<void>;
}

// In-memory fallback store for QuotaExceededError or private browsing modes
const memoryStore = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // fallback to memory
  }
  return memoryStore.get(key) ?? null;
}

function safeSetItem(key: string, value: string): void {
  memoryStore.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // QuotaExceededError or restricted storage — memory fallback already updated
  }
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function assertNoBase64PhotoUrl(photoUrl?: string | null): void {
  if (typeof photoUrl === 'string' && photoUrl.trim().toLowerCase().startsWith('data:')) {
    throw new Error('Base64 이미지는 DB에 저장할 수 없습니다. 사진 업로드를 사용해 주세요.');
  }
}

export function normalizePoiRow(raw: Partial<POI> & { id?: string; name: string }): POI {
  const id = raw.id || generateDeterministicPoiId(raw.name, raw.lat, raw.lng);
  const categories =
    Array.isArray(raw.categories) && raw.categories.length > 0
      ? raw.categories
      : [raw.category || 'other'];
  const photoUrl =
    typeof raw.photo_url === 'string' && raw.photo_url.startsWith('data:')
      ? undefined
      : raw.photo_url || undefined;

  return {
    ...raw,
    id,
    category: categories[0],
    categories,
    photo_url: photoUrl,
  } as POI;
}

export function mergeSectionPois(
  sectionId: number,
  officialPois: POI[],
  allUserPois: POI[]
): POI[] {
  const normalizedOfficials = officialPois.map((p) => ({
    ...normalizePoiRow(p),
    section_id: p.section_id ?? sectionId,
    is_official: true,
  }));

  const sectionUserMap = new Map<string, POI>();
  for (const row of allUserPois) {
    if (row.section_id === sectionId && row.id) {
      sectionUserMap.set(row.id, normalizePoiRow(row));
    }
  }

  const mergedOfficials: POI[] = [];
  for (const official of normalizedOfficials) {
    const id = official.id!;
    const override = sectionUserMap.get(id);
    if (override) {
      if (!override.is_deleted) {
        mergedOfficials.push({ ...official, ...override, is_official: true });
      }
      sectionUserMap.delete(id);
    } else {
      mergedOfficials.push(official);
    }
  }

  const userAdded: POI[] = [];
  for (const row of sectionUserMap.values()) {
    if (!row.is_deleted) {
      userAdded.push(row);
    }
  }

  return [...userAdded, ...mergedOfficials];
}

let lazySupabasePromise: Promise<SupabaseClient> | null = null;

export async function getLazySupabase(): Promise<SupabaseClient> {
  if (!lazySupabasePromise) {
    lazySupabasePromise = import('@supabase/supabase-js').then(({ createClient }) => {
      const url = import.meta.env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const key = import.meta.env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
      return createClient(url, key, {
        realtime: { params: { eventsPerSecond: 10 } },
      });
    });
  }
  return lazySupabasePromise;
}

export class LocalDevPoiAdapter implements PoiRepository {
  private readAll(): POI[] {
    const parsed = safeParseJson<POI[]>(safeGetItem(LOCAL_DEV_DB_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
  }

  private writeAll(pois: POI[]): void {
    safeSetItem(LOCAL_DEV_DB_KEY, JSON.stringify(pois));
  }

  async getAllUserPois(): Promise<POI[]> {
    return this.readAll();
  }

  async upsertPoi(sectionId: number, poi: POI): Promise<POI> {
    assertNoBase64PhotoUrl(poi.photo_url);
    const id = poi.id || generateDeterministicPoiId(poi.name, poi.lat, poi.lng);
    const now = new Date().toISOString();
    const saved: POI = {
      ...normalizePoiRow({ ...poi, id }),
      section_id: sectionId,
      is_deleted: false,
      updated_at: now,
    };

    const list = this.readAll();
    const idx = list.findIndex((item) => item.id === id);
    const next = idx >= 0 ? list.map((item, i) => (i === idx ? saved : item)) : [saved, ...list];
    this.writeAll(next);
    return saved;
  }

  async deletePoi(sectionId: number, poi: POI): Promise<void> {
    const id = poi.id || generateDeterministicPoiId(poi.name, poi.lat, poi.lng);
    if (!id) return;
    const list = this.readAll();

    if (poi.is_official) {
      const tombstone: POI = {
        ...normalizePoiRow({ ...poi, id }),
        section_id: sectionId,
        is_official: true,
        is_deleted: true,
        updated_at: new Date().toISOString(),
      };
      const idx = list.findIndex((item) => item.id === id);
      const next = idx >= 0 ? list.map((item, i) => (i === idx ? tombstone : item)) : [tombstone, ...list];
      this.writeAll(next);
    } else {
      // Hard delete user-created POIs to prevent tombstone accumulation
      this.writeAll(list.filter((item) => item.id !== id));
    }
  }
}

export class CdnHybridPoiAdapter implements PoiRepository {
  private readSnapshot(): { pois: POI[]; fetchedAt: number; etag: string | null } {
    const pois = safeParseJson<POI[]>(safeGetItem(L1_SNAPSHOT_KEY), []);
    const fetchedAt = Number(safeGetItem(L1_FETCHED_AT_KEY) || '0');
    const etag = safeGetItem(L1_ETAG_KEY);
    return {
      pois: Array.isArray(pois) ? pois : [],
      fetchedAt: Number.isFinite(fetchedAt) ? fetchedAt : 0,
      etag,
    };
  }

  private writeSnapshot(pois: POI[], etag?: string | null): void {
    safeSetItem(L1_SNAPSHOT_KEY, JSON.stringify(pois));
    safeSetItem(L1_FETCHED_AT_KEY, String(Date.now()));
    if (etag) {
      safeSetItem(L1_ETAG_KEY, etag);
    }
  }

  private readPending(): Record<string, PendingOverride> {
    const raw = safeParseJson<Record<string, PendingOverride>>(safeGetItem(L1_PENDING_KEY), {});
    return raw && typeof raw === 'object' ? raw : {};
  }

  private writePending(map: Record<string, PendingOverride>): void {
    safeSetItem(L1_PENDING_KEY, JSON.stringify(map));
  }

  private applyPendingOverrides(serverRows: POI[]): POI[] {
    const pending = this.readPending();
    const nowMs = Date.now();
    const byId = new Map<string, POI>();

    for (const row of serverRows) {
      if (row.id) {
        byId.set(row.id, normalizePoiRow(row));
      }
    }

    let pendingChanged = false;
    for (const [id, entry] of Object.entries(pending)) {
      if (nowMs - entry.createdAtMs > PENDING_MAX_TTL_MS) {
        delete pending[id];
        pendingChanged = true;
        continue;
      }

      const serverRow = byId.get(id);
      if (entry.action === 'delete') {
        if (!serverRow || (serverRow.is_deleted && (serverRow.updated_at || '') >= entry.expectedServerUpdatedAt)) {
          delete pending[id];
          pendingChanged = true;
        } else if (entry.poi?.is_official) {
          byId.set(id, { ...entry.poi, is_deleted: true, updated_at: entry.expectedServerUpdatedAt });
        } else {
          byId.delete(id);
        }
      } else if (entry.poi) {
        if (serverRow && (serverRow.updated_at || '') >= entry.expectedServerUpdatedAt) {
          // Server CDN snapshot has caught up with our write
          delete pending[id];
          pendingChanged = true;
        } else {
          byId.set(id, entry.poi);
        }
      }
    }

    if (pendingChanged) {
      this.writePending(pending);
    }

    return Array.from(byId.values());
  }

  async getAllUserPois(forceRefresh = false): Promise<POI[]> {
    const cached = this.readSnapshot();
    const now = Date.now();

    if (!forceRefresh && cached.fetchedAt > 0 && now - cached.fetchedAt < L1_TTL_MS) {
      return this.applyPendingOverrides(cached.pois);
    }

    const url = `${getApiBaseUrl()}/api/pois`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (!forceRefresh && cached.etag && cached.fetchedAt > 0) {
      headers['If-None-Match'] = cached.etag;
    }

    try {
      const res = await fetch(url, { method: 'GET', headers });
      if (res.status === 304) {
        safeSetItem(L1_FETCHED_AT_KEY, String(now));
        return this.applyPendingOverrides(cached.pois);
      }

      if (res.ok) {
        const payload = (await res.json()) as { pois?: POI[] };
        const rows = Array.isArray(payload?.pois) ? payload.pois.map(normalizePoiRow) : [];
        const newEtag = res.headers.get('etag');
        this.writeSnapshot(rows, newEtag);
        return this.applyPendingOverrides(rows);
      }
    } catch {
      // Offline or Edge CDN temporary error — fallback to L1 cache
    }

    return this.applyPendingOverrides(cached.pois);
  }

  async upsertPoi(sectionId: number, poi: POI, userId?: string | null): Promise<POI> {
    assertNoBase64PhotoUrl(poi.photo_url);
    const id = poi.id || generateDeterministicPoiId(poi.name, poi.lat, poi.lng);
    const normalized = normalizePoiRow({ ...poi, id });
    const clientTs = new Date().toISOString();

    const record = {
      id,
      section_id: sectionId,
      name: normalized.name,
      category: normalized.category,
      categories: normalized.categories || [normalized.category],
      lat: normalized.lat,
      lng: normalized.lng,
      phone: normalized.phone || null,
      business_hours: normalized.business_hours || null,
      memo: normalized.memo || null,
      photo_url: normalized.photo_url || null,
      registered_by: userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : null,
      is_official: normalized.is_official ?? false,
      is_deleted: false,
      updated_at: clientTs,
    };

    const client = await getLazySupabase();
    const { data, error } = await client
      .from('ewt_facilities')
      .upsert(record)
      .select('updated_at')
      .single();

    if (error) {
      throw new Error(`시설 저장에 실패했습니다: ${error.message}`);
    }

    const serverUpdatedAt = (data as { updated_at?: string } | null)?.updated_at || clientTs;
    const savedPoi: POI = {
      ...normalized,
      section_id: sectionId,
      is_deleted: false,
      updated_at: serverUpdatedAt,
    };

    const pending = this.readPending();
    pending[id] = {
      action: 'upsert',
      poi: savedPoi,
      sectionId,
      expectedServerUpdatedAt: serverUpdatedAt,
      createdAtMs: Date.now(),
    };
    this.writePending(pending);

    return savedPoi;
  }

  async deletePoi(sectionId: number, poi: POI): Promise<void> {
    const id = poi.id || generateDeterministicPoiId(poi.name, poi.lat, poi.lng);
    if (!id) return;

    const client = await getLazySupabase();
    let serverUpdatedAt = new Date().toISOString();

    if (poi.is_official) {
      const { data, error } = await client
        .from('ewt_facilities')
        .upsert({
          id,
          section_id: sectionId,
          name: poi.name,
          category: poi.category,
          categories: poi.categories || [poi.category],
          lat: poi.lat,
          lng: poi.lng,
          is_official: true,
          is_deleted: true,
          updated_at: serverUpdatedAt,
        })
        .select('updated_at')
        .single();

      if (error) {
        throw new Error(`시설 삭제에 실패했습니다: ${error.message}`);
      }
      serverUpdatedAt = (data as { updated_at?: string } | null)?.updated_at || serverUpdatedAt;
    } else {
      const { error } = await client.from('ewt_facilities').delete().eq('id', id);
      if (error) {
        throw new Error(`시설 삭제에 실패했습니다: ${error.message}`);
      }
    }

    const pending = this.readPending();
    pending[id] = {
      action: 'delete',
      poi: { ...poi, id },
      sectionId,
      expectedServerUpdatedAt: serverUpdatedAt,
      createdAtMs: Date.now(),
    };
    this.writePending(pending);
  }
}

export function createPoiRepository(mode: PoiDataMode = getPoiDataMode()): PoiRepository {
  return mode === 'local' ? new LocalDevPoiAdapter() : new CdnHybridPoiAdapter();
}

let defaultRepo: PoiRepository | null = null;

export function getPoiRepository(): PoiRepository {
  if (!defaultRepo) {
    defaultRepo = createPoiRepository();
  }
  return defaultRepo;
}

export function resetPoiRepositoryForTest(): void {
  defaultRepo = null;
  memoryStore.clear();
}
