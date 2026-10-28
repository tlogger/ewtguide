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

const s46 = JSON.parse(fs.readFileSync('public/data/sections/section_46.json', 'utf8'));
const s47 = JSON.parse(fs.readFileSync('public/data/sections/section_47.json', 'utf8'));

console.log('s46 summary / course:', s46.course, s46.official_distance_km, s46.calculated_distance_km);
console.log('s47 summary / course:', s47.course, s47.official_distance_km, s47.calculated_distance_km);

// What is Segment 76?
const seg76 = parseSeg(segMatches[76]);
console.log('Seg 76 total points:', seg76.length);
console.log('Seg 76 start:', seg76[0]);
console.log('Seg 76 end:  ', seg76[seg76.length - 1]);

// Where does s47 start match in Seg 76?
let minD = Infinity, bestIdx = -1;
seg76.forEach((p, idx) => {
  const d = getDistance(p, s47.points[0]);
  if (d < minD) {
    minD = d;
    bestIdx = idx;
  }
});

console.log(`s47 start matches Seg 76 at index: ${bestIdx} (dist: ${minD.toFixed(1)}m)`);

// How long is Seg 76 from 0 to bestIdx?
let dist0toBest = 0;
for (let i = 1; i <= bestIdx; i++) {
  dist0toBest += getDistance(seg76[i-1], seg76[i]);
}
console.log(`Distance from Seg 76[0] to Seg 76[${bestIdx}]: ${(dist0toBest/1000).toFixed(2)} km`);

// What about Section 46? Does Section 46 need those points, or does Section 47 need those points?
// Let's check s46 distance:
// Official s46 distance is 16.8 km!
// Current s46 calculated is 10.8 km!
// 10.8 km + 5.5 km (or 4.4 km) = 16.3 km!!
// Official s47 distance is 18.2 km!
// Current s47 calculated is 17.1 km!
console.log('\n--- Checking course descriptions for 46 and 47 ---');
console.log('Sec 46 course:', s46.course);
console.log('Sec 47 course:', s47.course);
