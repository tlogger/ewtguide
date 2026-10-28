import fs from 'fs';

const gpxRaw = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');
const segMatches = [...gpxRaw.matchAll(/<trkseg>([\s\S]*?)<\/trkseg>/g)];

// Segment 0 points
const seg0 = [...segMatches[0][1].matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g)].map(m => ({
  lat: parseFloat(m[1]),
  lng: parseFloat(m[2]),
  ele: parseFloat(m[3])
}));

// Segment 1 points
const seg1 = [...segMatches[1][1].matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g)].map(m => ({
  lat: parseFloat(m[1]),
  lng: parseFloat(m[2]),
  ele: parseFloat(m[3])
}));

function getDistance(p1, p2) {
  const R = 6371e3;
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;
  const dlat = (p2.lat - p1.lat) * Math.PI / 180;
  const dlng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let seg0Dist = 0;
for (let i = 1; i < seg0.length; i++) {
  seg0Dist += getDistance(seg0[i-1], seg0[i]);
}

let seg1_0to58Dist = 0;
for (let i = 1; i <= 58; i++) {
  seg1_0to58Dist += getDistance(seg1[i-1], seg1[i]);
}

let seg1_58to418Dist = 0;
for (let i = 59; i <= 418; i++) {
  seg1_58to418Dist += getDistance(seg1[i-1], seg1[i]);
}

let seg1_0to418Dist = 0;
for (let i = 1; i <= 418; i++) {
  seg1_0to418Dist += getDistance(seg1[i-1], seg1[i]);
}

console.log(`Segment 0 length: ${(seg0Dist / 1000).toFixed(2)} km`);
console.log(`Segment 1 (pts 0 to 58) length: ${(seg1_0to58Dist / 1000).toFixed(2)} km`);
console.log(`Segment 1 (pts 58 to 418) length: ${(seg1_58to418Dist / 1000).toFixed(2)} km`);
console.log(`Segment 1 (pts 0 to 418) total length: ${(seg1_0to418Dist / 1000).toFixed(2)} km`);
console.log(`Segment 0 + Segment 1 (0 to 58) length: ${((seg0Dist + seg1_0to58Dist) / 1000).toFixed(2)} km`);
console.log(`Official distance: Sec 2 = 14.6 km, Sec 3 = 13.7 km`);
