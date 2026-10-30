import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { POI, UserAccount, AuthProvider } from '../types';
import { generateDeterministicPoiId } from '../utils/poiId';

export const DEFAULT_SUPABASE_URL = 'https://johtqemdlprtbpohdkgu.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

const CACHE_PREFIX = 'ewtguide_fac_cache';
const TOMBSTONE_PREFIX = 'ewtguide_tombstones';
const LEGACY_USER_KEY = 'ewtguide_user_facilities';
const USER_SESSION_KEY = 'ewtguide_user_session';

let supabaseClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (supabaseClient) return supabaseClient;
  supabaseClient = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
  return supabaseClient;
};

/** 영구 삭제 묘지(Tombstones) 목록 로드 */
export function getLocalTombstones(sectionId: number): Set<string> {
  try {
    const raw = localStorage.getItem(`${TOMBSTONE_PREFIX}_${sectionId}`);
    if (raw) {
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    }
  } catch {
    // fallback
  }
  return new Set();
}

/** 영구 삭제 묘지에 ID 추가 */
export function addLocalTombstone(sectionId: number, id: string): void {
  const stones = getLocalTombstones(sectionId);
  stones.add(id);
  try {
    localStorage.setItem(`${TOMBSTONE_PREFIX}_${sectionId}`, JSON.stringify([...stones]));
  } catch (e) {
    console.warn('Failed to save tombstone:', e);
  }
}

/** 영구 삭제 묘지에서 ID 제거 (재등록 시) */
export function removeLocalTombstone(sectionId: number, id: string): void {
  const stones = getLocalTombstones(sectionId);
  stones.delete(id);
  try {
    localStorage.setItem(`${TOMBSTONE_PREFIX}_${sectionId}`, JSON.stringify([...stones]));
  } catch (e) {
    console.warn('Failed to remove tombstone:', e);
  }
}

/** 로컬 캐시에서 시설 목록 로드 */
function getLocalCachedFacilities(sectionId: number): POI[] {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}_${sectionId}`);
    if (raw) return JSON.parse(raw);

    // 구버전 로컬스토리지 데이터 호환
    const legacy = localStorage.getItem(`${LEGACY_USER_KEY}_${sectionId}`);
    return legacy ? JSON.parse(legacy) : [];
  } catch {
    return [];
  }
}

/** 로컬 캐시에 저장 */
function setLocalCachedFacilities(sectionId: number, facilities: POI[]): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}_${sectionId}`, JSON.stringify(facilities));
  } catch (e) {
    console.warn('Local cache write failed:', e);
  }
}

/**
 * 특정 구간의 시설 및 명소 목록 로드
 * - 크롤링 재실행으로 새 데이터가 유입되더라도 삭제된 시설(Tombstone)은 100% 차단
 * - Supabase 중앙 DB의 변경/신규/삭제 내역과 공식 시설을 스마트하게 머지
 * - 다중 카테고리(categories: string[]) 지원
 */
