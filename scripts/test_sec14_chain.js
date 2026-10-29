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

function getSeg(idx, reversed = false) {
  const segXml = segMatches[idx - 1];
  const ptMatches = [...segXml.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)">([\s\S]*?)<\/trkpt>/g)];
  const pts = ptMatches.map(m => {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    const eleM = m[3].match(/<ele>([^<]+)<\/ele>/);
    const ele = eleM ? parseFloat(eleM[1]) : 0;
    return { lat, lng, ele };
  });
  return reversed ? pts.reverse() : pts;
}

const chain = [
  { s: 24, rev: false },
  { s: 26, rev: false },
  { s: 29, rev: true },
  { s: 30, rev: true },
  { s: 33, rev: true },
  { s: 35, rev: true },
  { s: 37, rev: true },
  { s: 39, rev: true },
  { s: 41, rev: true },
  { s: 44, rev: true },
  { s: 46, rev: true },
  { s: 50, rev: true },
  { s: 52, rev: true },
  { s: 66, rev: true },
  { s: 64, rev: true },
  { s: 57, rev: true },
  { s: 55, rev: true },
  { s: 58, rev: true },
  { s: 60, rev: true },
  { s: 63, rev: true }
];

let allPts = [];
for (let c of chain) {
  const segPts = getSeg(c.s, c.rev);
  if (allPts.length > 0) {
    const gap = haversine(allPts[allPts.length - 1], segPts[0]);
    console.log(`Connection to Seg ${c.s} (${c.rev ? 'REV' : 'FWD'}): Gap = ${gap.toFixed(2)}m`);
  }
  allPts.push(...segPts);
}

// Add the exact Daeryong1-ri anchor as the final point to make it 0m to the anchor
const daeryongAnchor = { lat: 36.4925449351764, lng: 126.940394550238, ele: 115 };
const finalGap = haversine(allPts[allPts.length - 1], daeryongAnchor);
console.log(`Connection from last GPX pt to Daeryong1-ri Anchor: Gap = ${finalGap.toFixed(2)}m`);
allPts.push(daeryongAnchor);

let totalDist = 0;
let maxStep = 0;
let maxStepIdx = 0;

for (let i = 1; i < allPts.length; i++) {
  const d = haversine(allPts[i - 1], allPts[i]);
  totalDist += d;
  if (d > maxStep) {
    maxStep = d;
    maxStepIdx = i;
  }
}

console.log('\n--- Summary of Continuous Chain for Section 14 ---');
console.log(`Total Points: ${allPts.length}`);
console.log(`Total Distance: ${(totalDist / 1000).toFixed(2)} km`);
console.log(`Start Point: (${allPts[0].lat.toFixed(6)}, ${allPts[0].lng.toFixed(6)}) - 위라1리마을회관`);
console.log(`End Point:   (${allPts[allPts.length - 1].lat.toFixed(6)}, ${allPts[allPts.length - 1].lng.toFixed(6)}) - 대룡1리`);
console.log(`Max Step in whole polyline: ${maxStep.toFixed(2)}m at index ${maxStepIdx}`);
