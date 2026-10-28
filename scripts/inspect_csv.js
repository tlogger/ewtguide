import fs from 'fs';

const lines = fs.readFileSync('시종점_주소.csv', 'utf8').split('\n');
console.log('--- 시종점_주소.csv (first 10 lines) ---');
lines.slice(0, 10).forEach(l => console.log(l));

console.log('\n--- 동서트레일_55개구간_시종점_목록.csv (Section 1, 2, 3, 4) ---');
const lines55 = fs.readFileSync('동서트레일_55개구간_시종점_목록.csv', 'utf8').split('\n');
lines55.slice(0, 10).forEach(l => console.log(l));
