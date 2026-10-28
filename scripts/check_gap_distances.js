import fs from 'fs';

const gpxRaw = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');
const segMatches = [...gpxRaw.matchAll(/<trkseg>([\s\S]*?)<\/trkseg>/g)];

function parseSeg(segMatch) {
  return [...segMatch[1].matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g)].map(m => ({
    lat: parseFloat(m[1]),
    lng: parseFloat(m[2]),
    ele: parseFloat(m[3])
  }));
}

const allSegs = segMatches.map((m, idx) => ({ idx, pts: parseSeg(m) }));

function getDistance(p1, p2) {
  const R = 6371e3;
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;
  const dlat = (p2.lat - p1.lat) * Math.PI / 180;
  const dlng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function segLength(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    d += getDistance(pts[i - 1], pts[i]);
  }
  return d / 1000;
}

const summary = JSON.parse(fs.readFileSync('public/data/sections_summary.json', 'utf8'));

// Check 1:
console.log('--- Section 1 ---');
const s1Sum = summary.find(s => s.section_id === 1);
console.log('Official:', s1Sum.official_distance_km, 'Current calc:', s1Sum.calculated_distance_km);
console.log('Full Seg 2 length:', segLength(allSegs[2].pts).toFixed(2));

// Check 5:
console.log('\n--- Section 5 ---');
const s5Sum = summary.find(s => s.section_id === 5);
console.log('Official:', s5Sum.official_distance_km, 'Current calc:', s5Sum.calculated_distance_km);

// Check 6 & 7:
console.log('\n--- Section 6 & 7 ---');
const s6Sum = summary.find(s => s.section_id === 6);
const s7Sum = summary.find(s => s.section_id === 7);
console.log('Sec 6 Official:', s6Sum.official_distance_km, 'Current calc:', s6Sum.calculated_distance_km);
console.log('Sec 7 Official:', s7Sum.official_distance_km, 'Current calc:', s7Sum.calculated_distance_km);

// Check 46 & 47:
console.log('\n--- Section 46 & 47 ---');
const s46Sum = summary.find(s => s.section_id === 46);
const s47Sum = summary.find(s => s.section_id === 47);
console.log('Sec 46 Official:', s46Sum.official_distance_km, 'Current calc:', s46Sum.calculated_distance_km);
console.log('Sec 47 Official:', s47Sum.official_distance_km, 'Current calc:', s47Sum.calculated_distance_km);
const s47 = JSON.parse(fs.readFileSync('public/data/sections/section_47.json', 'utf8'));
console.log('s47 points count:', s47.points.length);

// Check 49 & 50:
console.log('\n--- Section 49 & 50 ---');
const s49Sum = summary.find(s => s.section_id === 49);
const s50Sum = summary.find(s => s.section_id === 50);
console.log('Sec 49 Official:', s49Sum.official_distance_km, 'Current calc:', s49Sum.calculated_distance_km);
console.log('Sec 50 Official:', s50Sum.official_distance_km, 'Current calc:', s50Sum.calculated_distance_km);
