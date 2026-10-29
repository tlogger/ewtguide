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
const segMatches = gpx.match(/<trkseg>[\s\S]*?<\/trkseg>/g) || [];

function getSeg(idx) {
  const segXml = segMatches[idx - 1];
  const ptMatches = [...segXml.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)">([\s\S]*?)<\/trkpt>/g)];
  return ptMatches.map(m => {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    const eleM = m[3].match(/<ele>([^<]+)<\/ele>/);
    const ele = eleM ? parseFloat(eleM[1]) : 0;
    return { lat, lng, ele };
  });
}

const seg63 = getSeg(63);
console.log(`Seg 63: total ${seg63.length} points`);
console.log('Start (pt 0):', seg63[0]);
console.log('End (pt -1):', seg63[seg63.length - 1]);

// Let's trace Seg 63 reversed:
const seg63_rev = [...seg63].reverse();
console.log('\n--- Seg 63 Reversed (Connecting from current Sec 14 end to 대룡1리) ---');
console.log('Start of seg63_rev:', seg63_rev[0]);
console.log('End of seg63_rev:', seg63_rev[seg63_rev.length - 1]);

let maxStep = 0;
for (let i = 1; i < seg63_rev.length; i++) {
  const step = haversine(seg63_rev[i - 1], seg63_rev[i]);
  if (step > maxStep) maxStep = step;
}
console.log(`Max step between adjacent points in seg63_rev: ${maxStep.toFixed(1)}m`);

const daeryongTarget = { lat: 36.4925449351764, lng: 126.940394550238 };
const distToDaeryong = haversine(seg63_rev[seg63_rev.length - 1], daeryongTarget);
console.log(`Distance from end of seg63_rev to 대룡1리 anchor: ${distToDaeryong.toFixed(1)}m`);
