import fs from 'fs';

const summary = JSON.parse(fs.readFileSync('public/data/sections_summary.json', 'utf8'));
const s2 = summary.find(s => s.section_id === 2);
const s3 = summary.find(s => s.section_id === 3);

console.log('Section 2 summary:', s2);
console.log('Section 3 summary:', s3);
