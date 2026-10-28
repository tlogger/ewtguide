import fs from 'fs';

const summary = JSON.parse(fs.readFileSync('public/data/sections_summary.json', 'utf8'));

// Filter opened sections
const opened = summary.filter(s => s.is_opened);
console.log(`Total opened sections: ${opened.length}`);
console.log('Opened section IDs:', opened.map(s => s.section_id).join(', '));

function getDistance(p1, p2) {
  const R = 6371e3;
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;
  const dlat = (p2.lat - p1.lat) * Math.PI / 180;
  const dlng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Check gaps between each consecutive section in the opened list
console.log('\n--- Checking gaps between consecutive opened sections ---');
for (let i = 0; i < opened.length - 1; i++) {
  const cur = opened[i];
  const next = opened[i + 1];

  // Load actual section json
  const curData = JSON.parse(fs.readFileSync(`public/data/sections/section_${cur.section_id}.json`, 'utf8'));
  const nextData = JSON.parse(fs.readFileSync(`public/data/sections/section_${next.section_id}.json`, 'utf8'));

  const curEnd = curData.points[curData.points.length - 1];
  const nextStart = nextData.points[0];

  const gapMeters = getDistance(curEnd, nextStart);

  const isConsecutiveId = next.section_id === cur.section_id + 1;
  const flag = gapMeters > 50 ? '⚠️ LARGE GAP' : (gapMeters > 5 ? '⚡ MINOR GAP' : '✅ CONTINUOUS');

  console.log(
    `[${cur.section_number} ➔ ${next.section_number}] ` +
    `(IDs: ${cur.section_id} -> ${next.section_id}${isConsecutiveId ? '' : ' *JUMP IN ID*'}): ` +
    `Gap = ${gapMeters.toFixed(1)}m | ` +
    `End: "${cur.end_name}" (${curEnd.lat}, ${curEnd.lng}) ➔ ` +
    `Start: "${next.start_name}" (${nextStart.lat}, ${nextStart.lng}) [${flag}]`
  );
}
