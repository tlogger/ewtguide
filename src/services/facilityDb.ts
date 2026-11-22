import { POI, UserAccount, AuthProvider } from '../types';
import { getPoiDataMode } from '../utils/apiBase';
import {
  getLazySupabase,
  getPoiRepository,
  mergeSectionPois,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_KEY,
} from './poiRepository';

export { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY };

const USER_SESSION_KEY = 'ewtguide_user_session';
const LOCAL_MOCK_USER_ID = '00000000-0000-4000-8000-000000000001';

/**
 * 특정 구간의 시설 및 명소 목록 로드 (3-Tier poiRepository 위임)
 */
export async function loadSectionFacilities(
  sectionId: number,
  officialPois: POI[] = []
): Promise<POI[]> {
  const allUserPois = await getPoiRepository().getAllUserPois();
  return mergeSectionPois(sectionId, officialPois, allUserPois);
}

/**
 * 시설 등록 또는 수정 저장 (3-Tier poiRepository 위임)
 */
export async function saveFacilityToDb(sectionId: number, facility: POI): Promise<POI> {
  const currentUser = getCurrentUser();
  return getPoiRepository().upsertPoi(sectionId, facility, currentUser?.id || null);
}

/**
 * 시설 삭제 (사용자 생성 POI 하드 삭제 / 공식 POI Tombstone)
 */
export async function deleteFacilityFromDb(sectionId: number, facility: POI): Promise<void> {
  await getPoiRepository().deletePoi(sectionId, facility);
}

// ==============================================================================
// 소셜 OAuth2 계정 및 세션 관리
// ==============================================================================

export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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

export async function signOutUser(): Promise<void> {
  if (getPoiDataMode() !== 'local') {
    try {
      const client = await getLazySupabase();
      await client.auth.signOut();
    } catch {
      // ignore
    }
  }
  setCurrentUser(null);
}

export async function findUserAccount(
  provider: AuthProvider,
  providerUserId: string
): Promise<UserAccount | null> {
  if (getPoiDataMode() === 'local') {
    const current = getCurrentUser();
    if (current && current.provider === provider && current.provider_user_id === providerUserId) {
      return current;
    }
    return null;
  }

  try {
    const client = await getLazySupabase();
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
    last_login_at: now,
  };

  let savedAccount: UserAccount = {
    id: LOCAL_MOCK_USER_ID,
    ...record,
  };

  if (getPoiDataMode() !== 'local') {
    try {
      const client = await getLazySupabase();
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
  }

  setCurrentUser(savedAccount);
  return savedAccount;
}

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
  const now = new Date().toISOString();

  if (getPoiDataMode() !== 'local') {
    try {
      const client = await getLazySupabase();
      const updatePayload: Record<string, unknown> = {
        last_login_at: now,
        ...(tokens?.access_token ? { access_token: tokens.access_token } : {}),
        ...(tokens?.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        ...(tokens?.token_expires_at ? { token_expires_at: tokens.token_expires_at } : {}),
        ...(tokens?.name ? { name: tokens.name } : {}),
        ...(tokens?.email ? { email: tokens.email } : {}),
        ...(tokens?.profile_image !== undefined ? { profile_image: tokens.profile_image } : {}),
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
  }

  const current = getCurrentUser();
  if (current && current.provider === provider && current.provider_user_id === providerUserId) {
    const updated = { ...current, last_login_at: now, ...tokens };
    setCurrentUser(updated);
    return updated;
  }

  return null;
}
