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

// Check where 5구간 and 6구간 come from in raw GPX:
// 4구간 end was: 상담교 (36.793154, 126.3684)
// Let's see which segment contains 5구간:
// In list_all_segments:
// Segment 1 ends at (36.8193777, 126.5017005) [율목리마을!]
// Segment 3 starts at (36.8193612, 126.5017285) [율목리마을!]
console.log('--- 5 -> 6: Check Segment 1 end and Segment 3 start ---');
const seg1 = allSegs[1].pts;
const seg3 = allSegs[3].pts;
console.log('Seg 1 end:  ', seg1[seg1.length - 1]);
console.log('Seg 3 start:', seg3[0]);
console.log('Distance between Seg 1 end and Seg 3 start:', getDistance(seg1[seg1.length - 1], seg3[0]), 'meters');

// Why did section_5.json end at (36.82156, 126.495888)?
const s5 = JSON.parse(fs.readFileSync('public/data/sections/section_5.json', 'utf8'));
const s6 = JSON.parse(fs.readFileSync('public/data/sections/section_6.json', 'utf8'));
console.log('section_5.json end:', s5.points[s5.points.length - 1]);
console.log('section_6.json start:', s6.points[0]);
console.log('Distance from s5 end to Seg 1 end:', getDistance(s5.points[s5.points.length - 1], seg1[seg1.length - 1]));
console.log('Distance from s6 start to Seg 3 start:', getDistance(s6.points[0], seg3[0]));

// Check 6 -> 7:
// Segments 3 through 21 connect 율목리마을 to 삼웅2리마을회관:
// Segment 21 ends at (36.822117, 126.637968) [삼웅2리마을회관!]
// Segment 22 starts at (36.822116, 126.638008) [삼웅2리마을회관!]
console.log('\n--- 6 -> 7: Check Segment 21 end and Segment 22 start ---');
const seg21 = allSegs[21].pts;
const seg22 = allSegs[22].pts;
console.log('Seg 21 end:  ', seg21[seg21.length - 1]);
console.log('Seg 22 start:', seg22[0]);
console.log('Distance between Seg 21 end and Seg 22 start:', getDistance(seg21[seg21.length - 1], seg22[0]), 'meters');

const s7 = JSON.parse(fs.readFileSync('public/data/sections/section_7.json', 'utf8'));
console.log('section_6.json end:', s6.points[s6.points.length - 1]);
console.log('section_7.json start:', s7.points[0]);
console.log('Distance from s7 start to Seg 22 start:', getDistance(s7.points[0], seg22[0]));

// Check 46 -> 47:
// In list_all_segments:
// Segment 73: 786 pts | Start: (37.068865, 128.609171) -> End: (37.026467, 128.700359)
// Segment 74: 2 pts | Start: (37.026467, 128.700358) -> End: (37.026467, 128.700359)
// Segment 75: 2 pts | Start: (37.026467, 128.700359) -> End: (37.026466, 128.700359)
// Segment 76: 2061 pts | Start: (37.026467, 128.700359) -> End: (36.944102, 128.963538)
console.log('\n--- 46 -> 47: Check Segment 73, 74, 75, 76 ---');
const s46 = JSON.parse(fs.readFileSync('public/data/sections/section_46.json', 'utf8'));
const s47 = JSON.parse(fs.readFileSync('public/data/sections/section_47.json', 'utf8'));
console.log('section_46.json end:', s46.points[s46.points.length - 1]);
console.log('section_47.json start:', s47.points[0]);
console.log('Seg 73 end:  ', allSegs[73].pts[allSegs[73].pts.length - 1]);
console.log('Seg 76 start:', allSegs[76].pts[0]);
console.log('Distance between Seg 73 end and Seg 76 start:', getDistance(allSegs[73].pts[allSegs[73].pts.length - 1], allSegs[76].pts[0]));

// Check 49 -> 50:
// Segment 76 ends at (36.944102, 128.963538) [현동삼거리!]
// Segment 77: 10119 pts | Start: (36.944102, 128.963538) -> End: (36.968059, 129.412604)
console.log('\n--- 49 -> 50: Check Segment 76 end and Segment 77 start ---');
const s49 = JSON.parse(fs.readFileSync('public/data/sections/section_49.json', 'utf8'));
const s50 = JSON.parse(fs.readFileSync('public/data/sections/section_50.json', 'utf8'));
console.log('section_49.json end:', s49.points[s49.points.length - 1]);
console.log('section_50.json start:', s50.points[0]);
console.log('Seg 76 end:  ', allSegs[76].pts[allSegs[76].pts.length - 1]);
console.log('Seg 77 start:', allSegs[77].pts[0]);
console.log('Distance between Seg 76 end and Seg 77 start:', getDistance(allSegs[76].pts[allSegs[76].pts.length - 1], allSegs[77].pts[0]));
