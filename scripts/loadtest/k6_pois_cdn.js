import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

/**
 * Phase 1A After Load Test (Read-only 50~100 VU x 2m against Vercel Edge CDN)
 * Verifies CDN cache hit ratio >= 98%, P95 < 200ms, error rate < 0.1%.
 *
 * Usage:
 *   k6 run -e BASE_URL=https://ewtguide.vercel.app scripts/loadtest/k6_pois_cdn.js
 */
const cdnHitRate = new Rate('cdn_hit_or_stale_rate');

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || '2m',
  thresholds: {
    http_req_failed: ['rate<0.001'],
    'http_req_duration{endpoint:pois}': ['p(95)<200'],
    cdn_hit_or_stale_rate: ['rate>=0.98'],
  },
};

const BASE_URL = (__ENV.BASE_URL || 'https://ewtguide.vercel.app').replace(/\/+$/, '');

export default function () {
  const poisRes = http.get(`${BASE_URL}/api/pois`, {
    tags: { endpoint: 'pois' },
  });

  const cacheStatus = (poisRes.headers['X-Vercel-Cache'] || poisRes.headers['x-vercel-cache'] || '').toUpperCase();
  cdnHitRate.add(cacheStatus === 'HIT' || cacheStatus === 'STALE');

  check(poisRes, {
    'pois status 200': (r) => r.status === 200,
    'has ETag': (r) => Boolean(r.headers['ETag'] || r.headers['etag']),
  });

  const summaryRes = http.get(`${BASE_URL}/data/sections_summary.json`, {
    tags: { endpoint: 'static' },
  });
  check(summaryRes, { 'summary status 200': (r) => r.status === 200 });

  sleep(5);
}
