import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 지도 시설 마커 상하 분리(아이콘 상단 확대 + 텍스트 하단) UI 개선

- **작업 내용**:
  - \`TrailMapView.tsx\`: 지도 위 편의시설/명소 마커 렌더링 구조 개편.
  - **아이콘 크기 확대**: 아이콘 사이즈를 기존 \`xs\`(16px)에서 \`sm\`(24px)로 확대하여 시인성 대폭 개선.
  - **상하 분리(줄바꿈) 배치**: 상단에는 시설 종류 아이콘 뱃지(복수 카테고리 시 가로 나열), 하단에는 시설명 라벨 캡슐을 배치하여 지도 지형과의 간섭을 최소화하고 가독성 극대화.
  - 앵커 포인트(\`yAnchor={1.1}\`) 조정을 통해 실제 좌표 지점 위에 자연스럽게 핀 형태로 안착되도록 정렬.

- **빌드 및 배포**:
  - \`npm run build\` 성공 및 배포 완료.
  - GitHub \`origin/main\` 브랜치 커밋 (\`0962273\`) 및 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
