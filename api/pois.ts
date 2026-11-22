import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_SUPABASE_URL = 'https://johtqemdlprtbpohdkgu.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

const PUBLIC_COLUMNS =
  'id,section_id,name,category,categories,lat,lng,phone,business_hours,memo,photo_url,is_official,is_deleted,updated_at';
const PAGE_SIZE = 1000;
const MAX_ROWS = 5000;

interface RawPoiRow {
  id: string;
  section_id: number;
  name: string;
  category: string;
  categories?: string[] | null;
  lat: number;
  lng: number;
  phone?: string | null;
  business_hours?: string | null;
  memo?: string | null;
  photo_url?: string | null;
  is_official?: boolean | null;
  is_deleted?: boolean | null;
  updated_at?: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, If-None-Match');
  res.setHeader('Access-Control-Expose-Headers', 'ETag, Date');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method && req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  const params = new URLSearchParams({
    select: PUBLIC_COLUMNS,
    order: 'updated_at.asc',
  });
  const baseUrl = `${supabaseUrl}/rest/v1/ewt_facilities?${params.toString()}`;

  try {
    const allRows: RawPoiRow[] = [];

    for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
      const rangeEnd = Math.min(offset + PAGE_SIZE - 1, MAX_ROWS - 1);
      const upstream = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
          Range: `${offset}-${rangeEnd}`,
          'Range-Unit': 'items',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!upstream.ok && upstream.status !== 206 && upstream.status !== 416) {
        const detail = await upstream.text().catch(() => '');
        res.setHeader('Cache-Control', 'no-store');
        res.status(502).json({ error: `Upstream Supabase error ${upstream.status}`, detail });
        return;
      }

      if (upstream.status === 416) {
        break;
      }

      const batch = (await upstream.json()) as RawPoiRow[];
      if (!Array.isArray(batch) || batch.length === 0) {
        break;
      }

      for (const row of batch) {
        // Guard against any legacy Base64 payloads before DB migration completes
        if (typeof row.photo_url === 'string' && row.photo_url.startsWith('data:')) {
          row.photo_url = null;
        }
        allRows.push(row);
      }

      if (batch.length < PAGE_SIZE) {
        break;
      }
    }

    const body = JSON.stringify({ pois: allRows });
    const etag = `"${crypto.createHash('sha256').update(body).digest('hex').slice(0, 32)}"`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');

    const ifNoneMatch = req.headers['if-none-match'];
    if (typeof ifNoneMatch === 'string' && ifNoneMatch.replace(/^W\//, '') === etag) {
      res.status(304).end();
      return;
    }

    res.status(200).send(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'Upstream fetch failed', detail: message });
  }
}
