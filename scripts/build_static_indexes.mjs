import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'public', 'data');
const SECTIONS_DIR = path.join(DATA_DIR, 'sections');
const OVERVIEW_PATH = path.join(DATA_DIR, 'all_sections_overview.json');
const OFFICIAL_POIS_OUT = path.join(DATA_DIR, 'all_official_pois.json');

// Matches src/utils/poiId.ts generateDeterministicPoiId
function generateDeterministicPoiId(name, lat, lng) {
  const safeName = (name || 'unknown').trim().replace(/\s+/g, '');
  const latStr = typeof lat === 'number' && !Number.isNaN(lat) ? lat.toFixed(4) : '0.0000';
  const lngStr = typeof lng === 'number' && !Number.isNaN(lng) ? lng.toFixed(4) : '0.0000';
  const raw = `${safeName}_${latStr}_${lngStr}`;

  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hexHash = (hash >>> 0).toString(16).padStart(8, '0');
  const prefix = safeName.replace(/[^a-zA-Z0-9가-힣]/g, '').slice(0, 6);
  return `poi_${prefix}_${hexHash}`;
}

// 1. Extract all official POIs across 55 sections -> public/data/all_official_pois.json
const sectionFiles = fs
  .readdirSync(SECTIONS_DIR)
  .filter((f) => /^section_\d+\.json$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const allOfficialPois = [];
for (const file of sectionFiles) {
  const fullPath = path.join(SECTIONS_DIR, file);
  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const sectionId = Number(raw.section_id || file.match(/\d+/)[0]);
  const pois = Array.isArray(raw.pois) ? raw.pois : [];

  for (const poi of pois) {
    if (typeof poi.lat !== 'number' || typeof poi.lng !== 'number') continue;
    const id = poi.id || generateDeterministicPoiId(poi.name, poi.lat, poi.lng);
    const categories =
      Array.isArray(poi.categories) && poi.categories.length > 0
        ? poi.categories
        : [poi.category || 'other'];
    const photoUrl =
      typeof poi.photo_url === 'string' && !poi.photo_url.startsWith('data:')
        ? poi.photo_url
        : undefined;

    allOfficialPois.push({
      id,
      section_id: sectionId,
      name: poi.name,
      category: categories[0],
      categories,
      description: poi.description || undefined,
      lat: poi.lat,
      lng: poi.lng,
      phone: poi.phone || undefined,
      business_hours: poi.business_hours || undefined,
      memo: poi.memo || undefined,
      photo_url: photoUrl,
      is_official: true,
    });
  }
}

fs.writeFileSync(OFFICIAL_POIS_OUT, JSON.stringify(allOfficialPois), 'utf8');
console.log(
  `[build_static_indexes] Wrote ${allOfficialPois.length} official POIs -> ${OFFICIAL_POIS_OUT} (${(
    fs.statSync(OFFICIAL_POIS_OUT).size / 1024
  ).toFixed(1)} KB)`
);

// 2. Strip unused `ele` from all_sections_overview.json and minify for Tier 1 lightness
if (fs.existsSync(OVERVIEW_PATH)) {
  const beforeBytes = fs.statSync(OVERVIEW_PATH).size;
  const overview = JSON.parse(fs.readFileSync(OVERVIEW_PATH, 'utf8'));
  const slim = overview.map((sec) => ({
    ...sec,
    path: Array.isArray(sec.path)
      ? sec.path.map((pt) => ({ lat: pt.lat, lng: pt.lng }))
      : [],
  }));
  fs.writeFileSync(OVERVIEW_PATH, JSON.stringify(slim), 'utf8');
  const afterBytes = fs.statSync(OVERVIEW_PATH).size;
  console.log(
    `[build_static_indexes] Slimmed all_sections_overview.json: ${(beforeBytes / 1024).toFixed(1)} KB -> ${(
      afterBytes / 1024
    ).toFixed(1)} KB`
  );
}
