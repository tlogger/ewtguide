import fs from 'fs';

function haversine(p1, p2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (p2.lat - p1.lat) * rad;
  const dLng = (p2.lng - p1.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * rad) * Math.cos(p2.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const s14 = JSON.parse(fs.readFileSync('public/data/sections/section_14.json', 'utf8'));
const pts = s14.points;

console.log('Section 14 info:');
console.log('Official Distance:', s14.official_distance_km);
console.log('Start point:', s14.start_point);
console.log('End point:', s14.end_point);
console.log('Total points:', pts.length);

// Check distances and find where it goes
let totalDist = 0;
for (let i = 1; i < pts.length; i++) {
  totalDist += haversine(pts[i - 1], pts[i]);
}
console.log('Calculated polyline length:', (totalDist / 1000).toFixed(2), 'km');

// Check last 50 points
console.log('\n--- Last 30 points of section_14.json ---');
for (let i = pts.length - 30; i < pts.length; i++) {
  const p = pts[i];
  const prev = pts[i - 1];
  const stepD = prev ? haversine(prev, p) : 0;
  console.log(`[${i}] (${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}) step=${stepD.toFixed(1)}m dist=${p.dist}km`);
}

// Find if there is any strange loop or backtrack
console.log('\n--- Checking for backtrack / jump in the last 150 points ---');
for (let i = pts.length - 150; i < pts.length - 1; i++) {
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const d = haversine(p1, p2);
  if (d > 50) {
    console.log(`Jump at ${i}->${i+1}: ${d.toFixed(1)}m`);
  }
}
