/**
 * ewtguide 사용자 환경설정 쿠키 및 로컬 스토리지 영구 보전 유틸리티
 */

export type MapTypeMode = 'ROADMAP' | 'HYBRID' | 'TERRAIN';

/** 쿠키 읽기 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/** 쿠키 쓰기 (기본 365일 보존) */
export function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/** 지도 종류 설정 조회 (일반/위성/지형) */
export function getSavedMapMode(): MapTypeMode {
  const fromCookie = getCookie('ewt_map_mode');
  if (fromCookie === 'ROADMAP' || fromCookie === 'HYBRID' || fromCookie === 'TERRAIN') {
    return fromCookie;
  }
  try {
    const fromStorage = localStorage.getItem('ewt_map_mode');
    if (fromStorage === 'ROADMAP' || fromStorage === 'HYBRID' || fromStorage === 'TERRAIN') {
      return fromStorage as MapTypeMode;
    }
  } catch {}
  return 'ROADMAP';
}

/** 지도 종류 설정 저장 */
export function saveMapMode(mode: MapTypeMode): void {
  setCookie('ewt_map_mode', mode);
  try {
    localStorage.setItem('ewt_map_mode', mode);
  } catch {}
}

/** 고도 프로파일 열림/닫힘 상태 조회 */
export function getSavedElevationOpen(): boolean {
  const fromCookie = getCookie('ewt_elevation_open');
  if (fromCookie !== null) {
    return fromCookie === 'true';
  }
  try {
    const fromStorage = localStorage.getItem('ewt_elevation_open');
    if (fromStorage !== null) {
      return fromStorage === 'true';
    }
  } catch {}
  return false;
}

/** 고도 프로파일 열림/닫힘 상태 저장 */
export function saveElevationOpen(isOpen: boolean): void {
  setCookie('ewt_elevation_open', String(isOpen));
  try {
    localStorage.setItem('ewt_elevation_open', String(isOpen));
  } catch {}
}

/**
 * 텍스트 내 괄호 안의 끝 문자가 ','인 경우 제거: (태안군,) -> (태안군)
 * 또는 괄호 안의 불필요한 쉼표 찌꺼기 정리
 */
export function cleanTrailingCommaInParentheses(text: string): string {
  if (!text) return '';
  return text
    // 괄호 안 끝 쉼표 제거 (예: "(태안군,)" -> "(태안군)", "(서산시, )" -> "(서산시)")
    .replace(/,\s*\)/g, ')')
    // 연속 쉼표 정리 (예: ",," -> ",")
    .replace(/,\s*,+/g, ', ')
    .trim();
}
