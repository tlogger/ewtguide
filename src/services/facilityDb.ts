import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { POI } from '../types';

export const DEFAULT_SUPABASE_URL = 'https://johtqemdlprtbpohdkgu.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

const CACHE_PREFIX = 'ewtguide_fac_cache';
const LEGACY_USER_KEY = 'ewtguide_user_facilities';

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
    console.warn('Local cache write failed (possibly quota exceeded):', e);
  }
}

/**
 * 특정 구간의 시설 및 명소 목록 로드
 * - Supabase 중앙 DB의 변경/신규/삭제 내역을 실시간 반영
 * - 공식 시설(officialPois)과 중앙 DB의 사용자 시설 및 수정본을 스마트하게 병합
 */
export async function loadSectionFacilities(
  sectionId: number,
  officialPois: POI[] = []
): Promise<POI[]> {
  const client = getSupabase();
  let dbRecords: POI[] = [];
  let isDbSuccess = false;

  try {
    const { data, error } = await client
      .from('ewt_facilities')
      .select('*')
      .eq('section_id', sectionId);

    if (!error && data) {
      dbRecords = data as POI[];
      isDbSuccess = true;
    } else if (error) {
      console.warn('Supabase ewt_facilities fetch notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase network error, fallback to local cache:', err);
  }

  // DB 조회가 성공한 경우: DB 기반으로 공식 시설과 머지
  if (isDbSuccess) {
    const dbMap = new Map<string, POI>();
    dbRecords.forEach((item) => {
      if (item.id) dbMap.set(item.id, item);
    });

    // 1. 공식 시설 처리 (수정본 덮어쓰기 또는 삭제된 것 제외)
    const mergedOfficials: POI[] = [];
    officialPois.forEach((official) => {
      if (!official.id) {
        mergedOfficials.push(official);
        return;
      }
      const override = dbMap.get(official.id);
      if (override) {
        if (!override.is_deleted) {
          mergedOfficials.push({ ...official, ...override, is_official: true });
        }
        dbMap.delete(official.id);
      } else {
        mergedOfficials.push(official);
      }
    });

    // 2. 신규 사용자 등록 시설 처리 (삭제되지 않은 것들)
    const userAdded: POI[] = [];
    dbMap.forEach((userFac) => {
      if (!userFac.is_deleted) {
        userAdded.push(userFac);
      }
    });

    // 최신 등록된 사용자 시설을 상단에, 그 뒤에 공식 시설 배치
    const finalResult = [...userAdded, ...mergedOfficials];
    setLocalCachedFacilities(sectionId, finalResult);
    return finalResult;
  }

  // DB 실패 시(테이블 준비 중 또는 오프라인): 로컬 캐시와 병합하여 매끄럽게 동작 보장
  const cached = getLocalCachedFacilities(sectionId);
  if (cached.length > 0) {
    return cached;
  }

  return officialPois;
}

/**
 * 시설 등록 또는 수정 내용을 Supabase 중앙 DB에 저장
 * 모든 사용자가 즉시 확인할 수 있도록 실시간 반영
 */
export async function saveFacilityToDb(
  sectionId: number,
  facility: POI
): Promise<POI> {
  const client = getSupabase();
  const facilityId = facility.id || `fac_${Date.now()}`;
  const now = new Date().toISOString();

  const record = {
    id: facilityId,
    section_id: sectionId,
    name: facility.name,
    category: facility.category,
    lat: facility.lat,
    lng: facility.lng,
    phone: facility.phone || null,
    business_hours: facility.business_hours || null,
    memo: facility.memo || null,
    photo_url: facility.photo_url || null,
    is_official: facility.is_official ?? false,
    is_deleted: false,
    updated_at: now
  };

  const updatedPoi: POI = {
    ...facility,
    id: facilityId,
    is_deleted: false,
    updated_at: now
  };

  try {
    const { error } = await client
      .from('ewt_facilities')
      .upsert(record);

    if (error) {
      console.error('Failed to upsert facility to Supabase:', error);
    }
  } catch (err) {
    console.error('Network error during saveFacilityToDb:', err);
  }

  // 로컬 캐시도 즉시 갱신
  const cached = getLocalCachedFacilities(sectionId);
  const exists = cached.some((f) => f.id === facilityId);
  const updatedCache = exists
    ? cached.map((f) => (f.id === facilityId ? updatedPoi : f))
    : [updatedPoi, ...cached];
  setLocalCachedFacilities(sectionId, updatedCache);

  return updatedPoi;
}

/**
 * 시설 삭제 내용을 Supabase 중앙 DB에 반영
 */
export async function deleteFacilityFromDb(
  sectionId: number,
  facility: POI
): Promise<void> {
  if (!facility.id) return;
  const client = getSupabase();
  const now = new Date().toISOString();

  try {
    if (facility.is_official) {
      // 공식 시설은 완전히 지우지 않고 is_deleted 플래그로 비표시 처리
      await client
        .from('ewt_facilities')
        .upsert({
          id: facility.id,
          section_id: sectionId,
          name: facility.name,
          category: facility.category,
          lat: facility.lat,
          lng: facility.lng,
          is_official: true,
          is_deleted: true,
          updated_at: now
        });
    } else {
      // 사용자가 등록한 시설은 delete 또는 is_deleted 처리
      await client
        .from('ewt_facilities')
        .delete()
        .eq('id', facility.id);
    }
  } catch (err) {
    console.error('Failed to delete facility from Supabase:', err);
  }

  // 로컬 캐시에서도 제거
  const cached = getLocalCachedFacilities(sectionId);
  const updatedCache = cached.filter((f) => f.id !== facility.id);
  setLocalCachedFacilities(sectionId, updatedCache);
}
