import fs from 'fs';

function haversine(p1, p2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (p2.lat - p1.lat) * rad;
  const dLng = (p2.lng - p1.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * rad) * Math.cos(p2.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const gpx = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');

// Parse trkseg
const segMatches = gpx.match(/<trkseg>[\s\S]*?<\/trkseg>/g) || [];
console.log('Total trkseg count in GPX:', segMatches.length);

const segments = segMatches.map((segXml, idx) => {
  const ptMatches = [...segXml.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)">([\s\S]*?)<\/trkpt>/g)];
  const pts = ptMatches.map(m => {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    const eleM = m[3].match(/<ele>([^<]+)<\/ele>/);
    const ele = eleM ? parseFloat(eleM[1]) : 0;
    return { lat, lng, ele };
  });

  let dist = 0;
  for (let i = 1; i < pts.length; i++) {
    dist += haversine(pts[i - 1], pts[i]);
  }
  return { idx: idx + 1, count: pts.length, distKm: dist / 1000, start: pts[0], end: pts[pts.length - 1], pts };
});

// Landmarks
const wira = { lat: 36.496811, lng: 126.747491, name: '위라1리' };
const daeryong = { lat: 36.49573, lng: 126.93409, name: '대룡1리' };

console.log('\n--- Segments near Section 14 (Seg 23 to 68) ---');
for (let i = 22; i < 68; i++) {
  const s = segments[i];
  if (!s || !s.start) continue;
  const dWiraStart = haversine(s.start, wira);
  const dWiraEnd = haversine(s.end, wira);
  const dDaeStart = haversine(s.start, daeryong);
  const dDaeEnd = haversine(s.end, daeryong);

  console.log(`Seg ${s.idx}: ${s.distKm.toFixed(2)}km (${s.count}pts) | Start: (${s.start.lat.toFixed(5)}, ${s.start.lng.toFixed(5)}) End: (${s.end.lat.toFixed(5)}, ${s.end.lng.toFixed(5)}) | to대룡: S=${dDaeStart.toFixed(0)}m, E=${dDaeEnd.toFixed(0)}m`);
}
