import fs from 'fs';

const gpxRaw = fs.readFileSync('동서트레일 32개 구간 GPX_노선도 파일.gpx', 'utf8');

// Find all <trk> elements
const trkRegex = /<trk>([\s\S]*?)<\/trk>/g;
let trkMatch;
let trackIndex = 0;

while ((trkMatch = trkRegex.exec(gpxRaw)) !== null) {
  const trkContent = trkMatch[1];
  const nameMatch = /<name>(.*?)<\/name>/.exec(trkContent);
  const name = nameMatch ? nameMatch[1] : `Track ${trackIndex}`;
  
  const ptMatches = trkContent.match(/<trkpt/g) || [];
  
  // Find first and last pt
  const firstPtMatch = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/.exec(trkContent);
  const allPts = [...trkContent.matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g)];
  const lastPtMatch = allPts.length > 0 ? allPts[allPts.length - 1] : null;

  console.log(`Track ${trackIndex}: "${name}" - ${ptMatches.length} pts`);
  if (firstPtMatch && lastPtMatch) {
    console.log(`   Start: (${firstPtMatch[1]}, ${firstPtMatch[2]})`);
    console.log(`   End:   (${lastPtMatch[1]}, ${lastPtMatch[2]})`);
  }
  trackIndex++;
}
