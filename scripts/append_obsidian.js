import fs from 'fs';

const vaultPath = 'G:/내 드라이브/all/Private/obsidian/Luke/20_Tech & Hobby/agentic/Antigravity 작업 기록.md';
const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

const entry = `
### [${now}] 동서트레일 가이드 (ewtguide) 2구간 및 3구간 GPX 경계 재절단 및 단절(1.68km) 버그 완전 해결

- **원인 분석**:
  - 원본 GPX에서 2구간에 해당하는 Segment 0(백사장항 ➔ 신장리 진입로, 11.5km)의 끝지점과, 3구간이 시작되던 몽산포해수욕장 해변(Point 58, 몽산리 685-40) 사이에 약 **1.68km의 공백**이 존재했음.
  - 실제 원본 GPX 상 Segment 1의 앞부분 58개 포인트(2.43km)가 신장리 진입로부터 몽산포해수욕장 해변까지 이어지는 트레일 구간이었음.
  - 이로 인해 2구간의 실제 거리가 11.5km(공식 14.6km 대비 3.1km 부족)에 머물고 2구간 끝과 3구간 시작 지점이 1.68km 단절되어 어긋나 있었음.

- **해결 내역**:
  - **2구간 (13.93km, 공식 14.6km 부합)**: Segment 0 전체 + Segment 1 (포인트 0~58)을 연속 연결하여 백사장항에서 몽산포해수욕장 해변(\`36.673197, 126.272662\`)까지 완벽하게 이어지도록 재절단.
  - **3구간 (13.78km, 공식 13.7km 완벽 일치)**: 몽산포해수욕장 해변(\`36.673197, 126.272662\`)에서 시작하여 태안읍행정복지센터(\`36.758143, 126.296638\`)까지 Segment 1 (포인트 58~418)로 절단.
  - 2구간 종점과 3구간 시점 간 오차: **0.00m (정확히 동일한 좌표로 100% 일치 및 연결)**.
  - \`section_2.json\`, \`section_3.json\`, \`sections_summary.json\`, \`all_sections_overview.json\` 일괄 최신화 및 배포 완료.
`;

try {
  fs.appendFileSync(vaultPath, entry, 'utf8');
  console.log('Successfully recorded to Obsidian Vault!');
} catch (e) {
  console.error('Error writing to Obsidian:', e);
}
