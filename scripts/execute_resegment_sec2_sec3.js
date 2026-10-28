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
  // Nearest search in small radius
  for (let dLat = -2; dLat <= 2; dLat++) {
    for (let dLng = -2; dLng <= 2; dLng++) {
      const nearKey = `${(lat + dLat * 0.0001).toFixed(5)},${(lng + dLng * 0.0001).toFixed(5)}`;
      if (cache[nearKey] !== undefined) return cache[nearKey];
    }
  }
  return 10.0;
}

// 3. Parse Raw GPX
const gpxRaw = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');
const segMatches = [...gpxRaw.matchAll(/<trkseg>([\s\S]*?)<\/trkseg>/g)];

const seg0 = [...segMatches[0][1].matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g)].map(m => ({
  lat: parseFloat(m[1]),
  lng: parseFloat(m[2]),
  ele: parseFloat(m[3])
}));
const seg1 = [...segMatches[1][1].matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g)].map(m => ({
  lat: parseFloat(m[1]),
  lng: parseFloat(m[2]),
  ele: parseFloat(m[3])
}));

// Section 2: Seg 0 (0..248) + Seg 1 (1..58)
const rawSec2 = [...seg0, ...seg1.slice(1, 59)];
// Section 3: Seg 1 (58..418)
const rawSec3 = seg1.slice(58, 419);

// 4. Simplify with epsilon = 2.0 meters
const simpSec2 = rdp(rawSec2, 2.0);
const simpSec3 = rdp(rawSec3, 2.0);

