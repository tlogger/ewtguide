import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 구글(Google) 공식 소셜 OAuth2 로그인 완전 구현 및 실서버 테스트 완료

- **구글 OAuth 연동 설정**:
  - 환경변수 및 \`src/services/oauthService.ts\` 기본값에 구글 클라이언트 ID 등록 완료.
- **인증 및 프로필 처리 파이프라인**:
  - Google OAuth 2.0 Implicit Flow (\`response_type=token\`, Scopes: \`email profile openid\`) 적용.
  - 인가 엔드포인트 실호출 테스트 결과: 구글 공식 계정 선택 페이지로 **HTTP 302 리다이렉트 정상 확인**.
  - 리다이렉트 복귀 시 \`https://www.googleapis.com/oauth2/v3/userinfo\` API를 비동기 호출하여 실제 구글 계정 이름, 이메일, 프로필 사진을 추출하고 Supabase/로컬 DB에 자동 가입(JIT) 및 세션 유지 연동.
- **배포 및 검증**:
  - \`npm run build\` 정상 완료.
  - GitHub \`origin/main\` 브랜치 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
