import fs from 'fs';

const lines = fs.readFileSync('동서트레일_55개구간_시종점_목록.csv', 'utf8').split('\n');
const line46 = lines.find(l => l.startsWith('46,'));
const line47 = lines.find(l => l.startsWith('47,'));

console.log('Line 46:', line46);
console.log('Line 47:', line47);

const addrLines = fs.readFileSync('시종점_주소.csv', 'utf8').split('\n');
console.log('Addr Line 46/47:', addrLines.find(l => l.startsWith('46,') || l.startsWith('47,')));
