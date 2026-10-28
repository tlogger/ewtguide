import fs from 'fs';

const gpxRaw = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');

const segMatches = [...gpxRaw.matchAll(/<trkseg>([\s\S]*?)<\/trkseg>/g)];
console.log('Total <trkseg> count:', segMatches.length);

segMatches.forEach((seg, idx) => {
  const pts = [...seg[1].matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g)];
  if (pts.length > 0) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    console.log(`Segment ${idx}: ${pts.length} pts | Start: (${first[1]}, ${first[2]}) -> End: (${last[1]}, ${last[2]})`);
  }
});
