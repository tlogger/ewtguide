import fs from 'fs';

const cache = JSON.parse(fs.readFileSync('scripts/elevation_cache.json', 'utf8'));
console.log('Total cached elevation entries:', Object.keys(cache).length);

const gpxRaw = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');
const segMatches = [...gpxRaw.matchAll(/<trkseg>([\s\S]*?)<\/trkseg>/g)];

const seg0 = [...segMatches[0][1].matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g)].map(m => ({
  lat: parseFloat(m[1]),
  lng: parseFloat(m[2]),
  ele: parseFloat(m[3])
}));
const seg1 = [...segMatches[1][1].matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g)].map(m => ({
  lat: parseFloat(m[1]),
  lng: parseFloat(m[2]),
  ele: parseFloat(m[3])
}));

const rawSec2 = [...seg0, ...seg1.slice(1, 59)];
const rawSec3 = seg1.slice(58, 419);

function checkHits(pts, name) {
  let hits = 0;
  pts.forEach(p => {
    const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    if (cache[key] !== undefined) hits++;
  });
  console.log(`${name}: ${hits} / ${pts.length} hits in elevation cache`);
}

checkHits(rawSec2, 'Raw Sec 2');
checkHits(rawSec3, 'Raw Sec 3');
