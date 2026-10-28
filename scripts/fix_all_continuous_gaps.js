import fs from 'fs';

// 1. RDP and Geometric Helpers
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

// 2. Load Elevation Cache
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

// 3. Parse Raw GPX
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

// Helper to find index in segment closest to a coordinate
function findIdxInSeg(seg, target) {
  let minD = Infinity, best = -1;
  seg.forEach((p, idx) => {
    const d = getDistance(p, target);
    if (d < minD) {
      minD = d;
      best = idx;
    }
  });
  return best;
}

const updates = [];

// ==========================================
// [FIX 1] Section 1: Full Segment 2 (to 백사장항: 36.586376, 126.315198)
// ==========================================
console.log('Processing Section 1...');
const s2Start = { lat: 36.586376, lng: 126.315198 };
const rawSec1 = allSegs[2].pts;
// Snap exact last point to s2Start
rawSec1[rawSec1.length - 1] = { lat: s2Start.lat, lng: s2Start.lng, ele: rawSec1[rawSec1.length - 1].ele };
const res1 = processSectionPoints(rawSec1);
// Ensure end point is exactly s2Start
res1.points[res1.points.length - 1].lat = s2Start.lat;
res1.points[res1.points.length - 1].lng = s2Start.lng;
updates.push({ id: 1, res: res1, endName: '백사장항' });

// ==========================================
// [FIX 2] Section 5: From 상담교 to end of Segment 1 (율목리마을: 36.819361, 126.501729)
// ==========================================
console.log('Processing Section 5...');
const s4 = JSON.parse(fs.readFileSync('public/data/sections/section_4.json', 'utf8'));
const s4End = s4.points[s4.points.length - 1];
const s5StartIdx = findIdxInSeg(allSegs[1].pts, s4End);
const s6Start = { lat: 36.819361, lng: 126.501729 };
const rawSec5 = allSegs[1].pts.slice(s5StartIdx);
// Snap last point to s6Start
rawSec5[rawSec5.length - 1] = { lat: s6Start.lat, lng: s6Start.lng, ele: rawSec5[rawSec5.length - 1].ele };
const res5 = processSectionPoints(rawSec5);
res5.points[res5.points.length - 1].lat = s6Start.lat;
res5.points[res5.points.length - 1].lng = s6Start.lng;
updates.push({ id: 5, res: res5, endName: '율목리마을' });

// ==========================================
// [FIX 3] Section 7: Starts at Segment 22[0] (삼웅2리마을회관: 36.822117, 126.637968)
// ==========================================
console.log('Processing Section 7...');
const s6End = { lat: 36.822117, lng: 126.637968 };
const s7Existing = JSON.parse(fs.readFileSync('public/data/sections/section_7.json', 'utf8'));
const s7Last = s7Existing.points[s7Existing.points.length - 1];
const s7EndIdx = findIdxInSeg(allSegs[22].pts, s7Last);
const rawSec7 = allSegs[22].pts.slice(0, s7EndIdx + 1);
// Snap first point to s6End
rawSec7[0] = { lat: s6End.lat, lng: s6End.lng, ele: rawSec7[0].ele };
const res7 = processSectionPoints(rawSec7);
res7.points[0].lat = s6End.lat;
res7.points[0].lng = s6End.lng;
updates.push({ id: 7, res: res7, startName: '삼웅2리마을회관' });

// ==========================================
// [FIX 4] Section 34: Snap start to Section 33 end (하내리: 36.664048, 128.080933)
// ==========================================
console.log('Processing Section 34...');
const s33 = JSON.parse(fs.readFileSync('public/data/sections/section_33.json', 'utf8'));
const s33End = s33.points[s33.points.length - 1];
const s34Existing = JSON.parse(fs.readFileSync('public/data/sections/section_34.json', 'utf8'));
s34Existing.points[0].lat = s33End.lat;
s34Existing.points[0].lng = s33End.lng;
s34Existing.start_point = { lat: s33End.lat, lng: s33End.lng };
fs.writeFileSync('public/data/sections/section_34.json', JSON.stringify(s34Existing, null, 2), 'utf8');

