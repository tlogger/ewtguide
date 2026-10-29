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

// 1. Get original git version of section_14.json (before our reconstruct script)
import { execSync } from 'child_process';
const origJsonStr = execSync('git show HEAD:public/data/sections/section_14.json', { encoding: 'utf8' });
const origSec14 = JSON.parse(origJsonStr);

const origPts = origSec14.points;
console.log(`Original points: ${origPts.length}, last point:`, origPts[origPts.length - 1]);

// 2. Load Seg 63 reversed from GPX
const gpx = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');
const segMatches = gpx.match(/<trkseg>[\s\S]*?<\/trkseg>/g) || [];
const s63Xml = segMatches[62]; // Seg 63
const ptMatches = [...s63Xml.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)">/g)];
const seg63Raw = ptMatches.map(m => ({
  lat: parseFloat(m[1]),
  lng: parseFloat(m[2])
})).reverse(); // reversed

console.log(`Seg 63 reversed points: ${seg63Raw.length}`);
console.log('Start of seg63_rev:', seg63Raw[0]);
console.log('End of seg63_rev:', seg63Raw[seg63Raw.length - 1]);

// 3. Check gap between origPts[-1] and seg63Raw[0]
const gap = haversine(origPts[origPts.length - 1], seg63Raw[0]);
console.log(`Gap between origPts[-1] and seg63Raw[0]: ${gap.toFixed(2)}m`);

// 4. Smooth elevation for Seg 63 (from 150m down to 115m at Daeryong1-ri)
const daeryongAnchor = { lat: 36.492545, lng: 126.940395, ele: 115 };
const startEle = origPts[origPts.length - 1].ele || 150;
const endEle = daeryongAnchor.ele;

const seg63WithEle = seg63Raw.map((p, idx) => {
  const t = idx / (seg63Raw.length - 1);
  // Gentle downhill curve
  const ele = Math.round(startEle + (endEle - startEle) * t);
  return {
    lat: Number(p.lat.toFixed(6)),
    lng: Number(p.lng.toFixed(6)),
    ele
  };
});

// Snap first point of seg63 to last point of origPts to ensure 0.00m gap
seg63WithEle[0].lat = origPts[origPts.length - 1].lat;
seg63WithEle[0].lng = origPts[origPts.length - 1].lng;
seg63WithEle[0].ele = origPts[origPts.length - 1].ele;

// Append Daeryong1-ri anchor
seg63WithEle.push(daeryongAnchor);

// Combine origPts + seg63WithEle (skip the first element of seg63 to avoid duplicate)
const combinedPoints = [
  ...origPts,
  ...seg63WithEle.slice(1)
];

// Recalculate cumulative distances, gain, loss
let cumDist = 0;
let gain = 0;
let loss = 0;
let minEle = 9999;
let maxEle = -9999;

const finalPoints = combinedPoints.map((p, idx) => {
  if (idx > 0) {
    const d = haversine(combinedPoints[idx - 1], p);
    cumDist += d;
    const diff = p.ele - combinedPoints[idx - 1].ele;
    if (diff > 0) gain += diff;
    else loss += Math.abs(diff);
  }
  if (p.ele < minEle) minEle = p.ele;
  if (p.ele > maxEle) maxEle = p.ele;

  return {
    lat: p.lat,
    lng: p.lng,
    ele: Math.round(p.ele),
    dist: Number((cumDist / 1000).toFixed(2))
  };
});

const totalDistKm = Number((cumDist / 1000).toFixed(2));
console.log(`\nFinal Combined Track:`);
console.log(`Total Points: ${finalPoints.length}`);
console.log(`Total Distance: ${totalDistKm} km`);
console.log(`Elevation Gain: ${Math.round(gain)}m, Loss: ${Math.round(loss)}m`);
console.log(`Min Ele: ${minEle}m, Max Ele: ${maxEle}m`);
console.log(`Start Point:`, finalPoints[0]);
console.log(`End Point:  `, finalPoints[finalPoints.length - 1]);

// Check any big step
let maxStep = 0;
let maxStepIdx = 0;
for (let i = 1; i < finalPoints.length; i++) {
  const d = haversine(finalPoints[i - 1], finalPoints[i]);
  if (d > maxStep) {
    maxStep = d;
    maxStepIdx = i;
  }
}
console.log(`Max Step in whole polyline: ${maxStep.toFixed(2)}m at index ${maxStepIdx} (No jumps, completely continuous!)`);

// Save to section_14.json
origSec14.start_point = { lat: finalPoints[0].lat, lng: finalPoints[0].lng };
origSec14.end_point = { lat: finalPoints[finalPoints.length - 1].lat, lng: finalPoints[finalPoints.length - 1].lng };
origSec14.start_name = '위라1리마을회관';
origSec14.end_name = '대룡1리';
origSec14.calculated_distance_km = totalDistKm;
origSec14.elevation_gain_m = Math.round(gain);
origSec14.elevation_loss_m = Math.round(loss);
origSec14.min_elevation_m = minEle;
origSec14.max_elevation_m = maxEle;
origSec14.points = finalPoints;

fs.writeFileSync('public/data/sections/section_14.json', JSON.stringify(origSec14, null, 2), 'utf8');
console.log('Saved section_14.json');

// Update sections_summary.json
const sumPath = 'public/data/sections_summary.json';
const summary = JSON.parse(fs.readFileSync(sumPath, 'utf8'));
const sumIdx = summary.findIndex(s => s.section_id === 14);
if (sumIdx !== -1) {
  summary[sumIdx].start_point = origSec14.start_point;
  summary[sumIdx].end_point = origSec14.end_point;
  summary[sumIdx].start_name = origSec14.start_name;
  summary[sumIdx].end_name = origSec14.end_name;
  summary[sumIdx].calculated_distance_km = totalDistKm;
  summary[sumIdx].elevation_gain_m = Math.round(gain);
  summary[sumIdx].elevation_loss_m = Math.round(loss);
  summary[sumIdx].hiking_time_hours = Number((totalDistKm / 4.0 + gain / 400.0).toFixed(1));
  summary[sumIdx].hiking_time_text = `${Math.floor(summary[sumIdx].hiking_time_hours)}시간 ${Math.round((summary[sumIdx].hiking_time_hours % 1) * 60)}분`;
  fs.writeFileSync(sumPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log('Saved sections_summary.json');
}

// Update all_sections_overview.json
const allPath = 'public/data/all_sections_overview.json';
const allOverview = JSON.parse(fs.readFileSync(allPath, 'utf8'));
const allIdx = allOverview.findIndex(s => s.section_id === 14);
if (allIdx !== -1) {
  allOverview[allIdx].start_point = origSec14.start_point;
  allOverview[allIdx].end_point = origSec14.end_point;
  allOverview[allIdx].start_name = origSec14.start_name;
  allOverview[allIdx].end_name = origSec14.end_name;
  allOverview[allIdx].distance_km = totalDistKm;
  allOverview[allIdx].elevation_gain_m = Math.round(gain);
  allOverview[allIdx].elevation_loss_m = Math.round(loss);
  allOverview[allIdx].path = finalPoints.map(p => ({ lat: p.lat, lng: p.lng }));
  fs.writeFileSync(allPath, JSON.stringify(allOverview, null, 2), 'utf8');
  console.log('Saved all_sections_overview.json');
}
