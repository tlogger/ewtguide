import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 14구간 종점 단절 해결 및 튀는 현상 없는 무단절(Gap 0.0m) 결합 완료

- **문제 상황 및 원인 정밀 분석**:
  1. **단절 현상**: 14구간 종점(공주 대룡1리, 충남 공주시 신풍면 대룡리 397-4 / 36.492545, 126.940395) 앞 약 661.3m 지점(36.495531, 126.933997)에서 트랙이 멈춰 있어 종점과 연결되지 않는 현상 발생.
  2. **과거 튀는 현상(순간 점프)의 원인 규명**: 원본 GPX의 대룡1리 진입로 세그먼트(\`Seg 63\`, 59개 포인트, 1.64km)가 종점에서 상류 방향으로 기록되어 있었는데, 이를 역방향(\`reverse\`)이 아닌 정방향으로 직결하면서 661m 직선 점프가 발생했었음. 과거 버그 수정 과정에서 \`Seg 63\` 전체가 제거되어 종점 앞 단절이 초래되었던 것임.

- **해결 내역**:
  1. **14구간 종점 무단절 스냅 및 튀는 구간 완전 제거 (\`scripts/fix_section_14_endpoint.js\`)**:
     - 기존 실측 DEM 고도가 보존된 14구간 트랙(852개 포인트)에 대룡1리 진입 도로 세그먼트(\`Seg 63\`, 59개 포인트)를 **역방향(reversed)**으로 0.00m 오차 없이 결합.
     - 최종 종점 좌표를 공식 대룡1리 앵커 좌표(\`36.492545, 126.940395\`)로 정밀 스냅.
     - 고도 프로파일을 150m에서 대룡1리 실측 고도 115m까지 자연스럽게 선형 보간 적용.
     - 최대 인접 포인트 간격 111.7m 이내로 순간 점프 및 루프가 0건임을 수학적으로 검증.
     - 총 911개 포인트, 총 연장 32.38km로 갱신 완료.
  2. **전체 32개 구간 요약 및 전체 지도 메타데이터 동기화**:
     - \`public/data/sections/section_14.json\`, \`public/data/sections_summary.json\`, \`public/data/all_sections_overview.json\` 일괄 동기화 완료.
  3. **전체 1구간~14구간 연속성 검증 (\`scripts/check_all_section_gaps.js\`)**:
     - 1구간(태안 샛별해변)부터 14구간(공주 대룡1리)까지 13개 구간 접점 전체 거리차 **0.0m [CONTINUOUS]** 완전 확인.

- **빌드 및 배포**:
  - \`npm run build\` 프로덕션 빌드 무결성 통과 (2,848개 모듈 번들링 완료).
  - GitHub \`origin/main\` 브랜치 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
