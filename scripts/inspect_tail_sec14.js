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

console.log('--- Inspecting Points 800 to 851 of section_14.json ---');
for (let i = 800; i < pts.length; i++) {
  const p = pts[i];
  const prev = pts[i - 1];
  const step = prev ? haversine(prev, p) : 0;
  console.log(`[${i}] lat=${p.lat.toFixed(6)}, lng=${p.lng.toFixed(6)}, ele=${p.ele}, step=${step.toFixed(1)}m, cum=${p.dist}km`);
}
