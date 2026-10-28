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

const s46 = JSON.parse(fs.readFileSync('public/data/sections/section_46.json', 'utf8'));
const s47 = JSON.parse(fs.readFileSync('public/data/sections/section_47.json', 'utf8'));

console.log('s46 official:', s46.official_distance_km, 'current:', s46.calculated_distance_km);
console.log('s47 official:', s47.official_distance_km, 'current:', s47.calculated_distance_km);

// Let's check Seg 73:
const seg73 = parseSeg(segMatches[73]);
console.log(`Seg 73 length: ${segLength(seg73).toFixed(2)} km, start: (${seg73[0].lat}, ${seg73[0].lng}), end: (${seg73[seg73.length-1].lat}, ${seg73[seg73.length-1].lng})`);

// Seg 76:
const seg76 = parseSeg(segMatches[76]);
console.log(`Seg 76 total length: ${segLength(seg76).toFixed(2)} km`);

// In s47, what are the start and end points?
console.log('s47 existing start:', s47.points[0]);
console.log('s47 existing end:  ', s47.points[s47.points.length - 1]);

// Let's check 49 and 50 as well:
const s49 = JSON.parse(fs.readFileSync('public/data/sections/section_49.json', 'utf8'));
const s50 = JSON.parse(fs.readFileSync('public/data/sections/section_50.json', 'utf8'));
console.log('\ns49 official:', s49.official_distance_km, 'current:', s49.calculated_distance_km);
console.log('s50 official:', s50.official_distance_km, 'current:', s50.calculated_distance_km);

const seg77 = parseSeg(segMatches[77]);
console.log(`Seg 77 total length: ${segLength(seg77).toFixed(2)} km`);
console.log('s50 existing start:', s50.points[0]);
console.log('s50 existing end:  ', s50.points[s50.points.length - 1]);

// Let's check where 47, 48, 49 are in Seg 76:
// Seg 76 has 47, 48, 49!
// Let's find where 47, 48, 49 are in Seg 76!
const s48 = JSON.parse(fs.readFileSync('public/data/sections/section_48.json', 'utf8'));
console.log('\ns48 official:', s48.official_distance_km, 'current:', s48.calculated_distance_km);
console.log('s48 start:', s48.points[0], 'end:', s48.points[s48.points.length - 1]);

function findIdxInSeg(seg, pt) {
  let minD = Infinity, best = -1;
  seg.forEach((p, idx) => {
    const d = getDistance(p, pt);
    if (d < minD) {
      minD = d;
      best = idx;
    }
  });
  return { idx: best, dist: minD };
}

console.log('s47 start in Seg 76:', findIdxInSeg(seg76, s47.points[0]));
console.log('s47 end in Seg 76:  ', findIdxInSeg(seg76, s47.points[s47.points.length - 1]));
console.log('s48 start in Seg 76:', findIdxInSeg(seg76, s48.points[0]));
console.log('s48 end in Seg 76:  ', findIdxInSeg(seg76, s48.points[s48.points.length - 1]));
console.log('s49 start in Seg 76:', findIdxInSeg(seg76, s49.points[0]));
console.log('s49 end in Seg 76:  ', findIdxInSeg(seg76, s49.points[s49.points.length - 1]));
