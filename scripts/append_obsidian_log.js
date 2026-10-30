import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 모바일 타이틀바 최적화, 간결한 소셜 로그인 모달 개편, 지도 시설 멀티 아이콘 반영

- **작업 내용 요약**:
  1. **모바일 타이틀 바 줄바꿈(line wrap) 완전 해소**:
     - \`Header.tsx\`: 모바일(\`sm\` 미만) 해상도에서 '전체 지도', '로그인' 등의 텍스트 레이블을 숨기고 직관적인 Lucide 아이콘(\`Map\`, \`LogIn\`)만 표시하도록 개선하여 좁은 모바일 뷰포트에서도 1줄 배치가 완벽 유지되도록 처리.
  2. **소셜 로그인 팝업 군더더기 전면 제거**:
     - \`AuthModal.tsx\`: [가입 신청] 탭, 모드 전환 링크, 안내 설명문, 우측 상단 기술적 \`OAuth Client ID 설정\` 톱니바퀴 및 입력 폼을 모두 삭제.
     - 사용자가 누르기만 하면 즉시 로그인 및 자동 가입(JIT)되는 **[네이버로 로그인]**, **[카카오로 로그인]**, **[구글로 로그인]** 3대 버튼만 깔끔하고 시원하게 배치.
  3. **로그인 후 타이틀 바의 이름 및 로그아웃 버튼 제거 & 프로필 단독 아바타화**:
     - \`Header.tsx\` 및 \`TitleScreenView.tsx\`: 타이틀 바에서 사용자 이름과 빨간색 [로그아웃] 버튼을 제거하고, 깔끔한 사용자 프로필 아바타(사진 또는 유저 아이콘)만 단독 배치.
     - 프로필 아바타를 터치하면 [내 계정 관리] 팝업이 뜨며, 그 안에서 편안하게 계정 상태 확인 및 [로그아웃]을 수행할 수 있도록 UX 정리.
  4. **지도 시설 마커 이모지 제거 & 멀티 카테고리 Material 아이콘 전면 적용**:
     - \`TrailMapView.tsx\`: 기존 📷, 🍴 등의 단일 텍스트 이모지를 완전히 제거.
     - 해당 시설에 지정된 모든 분류(\`fac.categories\` 또는 \`fac.category\`)를 순회하여 \`CategoryIcon\` 기반의 세련된 원형 Material 벡터 아이콘들을 시설명 왼쪽에 가로 오버랩 뱃지 형태로 렌더링. 복합 편의시설(예: 식당+숙소+마트) 여부를 한눈에 시각적으로 파악 가능하도록 개선.

- **빌드 및 배포**:
  - \`npm run build\` 성공 (0건의 타입/컴파일 에러).
  - GitHub \`origin/main\` 브랜치 커밋 (\`d51a25f\`) 및 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
