import fs from 'fs';

const lines = fs.readFileSync('동서트레일_55개구간_시종점_목록.csv', 'utf8').split('\n');
const line49 = lines.find(l => l.startsWith('49,'));
const line50 = lines.find(l => l.startsWith('50,'));

console.log('Line 49:', line49);
console.log('Line 50:', line50);
