import fs from 'fs';

// RDP & Geometric Helpers
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

// Load Elevation Cache
const cache = JSON.parse(fs.readFileSync('scripts/elevation_cache.json', 'utf8'));

function getElevation(lat, lng) {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache[key] !== undefined) return cache[key];
  for (let dLat = -3; dLat <= 3; dLat++) {
    for (let dLng = -3; dLng <= 3; dLng++) {
      const nearKey = `${(lat + dLat * 0.0001).toFixed(5)},${(lng + dLng * 0.0001).toFixed(5)}`;
      if (cache[nearKey] !== undefined) return cache[nearKey];
    }
  }
  return 20.0;
}

function processSectionPoints(rawPts) {
  const simp = rdp(rawPts, 2.0);

  const rawElevations = simp.map(p => getElevation(p.lat, p.lng));
  const smoothedEle = rawElevations.map((ele, idx, arr) => {
    const prev = arr[Math.max(0, idx - 1)];
    const next = arr[Math.min(arr.length - 1, idx + 1)];
    return Math.round((prev + ele * 2 + next) / 4);
  });

  let cumDist = 0;
  let gain = 0;
  let loss = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;

  const points = simp.map((p, idx) => {
    if (idx > 0) {
      cumDist += getDistance(simp[idx - 1], p);
      const diff = smoothedEle[idx] - smoothedEle[idx - 1];
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }
    const ele = smoothedEle[idx];
    if (ele < minEle) minEle = ele;
    if (ele > maxEle) maxEle = ele;

    return {
      lat: Math.round(p.lat * 1e6) / 1e6,
      lng: Math.round(p.lng * 1e6) / 1e6,
      ele: ele,
      dist: Math.round((cumDist / 1000) * 100) / 100
    };
  });

  const totalDistKm = Math.round((cumDist / 1000) * 10) / 10;
  const hoursFloat = (totalDistKm / 3.5) + (gain / 400.0) + (loss / 800.0);
  const totalMinutes = Math.round(hoursFloat * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const timeText = `${h}시간 ${m}분`;

  return {
    points,
    totalDistKm,
    gain: Math.round(gain),
    loss: Math.round(loss),
    minEle: Math.round(minEle),
    maxEle: Math.round(maxEle),
    hoursFloat: Math.round(hoursFloat * 10) / 10,
    timeText
  };
}

// Parse Raw GPX
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

// 1. Section 1: full Segment 2 (584 pts)
const rawSec1 = allSegs[2].pts;
console.log('Raw Sec 1 count:', rawSec1.length);
const res1 = processSectionPoints(rawSec1);
console.log('Sec 1 processed: dist =', res1.totalDistKm, 'km, end =', res1.points[res1.points.length - 1]);

// 2. Section 5: Segment 1 (1493..2366)
// Let's find index where Section 4 ends / Section 5 begins in Segment 1:
const s4 = JSON.parse(fs.readFileSync('public/data/sections/section_4.json', 'utf8'));
const s4End = s4.points[s4.points.length - 1];
let s5StartIdx = -1, minDs5 = Infinity;
allSegs[1].pts.forEach((p, idx) => {
  const d = getDistance(p, s4End);
  if (d < minDs5) {
    minDs5 = d;
    s5StartIdx = idx;
  }
});
console.log(`Sec 5 starts in Seg 1 at idx ${s5StartIdx} (dist: ${minDs5.toFixed(2)}m), ends at ${allSegs[1].pts.length - 1}`);
const rawSec5 = allSegs[1].pts.slice(s5StartIdx);
const res5 = processSectionPoints(rawSec5);
console.log('Sec 5 processed: dist =', res5.totalDistKm, 'km, end =', res5.points[res5.points.length - 1]);

// 3. Section 7: Starts at point 0 of Segment 22
const s7Existing = JSON.parse(fs.readFileSync('public/data/sections/section_7.json', 'utf8'));
const s7Last = s7Existing.points[s7Existing.points.length - 1];
let s7EndIdx = -1, minDs7 = Infinity;
allSegs[22].pts.forEach((p, idx) => {
  const d = getDistance(p, s7Last);
  if (d < minDs7) {
    minDs7 = d;
    s7EndIdx = idx;
  }
});
console.log(`Sec 7 starts at Seg 22[0], ends at ${s7EndIdx} (dist: ${minDs7.toFixed(2)}m)`);
const rawSec7 = allSegs[22].pts.slice(0, s7EndIdx + 1);
const res7 = processSectionPoints(rawSec7);
console.log('Sec 7 processed: dist =', res7.totalDistKm, 'km, start =', res7.points[0]);

// 4. Section 47: Starts at point 0 of Segment 76
const s47Existing = JSON.parse(fs.readFileSync('public/data/sections/section_47.json', 'utf8'));
const s47Last = s47Existing.points[s47Existing.points.length - 1];
let s47EndIdx = -1, minDs47 = Infinity;
allSegs[76].pts.forEach((p, idx) => {
  const d = getDistance(p, s47Last);
  if (d < minDs47) {
    minDs47 = d;
    s47EndIdx = idx;
  }
});
console.log(`Sec 47 starts at Seg 76[0], ends at ${s47EndIdx} (dist: ${minDs47.toFixed(2)}m)`);
const rawSec47 = allSegs[76].pts.slice(0, s47EndIdx + 1);
const res47 = processSectionPoints(rawSec47);
console.log('Sec 47 processed: dist =', res47.totalDistKm, 'km, start =', res47.points[0]);

// 5. Section 50: Starts at point 0 of Segment 77
const s50Existing = JSON.parse(fs.readFileSync('public/data/sections/section_50.json', 'utf8'));
const s50Last = s50Existing.points[s50Existing.points.length - 1];
let s50EndIdx = -1, minDs50 = Infinity;
allSegs[77].pts.forEach((p, idx) => {
  const d = getDistance(p, s50Last);
  if (d < minDs50) {
    minDs50 = d;
    s50EndIdx = idx;
  }
});
console.log(`Sec 50 starts at Seg 77[0], ends at ${s50EndIdx} (dist: ${minDs50.toFixed(2)}m)`);
const rawSec50 = allSegs[77].pts.slice(0, s50EndIdx + 1);
const res50 = processSectionPoints(rawSec50);
console.log('Sec 50 processed: dist =', res50.totalDistKm, 'km, start =', res50.points[0]);
