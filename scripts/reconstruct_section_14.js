import fs from 'fs';
import path from 'path';

function haversine(p1, p2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (p2.lat - p1.lat) * rad;
  const dLng = (p2.lng - p1.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * rad) * Math.cos(p2.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Perpendicular distance for RDP
function perpendicularDistance(p, lineStart, lineEnd) {
  const x0 = p.lng, y0 = p.lat;
  const x1 = lineStart.lng, y1 = lineStart.lat;
  const x2 = lineEnd.lng, y2 = lineEnd.lat;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return haversine(p, lineStart);
  }

  const t = Math.max(0, Math.min(1, ((x0 - x1) * dx + (y0 - y1) * dy) / lenSq));
  const proj = { lat: y1 + t * dy, lng: x1 + t * dx };
  return haversine(p, proj);
}

// Ramer-Douglas-Peucker
function rdp(points, epsilon) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [start, end];
  }
}

// Load GPX
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

let rawPoints = [];
for (let c of chain) {
  const segPts = getSeg(c.s, c.rev);
  if (rawPoints.length > 0) {
    // Snap boundary point to avoid gap
    segPts[0].lat = rawPoints[rawPoints.length - 1].lat;
    segPts[0].lng = rawPoints[rawPoints.length - 1].lng;
  }
  rawPoints.push(...segPts);
}

// Add the exact Daeryong1-ri anchor as the final point
const daeryongAnchor = { lat: 36.492545, lng: 126.940395, ele: 115 };
rawPoints.push(daeryongAnchor);

// Elevation correction for invalid / negative elevations (specifically in Seg 63)
let lastValidEle = 150;
for (let i = 0; i < rawPoints.length; i++) {
  if (rawPoints[i].ele < 0 || rawPoints[i].ele === 0) {
    // Find next valid elevation to interpolate
    let nextValidEle = daeryongAnchor.ele;
    let nextValidIdx = rawPoints.length - 1;
    for (let j = i + 1; j < rawPoints.length; j++) {
      if (rawPoints[j].ele > 0) {
        nextValidEle = rawPoints[j].ele;
        nextValidIdx = j;
        break;
      }
    }
    const t = (i - (i - 1)) / (nextValidIdx - (i - 1));
    rawPoints[i].ele = Math.round(lastValidEle + (nextValidEle - lastValidEle) * t);
  } else {
    lastValidEle = rawPoints[i].ele;
  }
}

console.log(`Raw continuous points: ${rawPoints.length}`);

// Apply RDP with epsilon = 2.0 meters (high fidelity, lightweight)
const compressedPoints = rdp(rawPoints, 2.0);
console.log(`Compressed points (RDP 2.0m): ${compressedPoints.length}`);

// Calculate cumulative distances and elevation gain/loss
let totalDist = 0;
let gain = 0;
let loss = 0;
let minEle = 9999;
let maxEle = -9999;

const finalPoints = compressedPoints.map((p, idx) => {
  if (idx > 0) {
    const d = haversine(compressedPoints[idx - 1], p);
    totalDist += d;
    const eleDiff = p.ele - compressedPoints[idx - 1].ele;
    if (eleDiff > 0) gain += eleDiff;
    else loss += Math.abs(eleDiff);
  }
  if (p.ele < minEle) minEle = p.ele;
  if (p.ele > maxEle) maxEle = p.ele;

  return {
    lat: Number(p.lat.toFixed(6)),
    lng: Number(p.lng.toFixed(6)),
    ele: Math.round(p.ele),
    dist: Number((totalDist / 1000).toFixed(2))
  };
});

const totalDistKm = Number((totalDist / 1000).toFixed(2));
console.log(`Total Distance: ${totalDistKm} km`);
console.log(`Gain: ${Math.round(gain)}m, Loss: ${Math.round(loss)}m, Min: ${minEle}m, Max: ${maxEle}m`);
console.log(`Start:`, finalPoints[0]);
console.log(`End:  `, finalPoints[finalPoints.length - 1]);

// 1. Update public/data/sections/section_14.json
const sec14Path = path.resolve('public/data/sections/section_14.json');
const sec14 = JSON.parse(fs.readFileSync(sec14Path, 'utf8'));

sec14.start_point = { lat: finalPoints[0].lat, lng: finalPoints[0].lng };
sec14.end_point = { lat: finalPoints[finalPoints.length - 1].lat, lng: finalPoints[finalPoints.length - 1].lng };
sec14.start_name = '위라1리마을회관';
sec14.end_name = '대룡1리';
sec14.calculated_distance_km = totalDistKm;
sec14.elevation_gain_m = Math.round(gain);
sec14.elevation_loss_m = Math.round(loss);
sec14.min_elevation_m = minEle;
sec14.max_elevation_m = maxEle;
sec14.points = finalPoints;

fs.writeFileSync(sec14Path, JSON.stringify(sec14, null, 2), 'utf8');
console.log(`Updated section_14.json successfully.`);

// 2. Update public/data/sections_summary.json
const sumPath = path.resolve('public/data/sections_summary.json');
const summary = JSON.parse(fs.readFileSync(sumPath, 'utf8'));
const sumIdx = summary.findIndex(s => s.section_id === 14);
if (sumIdx !== -1) {
  summary[sumIdx].start_point = sec14.start_point;
  summary[sumIdx].end_point = sec14.end_point;
  summary[sumIdx].start_name = sec14.start_name;
  summary[sumIdx].end_name = sec14.end_name;
  summary[sumIdx].calculated_distance_km = totalDistKm;
  summary[sumIdx].elevation_gain_m = Math.round(gain);
  summary[sumIdx].elevation_loss_m = Math.round(loss);
  summary[sumIdx].hiking_time_hours = Number((totalDistKm / 4.0 + gain / 400.0).toFixed(1));
  fs.writeFileSync(sumPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Updated sections_summary.json successfully.`);
}

// 3. Update public/data/all_sections_overview.json
const allPath = path.resolve('public/data/all_sections_overview.json');
const allOverview = JSON.parse(fs.readFileSync(allPath, 'utf8'));
const allIdx = allOverview.findIndex(s => s.section_id === 14);
if (allIdx !== -1) {
  allOverview[allIdx].start_point = sec14.start_point;
  allOverview[allIdx].end_point = sec14.end_point;
  allOverview[allIdx].start_name = sec14.start_name;
  allOverview[allIdx].end_name = sec14.end_name;
  allOverview[allIdx].distance_km = totalDistKm;
  allOverview[allIdx].elevation_gain_m = Math.round(gain);
  allOverview[allIdx].elevation_loss_m = Math.round(loss);
  allOverview[allIdx].path = finalPoints.map(p => ({ lat: p.lat, lng: p.lng }));
  fs.writeFileSync(allPath, JSON.stringify(allOverview, null, 2), 'utf8');
  console.log(`Updated all_sections_overview.json successfully.`);
}
