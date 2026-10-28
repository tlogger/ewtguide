import fs from 'fs';

const gpxRaw = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');
const segMatches = [...gpxRaw.matchAll(/<trkseg>([\s\S]*?)<\/trkseg>/g)];

// Parse Segment 1 points
const seg1 = segMatches[1][1];
const pts = [...seg1.matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g)].map(m => ({
  lat: parseFloat(m[1]),
  lng: parseFloat(m[2]),
  ele: parseFloat(m[3])
}));

console.log('Segment 1 total points:', pts.length);
console.log('First 5 points of Segment 1:');
for (let i = 0; i < 5; i++) {
  console.log(`  [${i}] (${pts[i].lat}, ${pts[i].lng}, ele: ${pts[i].ele})`);
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

// Check where Section 3 starts and ends in public/data/sections/section_3.json
const s3 = JSON.parse(fs.readFileSync('public/data/sections/section_3.json', 'utf8'));
console.log('\nsection_3.json first pt:', s3.points[0]);
console.log('section_3.json last pt:', s3.points[s3.points.length - 1]);

// Find which index in Segment 1 corresponds to s3.points[0]
let minD0 = Infinity, bestIdx0 = -1;
let minDLast = Infinity, bestIdxLast = -1;

pts.forEach((p, idx) => {
  const d0 = getDistance(p, s3.points[0]);
  if (d0 < minD0) {
    minD0 = d0;
    bestIdx0 = idx;
  }
  const dL = getDistance(p, s3.points[s3.points.length - 1]);
  if (dL < minDLast) {
    minDLast = dL;
    bestIdxLast = idx;
  }
});

console.log(`\nMatch for s3.points[0] in Segment 1: index ${bestIdx0} (dist: ${minD0.toFixed(2)}m)`);
console.log(`Match for s3.points[last] in Segment 1: index ${bestIdxLast} (dist: ${minDLast.toFixed(2)}m)`);

console.log('\nWhat are points 0 to 59 in Segment 1?');
for (let i = 0; i < 10; i++) {
  console.log(`  [${i}] (${pts[i].lat}, ${pts[i].lng}) dist to start: ${getDistance(pts[0], pts[i]).toFixed(1)}m`);
}
console.log(`Point 59 (index ${bestIdx0}): (${pts[bestIdx0].lat}, ${pts[bestIdx0].lng}) dist to start: ${getDistance(pts[0], pts[bestIdx0]).toFixed(1)}m`);