// ==========================================
// [FIX 5] Section 47: Starts at point 0 of Segment 76 (오전약수관광지주차장: 37.026467, 128.700359)
// ==========================================
console.log('Processing Section 47...');
const s46End = { lat: 37.026467, lng: 128.700359 };
const s47Existing = JSON.parse(fs.readFileSync('public/data/sections/section_47.json', 'utf8'));
const s47Last = s47Existing.points[s47Existing.points.length - 1];
const s47EndIdx = findIdxInSeg(allSegs[76].pts, s47Last);
const rawSec47 = allSegs[76].pts.slice(0, s47EndIdx + 1);
// Snap first point to s46End
rawSec47[0] = { lat: s46End.lat, lng: s46End.lng, ele: rawSec47[0].ele };
const res47 = processSectionPoints(rawSec47);
res47.points[0].lat = s46End.lat;
res47.points[0].lng = s46End.lng;
updates.push({ id: 47, res: res47, startName: '오전약수관광지주차장' });

// ==========================================
// [FIX 6] Section 50: Starts at point 0 of Segment 77 (현동삼거리: 36.944103, 128.963539)
// ==========================================
console.log('Processing Section 50...');
const s49End = { lat: 36.944103, lng: 128.963539 };
const s50Existing = JSON.parse(fs.readFileSync('public/data/sections/section_50.json', 'utf8'));
const s50Last = s50Existing.points[s50Existing.points.length - 1];
const s50EndIdx = findIdxInSeg(allSegs[77].pts, s50Last);
const rawSec50 = allSegs[77].pts.slice(0, s50EndIdx + 1);
// Snap first point to s49End
rawSec50[0] = { lat: s49End.lat, lng: s49End.lng, ele: rawSec50[0].ele };
const res50 = processSectionPoints(rawSec50);
res50.points[0].lat = s49End.lat;
res50.points[0].lng = s49End.lng;
updates.push({ id: 50, res: res50, startName: '현동삼거리' });

// ==========================================
// Apply Updates to Section JSONs, Summary, and Overview
// ==========================================
const summary = JSON.parse(fs.readFileSync('public/data/sections_summary.json', 'utf8'));
const overview = JSON.parse(fs.readFileSync('public/data/all_sections_overview.json', 'utf8'));

updates.forEach(u => {
  const filePath = `public/data/sections/section_${u.id}.json`;
  const secJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  secJson.points = u.res.points;
  secJson.calculated_distance_km = u.res.totalDistKm;
  secJson.elevation_gain_m = u.res.gain;
  secJson.elevation_loss_m = u.res.loss;
  secJson.min_elevation_m = u.res.minEle;
  secJson.max_elevation_m = u.res.maxEle;
  secJson.hiking_time_hours = Math.round(u.res.hoursFloat);
  secJson.start_point = { lat: u.res.points[0].lat, lng: u.res.points[0].lng };
  secJson.end_point = { lat: u.res.points[u.res.points.length - 1].lat, lng: u.res.points[u.res.points.length - 1].lng };

  fs.writeFileSync(filePath, JSON.stringify(secJson, null, 2), 'utf8');
  console.log(`Updated section_${u.id}.json`);

  // Update summary
  const sumItem = summary.find(s => s.section_id === u.id);
  if (sumItem) {
    sumItem.start_point = secJson.start_point;
    sumItem.end_point = secJson.end_point;
    sumItem.calculated_distance_km = u.res.totalDistKm;
    sumItem.elevation_gain_m = u.res.gain;
    sumItem.elevation_loss_m = u.res.loss;
    sumItem.hiking_time_hours = Math.round(u.res.hoursFloat);
    sumItem.hiking_time_text = u.res.timeText;
  }

  // Update overview
  const overItem = overview.find(s => s.section_id === u.id);
  if (overItem) {
    overItem.start_point = secJson.start_point;
    overItem.end_point = secJson.end_point;
    overItem.distance_km = u.res.totalDistKm;
    overItem.elevation_gain_m = u.res.gain;
    overItem.elevation_loss_m = u.res.loss;
    overItem.path = u.res.points.map(p => ({ lat: p.lat, lng: p.lng, ele: p.ele }));
  }
});

// Update 34 in summary and overview as well
const sum34 = summary.find(s => s.section_id === 34);
if (sum34) sum34.start_point = s34Existing.start_point;
const over34 = overview.find(s => s.section_id === 34);
if (over34) {
  over34.start_point = s34Existing.start_point;
  over34.path[0].lat = s34Existing.start_point.lat;
  over34.path[0].lng = s34Existing.start_point.lng;
}

fs.writeFileSync('public/data/sections_summary.json', JSON.stringify(summary, null, 2), 'utf8');
fs.writeFileSync('public/data/all_sections_overview.json', JSON.stringify(overview, null, 2), 'utf8');
console.log('Successfully updated all data files!');
