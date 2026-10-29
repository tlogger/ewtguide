import fs from 'fs';
import path from 'path';

function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function generateDeterministicPoiId(name, lat, lng) {
  const normName = (name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-_:.,()\/\\·]/g, '');

  const latStr = lat !== undefined && lat !== null ? Number(lat).toFixed(4) : '0';
  const lngStr = lng !== undefined && lng !== null ? Number(lng).toFixed(4) : '0';

  const key = `${normName}_${latStr}_${lngStr}`;
  const hash = simpleHash(key);
  const safePrefix = normName.slice(0, 6) || 'poi';
  return `poi_${safePrefix}_${hash}`;
}

const sectionsDir = path.resolve('public/data/sections');
const files = fs.readdirSync(sectionsDir).filter(f => f.startsWith('section_') && f.endsWith('.json'));

let totalAssigned = 0;

for (const file of files) {
  const fullPath = path.join(sectionsDir, file);
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  if (Array.isArray(data.pois) && data.pois.length > 0) {
    let changed = false;
    data.pois = data.pois.map((poi, idx) => {
      const deterministicId = generateDeterministicPoiId(poi.name, poi.lat, poi.lng);
      if (poi.id !== deterministicId || poi.is_official !== true) {
        changed = true;
        totalAssigned++;
        return {
          ...poi,
          id: deterministicId,
          is_official: true
        };
      }
      return poi;
    });

    if (changed) {
      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated ${file} (${data.pois.length} POIs)`);
    }
  }
}

console.log(`\nDone! Total POIs assigned deterministic ID: ${totalAssigned}`);
