/**
 * 동서트레일 거리, 방위각, 보행 소요시간 및 경보음 유틸리티
 */

/** 위경도 좌표 간 거리 계산 (Haversine 공식, 미터 단위) */
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // 지구 반지름 (m)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/** 두 좌표 간 방위각 계산 (0° ~ 360°, 북쪽 0°, 시계 방향) */
export function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (Math.round((theta * 180) / Math.PI) + 360) % 360;
}

/** 방위각(0~360)을 8방위 텍스트 및 화살표 기호로 변환 */
export function getBearingDirectionText(bearing: number): { text: string; arrow: string } {
  if (bearing >= 337.5 || bearing < 22.5) return { text: '북쪽', arrow: '↑' };
  if (bearing >= 22.5 && bearing < 67.5) return { text: '북동쪽', arrow: '↗' };
  if (bearing >= 67.5 && bearing < 112.5) return { text: '동쪽', arrow: '→' };
  if (bearing >= 112.5 && bearing < 157.5) return { text: '남동쪽', arrow: '↘' };
  if (bearing >= 157.5 && bearing < 202.5) return { text: '남쪽', arrow: '↓' };
  if (bearing >= 202.5 && bearing < 247.5) return { text: '남서쪽', arrow: '↙' };
  if (bearing >= 247.5 && bearing < 292.5) return { text: '서쪽', arrow: '←' };
  return { text: '북서쪽', arrow: '↖' };
}

/** 주어진 좌표에서 트레일 경로(포인트 목록) 중 가장 가까운 포인트 및 최단 거리(m) 탐색 */
export function findNearestTrailPoint(
  target: { lat: number; lng: number },
  trailPoints: Array<{ lat: number; lng: number }>
): { nearest: { lat: number; lng: number }; distanceM: number; index: number } | null {
  if (!trailPoints || trailPoints.length === 0) return null;

  let minDistance = Infinity;
  let nearestPoint = trailPoints[0];
  let nearestIndex = 0;

  for (let i = 0; i < trailPoints.length; i++) {
    const pt = trailPoints[i];
    const d = getDistanceMeters(target.lat, target.lng, pt.lat, pt.lng);
    if (d < minDistance) {
      minDistance = d;
      nearestPoint = pt;
      nearestIndex = i;
    }
  }

  return { nearest: nearestPoint, distanceM: minDistance, index: nearestIndex };
}

/** 도보 소요시간 계산 (평지 시속 4.0km 기준) */
export function calculateWalkingTime(distanceKm: number): string {
  if (distanceKm <= 0) return '0분';
  const totalMinutes = Math.round((distanceKm / 4.0) * 60);
  if (totalMinutes < 60) {
    return `약 ${totalMinutes}분`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `약 ${hours}시간 ${minutes}분` : `약 ${hours}시간`;
}

/** Web Audio API를 활용한 경로 이탈 비프 경보음(880Hz~1200Hz 2회 알림음) */
let sharedAudioCtx: AudioContext | null = null;

export function playOffTrackWarningBeep(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }

    const now = sharedAudioCtx.currentTime;

    // 1st Beep (880Hz)
    const osc1 = sharedAudioCtx.createOscillator();
    const gain1 = sharedAudioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(sharedAudioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // 2nd Beep (1174Hz, High Warning tone)
    const osc2 = sharedAudioCtx.createOscillator();
    const gain2 = sharedAudioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174, now + 0.14);
    gain2.gain.setValueAtTime(0.35, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(sharedAudioCtx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.warn('Audio Beep warning notice:', e);
  }
}
