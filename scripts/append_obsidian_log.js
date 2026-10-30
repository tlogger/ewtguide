import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 카카오 닉네임/이메일 표시 개선 및 네이버·카카오 상시 [로그아웃] 버튼 전면 탑재

- **원인 분석 및 해결**:
  1. **카카오 로그인 시 '카카오_트래커' 기본값 출력 문제**:
     - 카카오 프로필 객체 계층(\`kakao_account.profile.nickname\`, \`properties.nickname\`, \`kakao_account.email\`) 간의 다중 폴백 구조를 보강.
     - 닉네임 또는 가입 이메일(\`user@kakao.com\`)이 최우선으로 사용자 이름에 반영되도록 개선.
  2. **네이버 로그인 시 로그아웃 버튼 미노출 문제**:
     - 네이버 콜백 HTML(\`naverlogin/index.html\`)에서 URL 해시의 \`access_token\`을 즉시 로컬스토리지에 저장하지 않고 비동기 SDK 호출 후 바로 리다이렉트되면서 세션이 누락되던 현상 해결.
     - \`access_token\` 즉시 보전 엔진 및 프로필 비동기 보강 구조로 변경.
  3. **상단 타이틀 바 및 시작 화면 상시 [로그아웃] 버튼 전면 탑재**:
     - \`Header.tsx\`: 로그인 시 사용자 뱃지(프로필 사진 + 닉네임/이메일) 옆에 명확한 **[로그아웃]** 버튼을 모든 해상도(모바일 포함)에서 상시 노출.
     - \`TitleScreenView.tsx\`: 초기 타이틀 화면 우측 상단에도 로그인/로그아웃 뱃지를 탑재하여 어느 화면에서든 로그인 상태 인지 및 원클릭 로그아웃 가능.
     - 로그인/가입 완료 시 타이틀 화면에 머물지 않고 즉시 코스 목록 화면으로 이동하도록 전환.

- **빌드 및 배포**:
  - \`npm run build\` 성공 (네이버/카카오 콜백 HTML 및 에셋 번들링 완료).
  - GitHub \`origin/main\` 브랜치 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
