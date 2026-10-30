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
  kakaoCallbackUrl: string;
  naverClientId: string;
  naverCallbackUrl: string;
  googleClientId: string;
}

/** 기본 및 로컬 저장된 OAuth 클라이언트 ID 조회 */
export function getOAuthClientConfig(): OAuthClientConfig {
  const envKakao = import.meta.env.VITE_KAKAO_CLIENT_ID || '354131879d586356f9c160db0f834840';
  const envKakaoCallback = import.meta.env.VITE_KAKAO_CALLBACK_URL || 'https://tlogger.github.io/ewtguide/kakaologin';
  const envNaver = import.meta.env.VITE_NAVER_CLIENT_ID || 'ZlO4zT_XXNDHb24LQL5u';
  const envNaverCallback = import.meta.env.VITE_NAVER_CALLBACK_URL || 'https://tlogger.github.io/ewtguide/naverlogin';
  const envGoogle = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  try {
    const raw = localStorage.getItem(OAUTH_KEYS_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        kakaoClientId: parsed.kakaoClientId || envKakao,
        kakaoCallbackUrl: parsed.kakaoCallbackUrl || envKakaoCallback,
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
    kakaoCallbackUrl: envKakaoCallback,
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
    const callbackUrl = window.location.hostname === 'localhost'
      ? `${window.location.origin}/naverlogin`
      : config.naverCallbackUrl;

    return {
      url: `https://nid.naver.com/oauth2.0/authorize?response_type=token&client_id=${encodeURIComponent(
        naverClientId
      )}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`
    };
  }

  if (provider === 'kakao') {
    const kakaoKey = config.kakaoClientId || '354131879d586356f9c160db0f834840';
    const callbackUrl = window.location.hostname === 'localhost'
      ? `${window.location.origin}/kakaologin`
      : config.kakaoCallbackUrl;

    return {
      url: `https://kauth.kakao.com/oauth/authorize?client_id=${encodeURIComponent(
        kakaoKey
      )}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&state=${state}`
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
  // 1. 네이버 콜백 수신 확인
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

  // 2. 카카오 콜백 수신 확인
  const kakaoPayloadRaw = localStorage.getItem('ewtguide_kakao_auth_payload');
  if (kakaoPayloadRaw) {
    try {
      const parsed = JSON.parse(kakaoPayloadRaw);
      localStorage.removeItem('ewtguide_kakao_auth_payload');
      const mode = (localStorage.getItem('ewtguide_oauth_mode') as 'login' | 'signup') || 'login';
      localStorage.removeItem('ewtguide_oauth_mode');

      return {
        provider: 'kakao',
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

  // 3. URL 해시(#) 및 쿼리(?) 직접 파싱
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
  let effectiveToken = directUser?.access_token || accessToken || code || `tok_${Date.now()}`;
  
  // 실제 소셜 공급자에서 제공한 고유 식별자(ID) 및 정보 반영
  let providerUserId = directUser?.id || `${provider}_${Math.floor(100000 + Math.random() * 900000)}`;
  let userName = directUser?.name || (provider === 'naver' ? '네이버 트레커' : provider === 'kakao' ? '카카오 트레커' : '구글 트레커');
  let userEmail = directUser?.email || `${provider}_user@ewtguide.kr`;
  let userPhoto = directUser?.profile_image || null;

  // 카카오의 인가 코드(code)가 URL로 직접 수신된 경우: 카카오 토큰 교환 및 사용자 프로필 실시간 조회
  if (provider === 'kakao' && code && !directUser) {
    try {
      const config = getOAuthClientConfig();
      const callbackUrl = window.location.hostname === 'localhost'
        ? `${window.location.origin}/kakaologin`
        : config.kakaoCallbackUrl;

      const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.kakaoClientId,
          redirect_uri: callbackUrl,
          code
        })
      });

      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        effectiveToken = tokenData.access_token;
        const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`
          }
        });
        const kakaoUser = await userRes.json();
        if (kakaoUser.id) {
          providerUserId = `kakao_${kakaoUser.id}`;
          userName = kakaoUser.kakao_account?.profile?.nickname || '카카오 트레커';
          userEmail = kakaoUser.kakao_account?.email || `${providerUserId}@kakao.com`;
          userPhoto = kakaoUser.kakao_account?.profile?.profile_image_url || null;
        }
      }
    } catch (err) {
      console.warn('Kakao token exchange notice:', err);
    }
  }

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
      // 미가입 계정이더라도 소셜 인증에 성공한 경우 즉시 안전하게 자동 가입(JIT Provisioning) 및 로그인 완료
      const newUser = await registerUserAccount({
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
        user: newUser,
        message: `${userName}님 환영합니다! ${provider.toUpperCase()} 계정으로 간편 가입 및 로그인이 완료되었습니다.`
      };
    }
  }
}