export async function loadSectionFacilities(
  sectionId: number,
  officialPois: POI[] = []
): Promise<POI[]> {
  const client = getSupabase();
  const tombstones = getLocalTombstones(sectionId);

  // 1. 공식 시설에 결정론적 고유 ID 런타임 보장 및 다중 카테고리 정규화
  const normalizedOfficials: POI[] = officialPois.map((poi) => {
    const id = poi.id || generateDeterministicPoiId(poi.name, poi.lat, poi.lng);
    const categories = (poi.categories && poi.categories.length > 0)
      ? poi.categories
      : [poi.category || 'other'];
    return {
      ...poi,
      id,
      category: categories[0],
      categories,
      is_official: true
    };
  });

  let dbRecords: POI[] = [];
  let isDbSuccess = false;

  try {
    const { data, error } = await client
      .from('ewt_facilities')
      .select('*')
      .eq('section_id', sectionId);

    if (!error && data) {
      dbRecords = (data as any[]).map((row) => {
        const categories = (row.categories && Array.isArray(row.categories) && row.categories.length > 0)
          ? row.categories
          : [row.category || 'other'];
        return {
          ...row,
          category: categories[0],
          categories
        } as POI;
      });
      isDbSuccess = true;
    }
  } catch (err) {
    console.warn('Supabase fetch notice (fallback to local):', err);
  }

  if (isDbSuccess) {
    const dbMap = new Map<string, POI>();
    dbRecords.forEach((item) => {
      if (item.id) {
        dbMap.set(item.id, item);
        // Supabase에 삭제 기록이 있으면 로컬 묘지에도 자동 동기화
        if (item.is_deleted) {
          tombstones.add(item.id);
          addLocalTombstone(sectionId, item.id);
        }
      }
    });

    // 2. 공식 시설 머지: 삭제 묘지(Tombstone)에 있는 것은 원천 차단
    const mergedOfficials: POI[] = [];
    normalizedOfficials.forEach((official) => {
      const id = official.id!;
      if (tombstones.has(id)) {
        return; // 삭제된 시설은 무조건 제외 (영구 부활 방지)
      }

      const override = dbMap.get(id);
      if (override) {
        if (!override.is_deleted) {
          mergedOfficials.push({ ...official, ...override, is_official: true });
        }
        dbMap.delete(id);
      } else {
        mergedOfficials.push(official);
      }
    });

    // 3. 사용자 등록 신규 시설 머지
    const userAdded: POI[] = [];
    dbMap.forEach((userFac) => {
      if (!userFac.is_deleted && userFac.id && !tombstones.has(userFac.id)) {
        userAdded.push(userFac);
      }
    });

    const finalResult = [...userAdded, ...mergedOfficials];
    setLocalCachedFacilities(sectionId, finalResult);
    return finalResult;
  }

  // DB 미생성/오프라인 상태: 로컬 묘지(Tombstone) 및 로컬 캐시로 동작 보장
  const cached = getLocalCachedFacilities(sectionId);
  if (cached.length > 0) {
    // 캐시 내에서도 묘지에 등록된 시설 필터링
    return cached.filter((f) => f.id && !tombstones.has(f.id));
  }

  // 캐시가 없으면 공식 시설 중 묘지에 없는 것만 반환
  return normalizedOfficials.filter((f) => f.id && !tombstones.has(f.id));
}

/**
 * 시설 등록 또는 수정 내용을 Supabase 중앙 DB 및 로컬에 저장
 * - 다중 카테고리(categories: string[]) 완벽 보전
 */
export async function saveFacilityToDb(
  sectionId: number,
  facility: POI
): Promise<POI> {
  const client = getSupabase();
  const facilityId = facility.id || generateDeterministicPoiId(facility.name, facility.lat, facility.lng);
  const now = new Date().toISOString();

  // 재등록 또는 수정 시 묘지에서 해제
  removeLocalTombstone(sectionId, facilityId);

  const categories = (facility.categories && facility.categories.length > 0)
    ? facility.categories
    : [facility.category || 'other'];
  const primaryCategory = categories[0];

  const currentUser = getCurrentUser();

  const record = {
    id: facilityId,
    section_id: sectionId,
    name: facility.name,
    category: primaryCategory,
    categories,
    lat: facility.lat,
    lng: facility.lng,
    phone: facility.phone || null,
    business_hours: facility.business_hours || null,
    memo: facility.memo || null,
    photo_url: facility.photo_url || null,
    registered_by: currentUser?.id || null,
    is_official: facility.is_official ?? false,
    is_deleted: false,
    updated_at: now
  };

  const updatedPoi: POI = {
    ...facility,
    id: facilityId,
    category: primaryCategory,
    categories,
    is_deleted: false,
    updated_at: now
  };

  try {
    await client
      .from('ewt_facilities')
      .upsert(record);
  } catch (err) {
    console.warn('Supabase upsert notice:', err);
  }

  // 로컬 캐시 즉시 갱신
  const cached = getLocalCachedFacilities(sectionId);
  const exists = cached.some((f) => f.id === facilityId);
  const updatedCache = exists
    ? cached.map((f) => (f.id === facilityId ? updatedPoi : f))
    : [updatedPoi, ...cached];
  setLocalCachedFacilities(sectionId, updatedCache);

  return updatedPoi;
}

/**
 * 시설 삭제 내용을 영구 묘지(Tombstone) 및 Supabase 중앙 DB에 즉시 반영
 */
export async function deleteFacilityFromDb(
  sectionId: number,
  facility: POI
): Promise<void> {
  const targetId = facility.id || generateDeterministicPoiId(facility.name, facility.lat, facility.lng);
  if (!targetId) return;

  const client = getSupabase();
  const now = new Date().toISOString();

  // 1. [핵심] 로컬 영구 묘지(Tombstone)에 즉시 등록
  addLocalTombstone(sectionId, targetId);

  // 2. 로컬 캐시에서 즉시 제거
  const cached = getLocalCachedFacilities(sectionId);
  const updatedCache = cached.filter((f) => f.id !== targetId);
  setLocalCachedFacilities(sectionId, updatedCache);

  // 3. Supabase 중앙 DB에 영구 삭제 묘지 레코드 동기화
  try {
    await client
      .from('ewt_facilities')
      .upsert({
        id: targetId,
        section_id: sectionId,
        name: facility.name,
        category: facility.category,
        categories: facility.categories || [facility.category],
        lat: facility.lat,
        lng: facility.lng,
        is_official: facility.is_official ?? false,
        is_deleted: true,
        updated_at: now
      });
  } catch (err) {
    console.warn('Supabase tombstone sync notice:', err);
  }
}

