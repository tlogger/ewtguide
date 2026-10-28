import fs from 'fs';

const s2 = JSON.parse(fs.readFileSync('public/data/sections/section_2.json', 'utf8'));
const s3 = JSON.parse(fs.readFileSync('public/data/sections/section_3.json', 'utf8'));

console.log('Sec 2 existing elevations (sample 10):', s2.points.slice(0, 10).map(p => p.ele));
console.log('Sec 3 existing elevations (sample 10):', s3.points.slice(0, 10).map(p => p.ele));

// Check if there is DEM or if elevation was interpolated or present in GPX
console.log('Sec 2 min/max ele:', s2.min_elevation_m, s2.max_elevation_m, 'gain:', s2.elevation_gain_m, 'loss:', s2.elevation_loss_m);
console.log('Sec 3 min/max ele:', s3.min_elevation_m, s3.max_elevation_m, 'gain:', s3.elevation_gain_m, 'loss:', s3.elevation_loss_m);
