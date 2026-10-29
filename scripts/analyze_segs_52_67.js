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

console.log('Inspecting Segments 52 to 67 in detail:');
for (let s = 52; s <= 67; s++) {
  const pts = getSeg(s);
  console.log(`Seg ${s}: ${pts.length} pts, start=(${pts[0].lat.toFixed(6)}, ${pts[0].lng.toFixed(6)}) -> end=(${pts[pts.length - 1].lat.toFixed(6)}, ${pts[pts.length - 1].lng.toFixed(6)})`);
}
