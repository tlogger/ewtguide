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

const seg22 = parseSeg(segMatches[22]);
const s7 = JSON.parse(fs.readFileSync('public/data/sections/section_7.json', 'utf8'));

function getDistance(p1, p2) {
  const R = 6371e3;
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;
  const dlat = (p2.lat - p1.lat) * Math.PI / 180;
  const dlng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let minD = Infinity, bestIdx = -1;
seg22.forEach((p, idx) => {
  const d = getDistance(p, s7.points[0]);
  if (d < minD) {
    minD = d;
    bestIdx = idx;
  }
});

console.log(`s7 start matched Seg 22 at index: ${bestIdx}`);
console.log(`Seg 22 point 0:`, seg22[0]);
console.log(`Distance from Seg 22 point 0 to s7 start: ${getDistance(seg22[0], s7.points[0])} m`);
console.log(`Distance from s6 end to Seg 22 point 0: ${getDistance({ lat: 36.822117, lng: 126.637968 }, seg22[0])} m`);
