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

const seg1 = parseSeg(segMatches[1]);
const s5 = JSON.parse(fs.readFileSync('public/data/sections/section_5.json', 'utf8'));

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
seg1.forEach((p, idx) => {
  const d = getDistance(p, s5.points[s5.points.length - 1]);
  if (d < minD) {
    minD = d;
    bestIdx = idx;
  }
});

console.log(`s5 end matched Seg 1 at index: ${bestIdx} (out of ${seg1.length - 1})`);
console.log(`Remaining points in Seg 1 after s5 end: ${seg1.length - 1 - bestIdx}`);
console.log('Seg 1 end point:', seg1[seg1.length - 1]);
console.log('Distance from s5 end to Seg 1 end:', getDistance(seg1[bestIdx], seg1[seg1.length - 1]), 'm');