// ==============================================================================
// 6번 소셜 OAuth2 계정 및 토큰 보전 관리 서비스
// ==============================================================================

/** 현재 로그인된 사용자 정보 획득 */
export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 세션 사용자 저장 */
export function setCurrentUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
    window.dispatchEvent(new CustomEvent('ewtguide_auth_changed', { detail: user }));
  } catch (e) {
    console.warn('Failed to set user session:', e);
  }
}

/** 로그아웃 처리 */
export async function signOutUser(): Promise<void> {
  const client = getSupabase();
  try {
    await client.auth.signOut();
  } catch {
    // ignore
  }
  setCurrentUser(null);
}

/** DB에서 소셜 계정 조회 */
export async function findUserAccount(
  provider: AuthProvider,
  providerUserId: string
): Promise<UserAccount | null> {
  const client = getSupabase();
  try {
    const { data, error } = await client
      .from('user_accounts')
      .select('*')
      .eq('provider', provider)
      .eq('provider_user_id', providerUserId)
      .maybeSingle();

    if (!error && data) {
      return data as UserAccount;
    }
  } catch (err) {
    console.warn('findUserAccount notice:', err);
  }
  return null;
}

/** 회원가입 신청: DB에 소셜 프로필 및 OAuth2 토큰 영구 보전 */
export async function registerUserAccount(account: {
  provider: AuthProvider;
  provider_user_id: string;
  email?: string | null;
  name?: string | null;
  profile_image?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
}): Promise<UserAccount> {
  const client = getSupabase();
  const now = new Date().toISOString();

  const record = {
    provider: account.provider,
    provider_user_id: account.provider_user_id,
    email: account.email || null,
    name: account.name || '트레커',
    profile_image: account.profile_image || null,
    access_token: account.access_token || null,
    refresh_token: account.refresh_token || null,
    token_expires_at: account.token_expires_at || null,
    created_at: now,
    last_login_at: now
  };

  let savedAccount: UserAccount = {
    id: `usr_${Date.now()}`,
    ...record
  };

  try {
    const { data, error } = await client
      .from('user_accounts')
      .upsert(record, { onConflict: 'provider,provider_user_id' })
      .select()
      .single();

    if (!error && data) {
      savedAccount = data as UserAccount;
    }
  } catch (err) {
    console.warn('registerUserAccount Supabase notice (saved locally):', err);
  }

  setCurrentUser(savedAccount);
  return savedAccount;
}

/** 로그인: DB의 토큰, 최근 로그인 일시 및 최신 프로필 갱신 */
export async function updateUserLoginSession(
  provider: AuthProvider,
  providerUserId: string,
  tokens?: {
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
    name?: string;
    email?: string;
    profile_image?: string | null;
  }
): Promise<UserAccount | null> {
  const client = getSupabase();
  const now = new Date().toISOString();

  try {
    const updatePayload: Record<string, any> = {
      last_login_at: now,
      ...(tokens?.access_token ? { access_token: tokens.access_token } : {}),
      ...(tokens?.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      ...(tokens?.token_expires_at ? { token_expires_at: tokens.token_expires_at } : {}),
      ...(tokens?.name ? { name: tokens.name } : {}),
      ...(tokens?.email ? { email: tokens.email } : {}),
      ...(tokens?.profile_image !== undefined ? { profile_image: tokens.profile_image } : {})
    };

    const { data, error } = await client
      .from('user_accounts')
      .update(updatePayload)
      .eq('provider', provider)
      .eq('provider_user_id', providerUserId)
      .select()
      .maybeSingle();

    if (!error && data) {
      const user = data as UserAccount;
      setCurrentUser(user);
      return user;
    }
  } catch (err) {
    console.warn('updateUserLoginSession notice:', err);
  }

  // 로컬 세션 갱신
  const current = getCurrentUser();
  if (current && current.provider === provider && current.provider_user_id === providerUserId) {
    const updated = { ...current, last_login_at: now, ...tokens };
    setCurrentUser(updated);
    return updated;
  }

  return null;
}
