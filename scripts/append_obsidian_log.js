import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 네이버/카카오/구글 공식 OAuth2 인가 연동 및 Provider 에러(KOE004, 400 validation_failed) 원인 분석·해결

- **에러 원인 정밀 규명**:
  1. **네이버 가입 신청 시 '네이버_트래커'만 출력된 원인**:
     - 이전 코드에서 네이버는 Supabase 공식 내장 목록 외 프로바이더여서 시뮬레이션 세션으로 처리되었음. 실제 네이버 OAuth2 인가 URL(\`nid.naver.com\`)을 직접 호출하도록 전면 수정.
  2. **카카오 및 구글 400 에러 (\`Unsupported provider: provider is not enabled\`) 원인**:
     - Supabase 클라우드 대시보드(\`Authentication -> Providers\`)에서 Google과 Kakao 프로바이더가 기본적으로 비활성화(OFF)되어 있어 Supabase 서버가 요청을 거부함.
     - 또한, 카카오 개발자 콘솔(\`developers.kakao.com\`)에서도 해당 앱(\`61ebf0b7a0daf24cba357d92677c8d8a\`)의 [카카오 로그인] 기능이 비활성화(OFF) 상태여서 카카오 자체에서 \`KOE004\` 에러를 반환하는 상태였음.

- **해결 및 구축 내역**:
  1. **공식 OAuth2 Direct Authorize 아키텍처 탑재 (\`src/services/oauthService.ts\`)**:
     - Supabase 서버 프록시 차단과 무관하게, 브라우저에서 공식 인증 인가 페이지로 직결:
       - **네이버**: \`https://nid.naver.com/oauth2.0/authorize?client_id=...&response_type=token\` (실제 네이버 아이디 로그인 화면 호출)
       - **카카오**: \`https://kauth.kakao.com/oauth/authorize?client_id=...&response_type=code\` (실제 카카오 로그인 및 동의창 호출)
       - **구글**: \`https://accounts.google.com/o/oauth2/v2/auth?client_id=...&response_type=token\` (실제 구글 계정 선택창 호출)
  2. **모달 내 OAuth Client ID 설정 및 가이드 탑재 (\`src/components/AuthModal.tsx\`)**:
     - 상단 톱니바퀴 아이콘을 통해 네이버 Client ID, 구글 Client ID를 즉시 입력/저장 가능하도록 지원.
     - 각 포털 개발자 콘솔에 등록할 현재 도메인의 Callback URI(\`http://localhost:5173/\`, GitHub Pages URL) 안내 및 카카오 로그인 활성화 필수(KOE004 방지) 안내 표기.
     - 외부 키 등록 전에도 화면 플로우를 검증할 수 있는 '빠른 체험용(Sandbox)' 버튼을 명확히 분리 제공.
  3. **OAuth 콜백 파서 및 DB 토큰 보전 연동 (\`src/App.tsx\`)**:
     - 리다이렉트 복귀 시 토큰/인증코드를 자동 파싱하여 \`user_accounts\` DB에 토큰과 함께 보전하고 즉시 로그인 상태로 전환.

- **빌드 및 배포**:
  - \`npm run build\` 통과 (2,851개 모듈).
  - GitHub \`origin/main\` 브랜치 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
