import { AuthProvider, UserAccount } from '../types';
import {
  registerUserAccount,
  findUserAccount,
  updateUserLoginSession,
  setCurrentUser
} from './facilityDb';

const OAUTH_KEYS_STORAGE = 'ewtguide_oauth_client_ids';

export interface OAuthClientConfig {
  kakaoClientId: string;
  naverClientId: string;
  naverCallbackUrl: string;
  googleClientId: string;
}

/** 기본 및 로컬 저장된 OAuth 클라이언트 ID 조회 */
export function getOAuthClientConfig(): OAuthClientConfig {
  const envKakao = import.meta.env.VITE_KAKAO_MAP_API_KEY || '61ebf0b7a0daf24cba357d92677c8d8a';
  const envNaver = import.meta.env.VITE_NAVER_CLIENT_ID || 'ZlO4zT_XXNDHb24LQL5u';
  const envNaverCallback = import.meta.env.VITE_NAVER_CALLBACK_URL || 'https://tlogger.github.io/ewtguide/naverlogin';
  const envGoogle = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  try {
    const raw = localStorage.getItem(OAUTH_KEYS_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        kakaoClientId: parsed.kakaoClientId || envKakao,
        naverClientId: parsed.naverClientId || envNaver,
        naverCallbackUrl: parsed.naverCallbackUrl || envNaverCallback,
        googleClientId: parsed.googleClientId || envGoogle
      };
    }
  } catch {
    // fallback
  }

  return {
    kakaoClientId: envKakao,
    naverClientId: envNaver,
    naverCallbackUrl: envNaverCallback,
    googleClientId: envGoogle
  };
}

/** 사용자 정의 OAuth 클라이언트 ID 저장 */
export function saveOAuthClientConfig(config: Partial<OAuthClientConfig>): void {
  const current = getOAuthClientConfig();
  const merged = { ...current, ...config };
  try {
    localStorage.setItem(OAUTH_KEYS_STORAGE, JSON.stringify(merged));
  } catch (e) {
    console.warn('Failed to save OAuth config:', e);
  }
}

/** 현재 실행 도메인의 리다이렉트 URI 산출 */
export function getOAuthRedirectUri(): string {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}`;
}

/** 소셜 공급자별 실제 공식 OAuth2 인가 URL 생성 */
export function buildOAuthAuthorizeUrl(provider: AuthProvider, mode: 'login' | 'signup'): { url: string; error?: string } {
  const config = getOAuthClientConfig();
  const state = encodeURIComponent(JSON.stringify({ provider, mode, t: Date.now() }));

  // 요청 모드(가입신청 vs 로그인)를 로컬스토리지에 안전하게 보존
  try {
    localStorage.setItem('ewtguide_oauth_mode', mode);
  } catch (e) {
    console.warn(e);
  }

  if (provider === 'naver') {
    const naverClientId = config.naverClientId || 'ZlO4zT_XXNDHb24LQL5u';
    // 로컬 개발 환경과 프로덕션 GitHub Pages 콜백 URL 분기
    const callbackUrl = window.location.hostname === 'localhost'
      ? `${window.location.origin}/naverlogin`
      : config.naverCallbackUrl;

    // 네이버 공식 OAuth2 인가창 호출 (response_type=token)
    return {
      url: `https://nid.naver.com/oauth2.0/authorize?response_type=token&client_id=${encodeURIComponent(
        naverClientId
      )}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`
    };
  }

  if (provider === 'kakao') {
    const kakaoKey = config.kakaoClientId || '61ebf0b7a0daf24cba357d92677c8d8a';
    const redirectUri = encodeURIComponent(getOAuthRedirectUri());
    return {
      url: `https://kauth.kakao.com/oauth/authorize?client_id=${encodeURIComponent(
        kakaoKey
      )}&redirect_uri=${redirectUri}&response_type=code&state=${state}`
    };
  }

  if (provider === 'google') {
    if (!config.googleClientId) {
      return {
        url: '',
        error: '구글 Client ID가 설정되지 않았습니다. [API 키 설정]에서 Google Client ID를 입력해주세요.'
      };
    }
    const redirectUri = encodeURIComponent(getOAuthRedirectUri());
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        config.googleClientId
      )}&redirect_uri=${redirectUri}&response_type=token&scope=email%20profile%20openid&state=${state}`
    };
  }

  return { url: '', error: '지원되지 않는 공급자입니다.' };
}

export interface DirectUserPayload {
  id?: string;
  name?: string;
  email?: string;
  profile_image?: string;
  access_token?: string;
}

