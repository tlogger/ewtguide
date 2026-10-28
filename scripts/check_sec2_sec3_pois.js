import fs from 'fs';

const s2 = JSON.parse(fs.readFileSync('public/data/sections/section_2.json', 'utf8'));
const s3 = JSON.parse(fs.readFileSync('public/data/sections/section_3.json', 'utf8'));

console.log('Sec 2 POIs:', s2.pois);
console.log('Sec 3 POIs:', s3.pois);
