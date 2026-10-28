import fs from 'fs';

const gpxRaw = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');
const segMatches = [...gpxRaw.matchAll(/<trkseg>([\s\S]*?)<\/trkseg>/g)];

console.log(`Total GPX segments: ${segMatches.length}`);

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

// Check 1 -> 2:
// 1구간 is Segment 2:
// Start: (36.496765, 126.358909) -> End: (36.586376, 126.315198)
// Wait! Let's check Segment 2's end point:
const seg2 = allSegs[2].pts;
console.log('--- 1 -> 2: Segment 2 (1구간) in raw GPX ---');
console.log('Seg 2 start:', seg2[0]);
console.log('Seg 2 end:  ', seg2[seg2.length - 1]);

// What is 2구간 start?
const seg0 = allSegs[0].pts;
console.log('Seg 0 (2구간) start:', seg0[0]);
console.log('Distance between Seg 2 end and Seg 0 start:', getDistance(seg2[seg2.length - 1], seg0[0]), 'meters');

// Why did section_1.json end at (36.585737, 126.314567)?
const s1 = JSON.parse(fs.readFileSync('public/data/sections/section_1.json', 'utf8'));
console.log('section_1.json end point:', s1.points[s1.points.length - 1]);
console.log('Distance from section_1 end to Seg 2 end:', getDistance(s1.points[s1.points.length - 1], seg2[seg2.length - 1]));
