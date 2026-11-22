import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DEFAULT_SUPABASE_URL = 'https://johtqemdlprtbpohdkgu.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

const ALLOWED_ORIGINS = new Set([
  'https://ewtguide.vercel.app',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
]);

const MAX_BYTES = 307_200; // 300 KB
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidWebP(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

function isValidJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

async function readRawBody(req: VercelRequest, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > limit) {
      const err = new Error('PAYLOAD_TOO_LARGE');
      (err as Error & { code?: string }).code = 'PAYLOAD_TOO_LARGE';
      throw err;
    }
    chunks.push(buf);
  }

  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id, x-section-id');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // 1. Fail-fast Content-Type check
  const rawContentType = typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : '';
  const contentType = rawContentType.split(';')[0].trim().toLowerCase();
  if (contentType !== 'image/webp' && contentType !== 'image/jpeg') {
    res.status(415).json({ error: 'Unsupported Media Type. Use image/webp or image/jpeg.' });
    return;
  }

  // 2. Fail-fast Content-Length / body size check (<= 300KB)
  const contentLengthHeader = req.headers['content-length'];
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_BYTES) {
    res.status(413).json({ error: 'Payload Too Large (max 300KB).' });
    return;
  }

  let bodyBuffer: Buffer;
  try {
    bodyBuffer = await readRawBody(req, MAX_BYTES);
  } catch (err) {
    if ((err as Error & { code?: string }).code === 'PAYLOAD_TOO_LARGE') {
      res.status(413).json({ error: 'Payload Too Large (max 300KB).' });
      return;
    }
    res.status(400).json({ error: 'Failed to read request body.' });
    return;
  }

  if (bodyBuffer.length === 0) {
    res.status(400).json({ error: 'Empty image payload.' });
    return;
  }

  // 3. Fail-fast binary magic-byte validation
  const matchesType =
    (contentType === 'image/webp' && isValidWebP(bodyBuffer)) ||
    (contentType === 'image/jpeg' && isValidJpeg(bodyBuffer));
  if (!matchesType) {
    res.status(415).json({ error: 'Invalid image binary signature.' });
    return;
  }

  // 4. Fail-fast x-user-id UUID format check
  const userId = typeof req.headers['x-user-id'] === 'string' ? req.headers['x-user-id'].trim() : '';
  if (!UUID_REGEX.test(userId)) {
    res.status(401).json({ error: 'Valid logged-in user ID required.' });
    return;
  }

  // 5. Verify user exists in public.user_accounts
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  try {
    const checkUrl = `${supabaseUrl}/rest/v1/user_accounts?select=id&id=eq.${encodeURIComponent(userId)}&limit=1`;
    const userRes = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!userRes.ok) {
      res.status(502).json({ error: 'Failed to verify user account.' });
      return;
    }

    const rows = (await userRes.json()) as { id: string }[];
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }
  } catch {
    res.status(502).json({ error: 'User verification upstream timeout.' });
    return;
  }

  // 6. Direct Vercel Blob put()
  const rawSection = typeof req.headers['x-section-id'] === 'string' ? req.headers['x-section-id'].trim() : '0';
  const sectionNum = /^\d{1,2}$/.test(rawSection) ? rawSection : '0';
  const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
  const pathname = `pois/${sectionNum}/${crypto.randomUUID()}.${ext}`;

  try {
    const blob = await put(pathname, bodyBuffer, {
      access: 'public',
      contentType,
      cacheControlMaxAge: 31536000,
    });
    res.status(200).json({ url: blob.url });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Blob upload failed';
    res.status(502).json({ error: 'Storage upload failed', detail });
  }
}
