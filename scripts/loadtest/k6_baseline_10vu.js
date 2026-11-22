import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Phase 1A Baseline Load Test (10 VU x 5m)
 * Shared Supabase Free Quota protection: run at 10 VU and extrapolate x100 for 1,000 VU baseline.
 *
 * Usage:
 *   k6 run -e SUPABASE_URL=https://... -e SUPABASE_ANON_KEY=... scripts/loadtest/k6_baseline_10vu.js
 */
export const options = {
  vus: 10,
  duration: '5m',
};

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://johtqemdlprtbpohdkgu.supabase.co';
const SUPABASE_KEY = __ENV.SUPABASE_ANON_KEY || '';

export default function () {
  if (!SUPABASE_KEY) {
    throw new Error('SUPABASE_ANON_KEY env var is required');
  }

  // Legacy TrailMapView behavior: 5 direct section queries per map entry (N-2..N+2)
  const centerSection = 12;
  for (let s = centerSection - 2; s <= centerSection + 2; s++) {
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/ewt_facilities?select=*&section_id=eq.${s}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    check(res, { 'status 200': (r) => r.status === 200 });
  }
  sleep(30);
}