function processSection(simplifiedPoints) {
  let cumDist = 0;
  let gain = 0;
  let loss = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;

  // Assign elevations
  const rawElevations = simplifiedPoints.map(p => getElevation(p.lat, p.lng));

  // Smooth elevations slightly
  const smoothedEle = rawElevations.map((ele, idx, arr) => {
    const prev = arr[Math.max(0, idx - 1)];
    const next = arr[Math.min(arr.length - 1, idx + 1)];
    return Math.round((prev + ele * 2 + next) / 4);
  });

  const points = simplifiedPoints.map((p, idx) => {
    if (idx > 0) {
      cumDist += getDistance(simplifiedPoints[idx - 1], p);
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

const resSec2 = processSection(simpSec2);
const resSec3 = processSection(simpSec3);

console.log('--- Section 2 Processed ---');
console.log('Points count:', resSec2.points.length);
console.log('Start:', resSec2.points[0]);
console.log('End:  ', resSec2.points[resSec2.points.length - 1]);
console.log(`Distance: ${resSec2.totalDistKm} km | Gain: +${resSec2.gain}m | Loss: -${resSec2.loss}m | Time: ${resSec2.timeText}`);

console.log('\n--- Section 3 Processed ---');
console.log('Points count:', resSec3.points.length);
console.log('Start:', resSec3.points[0]);
console.log('End:  ', resSec3.points[resSec3.points.length - 1]);
console.log(`Distance: ${resSec3.totalDistKm} km | Gain: +${resSec3.gain}m | Loss: -${resSec3.loss}m | Time: ${resSec3.timeText}`);

const boundaryGap = getDistance(resSec2.points[resSec2.points.length - 1], resSec3.points[0]);
console.log(`\nExact boundary gap: ${boundaryGap.toFixed(2)} meters`);

// 5. Update public/data/sections/section_2.json
const sec2File = JSON.parse(fs.readFileSync('public/data/sections/section_2.json', 'utf8'));
sec2File.start_point = { lat: resSec2.points[0].lat, lng: resSec2.points[0].lng };
sec2File.end_point = { lat: resSec2.points[resSec2.points.length - 1].lat, lng: resSec2.points[resSec2.points.length - 1].lng };
sec2File.calculated_distance_km = resSec2.totalDistKm;
sec2File.elevation_gain_m = resSec2.gain;
sec2File.elevation_loss_m = resSec2.loss;
sec2File.min_elevation_m = resSec2.minEle;
sec2File.max_elevation_m = resSec2.maxEle;
sec2File.hiking_time_hours = Math.round(resSec2.hoursFloat);
sec2File.points = resSec2.points;
fs.writeFileSync('public/data/sections/section_2.json', JSON.stringify(sec2File, null, 2), 'utf8');
console.log('\nSaved section_2.json');

// 6. Update public/data/sections/section_3.json
const sec3File = JSON.parse(fs.readFileSync('public/data/sections/section_3.json', 'utf8'));
sec3File.start_point = { lat: resSec3.points[0].lat, lng: resSec3.points[0].lng };
sec3File.end_point = { lat: resSec3.points[resSec3.points.length - 1].lat, lng: resSec3.points[resSec3.points.length - 1].lng };
sec3File.calculated_distance_km = resSec3.totalDistKm;
sec3File.elevation_gain_m = resSec3.gain;
sec3File.elevation_loss_m = resSec3.loss;
sec3File.min_elevation_m = resSec3.minEle;
sec3File.max_elevation_m = resSec3.maxEle;
sec3File.hiking_time_hours = Math.round(resSec3.hoursFloat);
sec3File.points = resSec3.points;
fs.writeFileSync('public/data/sections/section_3.json', JSON.stringify(sec3File, null, 2), 'utf8');
console.log('Saved section_3.json');

// 7. Update public/data/sections_summary.json
const summary = JSON.parse(fs.readFileSync('public/data/sections_summary.json', 'utf8'));
const s2Sum = summary.find(s => s.section_id === 2);
if (s2Sum) {
  s2Sum.start_point = sec2File.start_point;
  s2Sum.end_point = sec2File.end_point;
  s2Sum.calculated_distance_km = resSec2.totalDistKm;
  s2Sum.elevation_gain_m = resSec2.gain;
  s2Sum.elevation_loss_m = resSec2.loss;
  s2Sum.hiking_time_hours = Math.round(resSec2.hoursFloat);
  s2Sum.hiking_time_text = resSec2.timeText;
}
const s3Sum = summary.find(s => s.section_id === 3);
if (s3Sum) {
  s3Sum.start_point = sec3File.start_point;
  s3Sum.end_point = sec3File.end_point;
  s3Sum.calculated_distance_km = resSec3.totalDistKm;
  s3Sum.elevation_gain_m = resSec3.gain;
  s3Sum.elevation_loss_m = resSec3.loss;
  s3Sum.hiking_time_hours = Math.round(resSec3.hoursFloat);
  s3Sum.hiking_time_text = resSec3.timeText;
}
fs.writeFileSync('public/data/sections_summary.json', JSON.stringify(summary, null, 2), 'utf8');
console.log('Saved sections_summary.json');

// 8. Update public/data/all_sections_overview.json
const overview = JSON.parse(fs.readFileSync('public/data/all_sections_overview.json', 'utf8'));
const s2Over = overview.find(s => s.section_id === 2);
if (s2Over) {
  s2Over.start_point = sec2File.start_point;
  s2Over.end_point = sec2File.end_point;
  s2Over.distance_km = resSec2.totalDistKm;
  s2Over.elevation_gain_m = resSec2.gain;
  s2Over.elevation_loss_m = resSec2.loss;
  s2Over.path = resSec2.points.map(p => ({ lat: p.lat, lng: p.lng, ele: p.ele }));
}
const s3Over = overview.find(s => s.section_id === 3);
if (s3Over) {
  s3Over.start_point = sec3File.start_point;
  s3Over.end_point = sec3File.end_point;
  s3Over.distance_km = resSec3.totalDistKm;
  s3Over.elevation_gain_m = resSec3.gain;
  s3Over.elevation_loss_m = resSec3.loss;
  s3Over.path = resSec3.points.map(p => ({ lat: p.lat, lng: p.lng, ele: p.ele }));
}
fs.writeFileSync('public/data/all_sections_overview.json', JSON.stringify(overview, null, 2), 'utf8');
console.log('Saved all_sections_overview.json');
console.log('\nAll files successfully updated with zero-gap 2구간/3구간 data!');
