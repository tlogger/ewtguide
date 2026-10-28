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

// 1. Check Section 1
const s1 = JSON.parse(fs.readFileSync('public/data/sections/section_1.json', 'utf8'));
const s2 = JSON.parse(fs.readFileSync('public/data/sections/section_2.json', 'utf8'));
console.log('s1 end:', s1.points[s1.points.length - 1]);
console.log('s2 start:', s2.points[0]);
console.log('Distance s1 end to s2 start:', getDistance(s1.points[s1.points.length - 1], s2.points[0]), 'm');

// 2. Check Section 5 & 6
const s5 = JSON.parse(fs.readFileSync('public/data/sections/section_5.json', 'utf8'));
const s6 = JSON.parse(fs.readFileSync('public/data/sections/section_6.json', 'utf8'));
console.log('\ns5 end:', s5.points[s5.points.length - 1]);
console.log('s6 start:', s6.points[0]);
console.log('Distance s5 end to s6 start:', getDistance(s5.points[s5.points.length - 1], s6.points[0]), 'm');

// 3. Check Section 6 & 7
const s7 = JSON.parse(fs.readFileSync('public/data/sections/section_7.json', 'utf8'));
console.log('\ns6 end:', s6.points[s6.points.length - 1]);
console.log('s7 start:', s7.points[0]);
console.log('Distance s6 end to s7 start:', getDistance(s6.points[s6.points.length - 1], s7.points[0]), 'm');

// 4. Check Section 46 & 47
const s46 = JSON.parse(fs.readFileSync('public/data/sections/section_46.json', 'utf8'));
const s47 = JSON.parse(fs.readFileSync('public/data/sections/section_47.json', 'utf8'));
console.log('\ns46 end:', s46.points[s46.points.length - 1]);
console.log('s47 start:', s47.points[0]);
console.log('Distance s46 end to s47 start:', getDistance(s46.points[s46.points.length - 1], s47.points[0]), 'm');

// 5. Check Section 49 & 50
const s49 = JSON.parse(fs.readFileSync('public/data/sections/section_49.json', 'utf8'));
const s50 = JSON.parse(fs.readFileSync('public/data/sections/section_50.json', 'utf8'));
console.log('\ns49 end:', s49.points[s49.points.length - 1]);
console.log('s50 start:', s50.points[0]);
console.log('Distance s49 end to s50 start:', getDistance(s49.points[s49.points.length - 1], s50.points[0]), 'm');
