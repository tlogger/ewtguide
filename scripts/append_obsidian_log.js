import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 네이버 아이디로 로그인(OAuth2) 가입 신청 & 로그인 실연동 완료

- **네이버 공식 자격증명 및 콜백 등록**:
  - 클라이언트 ID: \`ZlO4zT_XXNDHb24LQL5u\`
  - Client Secret: \`Wqt6MavrzV\`
  - Callback 주소: \`https://tlogger.github.io/ewtguide/naverlogin\`
  - \`.env\` 및 \`.env.example\` 환경 변수 주입 완료.

- **네이버 OAuth2 수신 및 프로필 동기화 엔진 구현**:
  1. **정적 SPA 전용 네이버 콜백 리시버 탑재 (\`public/naverlogin/index.html\` & \`public/naverlogin.html\`)**:
     - GitHub Pages에서 404 없이 즉시 수신되도록 독립 콜백 HTML 구축.
     - 네이버 공식 JS SDK(\`naveridlogin_js_sdk_2.0.2.js\`)를 구동하여 브라우저 CORS 제약 없이 사용자 프로필(고유 ID, 이름/닉네임, 이메일, 프로필사진)과 \`access_token\` 획득.
     - 획득한 인증 페이로드를 저장하고 메인 애플리케이션으로 안전하게 자동 리다이렉트 복귀.
  2. **가입 신청 vs 로그인 분기 처리 (\`oauthService.ts\` & \`App.tsx\`)**:
     - **[가입 신청]**: 네이버에서 동의/인증 후 복귀 시 Supabase \`user_accounts\` DB에 네이버 고유 ID, 프로필, 발급된 OAuth 토큰을 영구 보전하고 정식 회원 등록.
     - **[로그인]**: DB에서 가입된 회원인지 확인 후 토큰 갱신 및 세션 로그인 처리 (미가입 상태인 경우 가입 신청 안내 모달 전환).
  3. **인앱 알림 토스트 (\`App.tsx\`)**:
     - 로그인/가입 완료 시 상단에 환영 알림 토스트 자동 출력.

- **빌드 및 배포**:
  - \`npm run build\` 성공 (네이버 콜백 HTML 번들링 포함).
  - GitHub \`origin/main\` 브랜치 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