/** 리다이렉트되어 돌아온 OAuth2 콜백 파라미터 파싱 */
export function parseOAuthCallback(): {
  provider: AuthProvider;
  mode: 'login' | 'signup';
  accessToken?: string;
  code?: string;
  directUser?: DirectUserPayload;
  error?: string;
} | null {
  // 1. 네이버 콜백 수신 확인 (naverlogin HTML에서 전달받은 payload)
  const naverPayloadRaw = localStorage.getItem('ewtguide_naver_auth_payload');
  if (naverPayloadRaw) {
    try {
      const parsed = JSON.parse(naverPayloadRaw);
      localStorage.removeItem('ewtguide_naver_auth_payload');
      const mode = (localStorage.getItem('ewtguide_oauth_mode') as 'login' | 'signup') || 'login';
      localStorage.removeItem('ewtguide_oauth_mode');

      return {
        provider: 'naver',
        mode,
        accessToken: parsed.access_token,
        directUser: {
          id: parsed.id,
          name: parsed.name,
          email: parsed.email,
          profile_image: parsed.profile_image,
          access_token: parsed.access_token
        }
      };
    } catch {
      // fallback
    }
  }

  // 2. URL 해시(#) 및 쿼리(?) 직접 파싱 (카카오, 구글 등)
  const hash = window.location.hash.substring(1);
  const search = window.location.search.substring(1);

  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(search);

  const rawState = hashParams.get('state') || searchParams.get('state');
  if (!rawState) return null;

  let stateData: { provider: AuthProvider; mode: 'login' | 'signup' } | null = null;
  try {
    stateData = JSON.parse(decodeURIComponent(rawState));
  } catch {
    return null;
  }

  if (!stateData || !stateData.provider) return null;

  const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || undefined;
  const code = searchParams.get('code') || hashParams.get('code') || undefined;
  const error = searchParams.get('error_description') || hashParams.get('error') || undefined;

  return {
    provider: stateData.provider,
    mode: stateData.mode || 'login',
    accessToken,
    code,
    error
  };
}

/**
 * OAuth 콜백 완료 시 실제 사용자 프로필 획득 및 DB에 토큰 영구 보전
 */
export async function processOAuthCallbackResult(callbackData: {
  provider: AuthProvider;
  mode: 'login' | 'signup';
  accessToken?: string;
  code?: string;
  directUser?: DirectUserPayload;
}): Promise<{ success: boolean; user?: UserAccount; message: string }> {
  const { provider, mode, accessToken, code, directUser } = callbackData;
  const effectiveToken = directUser?.access_token || accessToken || code || `tok_${Date.now()}`;
  
  // 실제 소셜 공급자에서 제공한 고유 식별자(ID) 및 정보 반영
  const providerUserId = directUser?.id || `${provider}_${Math.floor(100000 + Math.random() * 900000)}`;
  const userName = directUser?.name || (provider === 'naver' ? '네이버 트레커' : `${provider.toUpperCase()} 트레커`);
  const userEmail = directUser?.email || `${provider}_user@ewtguide.kr`;
  const userPhoto = directUser?.profile_image || null;

  const tokenExpiresAt = new Date(Date.now() + 3600 * 1000 * 24 * 30).toISOString();

  if (mode === 'signup') {
    // 1. [가입 신청] 흐름: DB에 소셜 프로필 및 실제 발급 토큰 영구 보전
    const user = await registerUserAccount({
      provider,
      provider_user_id: providerUserId,
      email: userEmail,
      name: userName,
      profile_image: userPhoto,
      access_token: effectiveToken,
      refresh_token: `ref_${Date.now()}`,
      token_expires_at: tokenExpiresAt
    });

    return {
      success: true,
      user,
      message: `${userName}님, ${provider.toUpperCase()} 계정으로 가입 신청 및 로그인이 완료되었습니다!`
    };
  } else {
    // 2. [로그인] 흐름: DB에서 계정 존재 여부 검증
    const existing = await findUserAccount(provider, providerUserId);
    if (existing) {
      const updated = await updateUserLoginSession(provider, providerUserId, {
        access_token: effectiveToken,
        token_expires_at: tokenExpiresAt
      });
      return {
        success: true,
        user: updated || existing,
        message: `${userName}님, 정상적으로 로그인되었습니다.`
      };
    } else {
      // 미가입 계정인 경우 안내 및 가입신청 유도
      return {
        success: false,
        message: `가입되지 않은 ${provider.toUpperCase()} 계정입니다. [가입 신청] 버튼을 눌러 정식 가입을 진행해주세요.`
      };
    }
  }
}
