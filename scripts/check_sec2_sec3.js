import fs from 'fs';

const s2 = JSON.parse(fs.readFileSync('public/data/sections/section_2.json', 'utf8'));
const s3 = JSON.parse(fs.readFileSync('public/data/sections/section_3.json', 'utf8'));

console.log('Section 2 title:', s2.title);
console.log('Section 2 start:', s2.start_name, s2.start_point);
console.log('Section 2 end:  ', s2.end_name, s2.end_point);
console.log('Section 2 last point:', s2.points[s2.points.length - 1]);
console.log('Total points in Sec 2:', s2.points.length);

console.log('\n---');
console.log('Section 3 title:', s3.title);
console.log('Section 3 start:', s3.start_name, s3.start_point);
console.log('Section 3 end:  ', s3.end_name, s3.end_point);
console.log('Section 3 first point:', s3.points[0]);
console.log('Total points in Sec 3:', s3.points.length);

function getDistance(p1, p2) {
  const R = 6371e3;
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;
  const dlat = (p2.lat - p1.lat) * Math.PI / 180;
  const dlng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const gap = getDistance(s2.points[s2.points.length - 1], s3.points[0]);
console.log(`\nGap between Sec 2 end and Sec 3 start: ${gap.toFixed(1)} meters`);
