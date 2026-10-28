import fs from 'fs';

const gpxRaw = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');

// Match trkseg or trk
// Let's parse all trk / trkseg / trkpt
const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?<ele>([^<]+)<\/ele>/g;

let points = [];
let match;
while ((match = trkptRegex.exec(gpxRaw)) !== null) {
  points.push({
    lat: parseFloat(match[1]),
    lng: parseFloat(match[2]),
    ele: parseFloat(match[3])
  });
}

console.log('Total GPX points in raw file:', points.length);

function getDistance(p1, p2) {
  const R = 6371e3;
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;
  const dlat = (p2.lat - p1.lat) * Math.PI / 180;
  const dlng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Target points:
// Sec 1 start: 안면도 휴양림 ~36.4967, 126.3589
// Sec 1 end / Sec 2 start: 백사장항 ~36.5863, 126.3151
// Sec 2 end / Sec 3 start:
// Point A: 36.666960, 126.289846 (Sec 2 end currently)
// Point B: 36.673197, 126.272662 (Sec 3 start currently, 몽산리 685-40)
// Sec 3 end / Sec 4 start: 태안읍행정복지센터 ~36.7581, 126.2966

const pt_baeksajang = { lat: 36.586376, lng: 126.315198 };
const pt_mongsan_road = { lat: 36.666960, lng: 126.289846 };
const pt_mongsan_beach = { lat: 36.673197, lng: 126.272662 };
const pt_taean_office = { lat: 36.758085, lng: 126.296696 };

function findClosest(target) {
  let minD = Infinity;
  let bestIdx = -1;
  for (let i = 0; i < points.length; i++) {
    const d = getDistance(target, points[i]);
    if (d < minD) {
      minD = d;
      bestIdx = i;
    }
  }
  return { idx: bestIdx, dist: minD, pt: points[bestIdx] };
}

console.log('Closest to 백사장항:', findClosest(pt_baeksajang));
console.log('Closest to 몽산포 (Point A 36.66696, 126.28985):', findClosest(pt_mongsan_road));
console.log('Closest to 몽산포해수욕장 (Point B 36.673197, 126.272662):', findClosest(pt_mongsan_beach));
console.log('Closest to 태안읍행정복지센터:', findClosest(pt_taean_office));
