/**
 * 동서트레일 가이드 (ewtguide) 결정론적 POI 고유 식별자 생성기
 * 
 * 크롤링을 언제 다시 하든, 데이터 순서가 바뀌더라도
 * 동일한 시설(시설명 + 소수점 4자리 좌표)에 대해서는
 * 언제나 100% 동일한 멱등적(Idempotent) 고유 키를 생성합니다.
 */

function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export function generateDeterministicPoiId(name: string, lat?: number, lng?: number): string {
  // 1. 시설명 정규화 (소문자화, 공백 및 특수문자 제거)
  const normName = (name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-_:.,()\/\\·]/g, '');

  // 2. 좌표 정규화 (소수점 4자리 고정: 약 1.1m 정밀도)
  const latStr = lat !== undefined && lat !== null ? Number(lat).toFixed(4) : '0';
  const lngStr = lng !== undefined && lng !== null ? Number(lng).toFixed(4) : '0';

  // 3. 해시 생성
  const key = `${normName}_${latStr}_${lngStr}`;
  const hash = simpleHash(key);

  // 식별 가능한 접두어와 8자리 해시 결합
  const safePrefix = normName.slice(0, 6) || 'poi';
  return `poi_${safePrefix}_${hash}`;
}
