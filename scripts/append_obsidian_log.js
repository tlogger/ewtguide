import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 카카오 로그인(OAuth2) 앱 ID \`1628651\` 실연동 및 실시간 프로필/토큰 연동 완료

- **카카오 신규 자격증명 및 리다이렉트 URI 반영**:
  - 앱 ID: \`1628651\`
  - JavaScript 키: \`354131879d586356f9c160db0f834840\`
  - 카카오 로그인 Redirect URI: \`https://tlogger.github.io/ewtguide/kakaologin\`
  - 인가 엔드포인트 사전 검증: HTTP 302 Redirect to \`accounts.kakao.com/login\` (KOE004 에러 없이 완전 정상 인증 페이지 확인).

- **카카오 OAuth2 수신 및 프로필 동기화 파이프라인 탑재**:
  1. **정적 SPA 전용 카카오 콜백 리시버 탑재 (\`public/kakaologin/index.html\` & \`public/kakaologin.html\`)**:
     - GitHub Pages에서 404 없이 즉시 수신되도록 독립 콜백 HTML 구축.
     - \`kauth.kakao.com/oauth/token\`(CORS 허용)을 통해 인가 코드(\`code\`)를 실제 OAuth \`access_token\`으로 실시간 교환.
     - \`kapi.kakao.com/v2/user/me\`(CORS 허용)를 호출하여 사용자 고유 식별자(\`id\`), 카카오 닉네임, 프로필 사진 URL, 이메일 수신.
     - 인증 페이로드를 저장하고 메인 애플리케이션으로 안전하게 자동 리다이렉트 복귀.
  2. **가입 신청 vs 로그인 분기 처리 (\`oauthService.ts\` & \`App.tsx\`)**:
     - **[가입 신청]**: 카카오에서 동의/인증 후 복귀 시 Supabase \`user_accounts\` DB에 카카오 고유 ID, 프로필, 발급된 OAuth 토큰을 영구 보전하고 정식 회원 등록.
     - **[로그인]**: DB에서 가입된 회원인지 확인 후 토큰 갱신 및 세션 로그인 처리 (미가입 상태인 경우 가입 신청 안내 모달 전환).
  3. **인앱 알림 토스트 (\`App.tsx\`)**:
     - 로그인/가입 완료 시 상단에 카카오 닉네임과 함께 환영 알림 토스트 자동 출력.

- **빌드 및 배포**:
  - \`npm run build\` 성공 (카카오 콜백 HTML 번들링 포함).
  - GitHub \`origin/main\` 브랜치 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
