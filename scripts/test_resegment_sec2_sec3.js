import fs from 'fs';

// Ramer-Douglas-Peucker algorithm
function perpendicularDistance(point, lineStart, lineEnd) {
  const R = 6371e3;
  const x = (lineEnd.lng - lineStart.lng) * Math.cos(0.5 * (lineStart.lat + lineEnd.lat) * Math.PI / 180);
  const y = lineEnd.lat - lineStart.lat;
  const lineLen = Math.hypot(x, y);
  if (lineLen === 0) {
    const px = (point.lng - lineStart.lng) * Math.cos(0.5 * (lineStart.lat + point.lat) * Math.PI / 180);
    const py = point.lat - lineStart.lat;
    return Math.hypot(px, py) * (Math.PI / 180) * R;
  }
  const u = ((point.lng - lineStart.lng) * Math.cos(0.5 * (lineStart.lat + lineEnd.lat) * Math.PI / 180) * x +
             (point.lat - lineStart.lat) * y) / (lineLen * lineLen);
  const clampedU = Math.max(0, Math.min(1, u));
  const projLng = lineStart.lng + (clampedU * x) / Math.cos(0.5 * (lineStart.lat + lineEnd.lat) * Math.PI / 180);
  const projLat = lineStart.lat + clampedU * y;
  const dx = (point.lng - projLng) * Math.cos(0.5 * (projLat + point.lat) * Math.PI / 180);
  const dy = point.lat - projLat;
  return Math.hypot(dx, dy) * (Math.PI / 180) * R;
}

function rdp(points, epsilon) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [start, end];
  }
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

const gpxRaw = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');
const segMatches = [...gpxRaw.matchAll(/<trkseg>([\s\S]*?)<\/trkseg>/g)];

// Seg 0: 249 pts
const seg0 = [...segMatches[0][1].matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g)].map(m => ({
  lat: parseFloat(m[1]),
  lng: parseFloat(m[2]),
  ele: parseFloat(m[3])
}));

// Seg 1: 2367 pts
const seg1 = [...segMatches[1][1].matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g)].map(m => ({
  lat: parseFloat(m[1]),
  lng: parseFloat(m[2]),
  ele: parseFloat(m[3])
}));

// Section 2 raw points: seg0 (0..248) + seg1 (1..58)
const rawSec2 = [...seg0, ...seg1.slice(1, 59)];
// Section 3 raw points: seg1 (58..418)
const rawSec3 = seg1.slice(58, 419);

console.log('Raw Sec 2 count:', rawSec2.length);
console.log('Raw Sec 2 start:', rawSec2[0]);
console.log('Raw Sec 2 end:  ', rawSec2[rawSec2.length - 1]);

console.log('Raw Sec 3 count:', rawSec3.length);
console.log('Raw Sec 3 start:', rawSec3[0]);
console.log('Raw Sec 3 end:  ', rawSec3[rawSec3.length - 1]);

// Simplify with epsilon = 2.0 meters
const simpSec2 = rdp(rawSec2, 2.0);
const simpSec3 = rdp(rawSec3, 2.0);

console.log(`Simplified Sec 2 (eps=2.0m): ${rawSec2.length} -> ${simpSec2.length} pts`);
console.log(`Simplified Sec 3 (eps=2.0m): ${rawSec3.length} -> ${simpSec3.length} pts`);

// Calculate cumulative distances
function buildPointsWithDist(pts) {
  let cumDist = 0;
  return pts.map((p, idx) => {
    if (idx > 0) {
      cumDist += getDistance(pts[idx - 1], p);
    }
    return {
      lat: Math.round(p.lat * 1e6) / 1e6,
      lng: Math.round(p.lng * 1e6) / 1e6,
      ele: Math.round(p.ele),
      dist: Math.round((cumDist / 1000) * 100) / 100
    };
  });
}

const pointsSec2 = buildPointsWithDist(simpSec2);
const pointsSec3 = buildPointsWithDist(simpSec3);

console.log('Sec 2 total distance:', pointsSec2[pointsSec2.length - 1].dist, 'km');
console.log('Sec 3 total distance:', pointsSec3[pointsSec3.length - 1].dist, 'km');
console.log('Sec 2 end coords:', pointsSec2[pointsSec2.length - 1]);
console.log('Sec 3 start coords:', pointsSec3[0]);
console.log('Gap between Sec 2 end and Sec 3 start:', getDistance(pointsSec2[pointsSec2.length - 1], pointsSec3[0]), 'meters');
