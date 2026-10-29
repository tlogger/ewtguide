import fs from 'fs';

const s14 = JSON.parse(fs.readFileSync('public/data/sections/section_14.json', 'utf8'));
const pts = s14.points;

function haversine(p1, p2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (p2.lat - p1.lat) * rad;
  const dLng = (p2.lng - p1.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * rad) * Math.cos(p2.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

console.log('Total points in section_14.json:', pts.length);
console.log('Total recorded distance:', pts[pts.length - 1].dist, 'km');

let jumps = [];
for (let i = 1; i < pts.length; i++) {
  const d = haversine(pts[i - 1], pts[i]);
  if (d > 30) {
    jumps.push({ idx: i, distM: d, prev: pts[i - 1], curr: pts[i] });
  }
}

console.log(`Found ${jumps.length} jumps > 30m:`);
jumps.forEach((j) => {
  console.log(`[Idx ${j.idx}] Jump ${j.distM.toFixed(1)}m | (${j.prev.lat.toFixed(5)}, ${j.prev.lng.toFixed(5)}) -> (${j.curr.lat.toFixed(5)}, ${j.curr.lng.toFixed(5)})`);
});

// Check target anchor: 대룡1리
// 충남 공주시 신풍면 대룡리 397-4
const targetAnchor = { lat: 36.49573, lng: 126.93409, name: '대룡1리' };
console.log('\nDist from end point to 대룡1리:', haversine(pts[pts.length - 1], targetAnchor).toFixed(1), 'm');

// Distance from all points near the end to targetAnchor
console.log('\nLast 20 points distance to 대룡1리:');
for (let i = pts.length - 20; i < pts.length; i++) {
  const p = pts[i];
  const dToTarget = haversine(p, targetAnchor);
  console.log(`  pt[${i}]: (${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}) ele=${p.ele} dist=${p.dist}km -> to target=${dToTarget.toFixed(1)}m`);
}
