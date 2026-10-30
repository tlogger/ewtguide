import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 네이버 로그인 무한루프 원인 규명 및 직접 JSONP 프로필 조회 & JIT 자동가입 엔진 구축

- **무한루프 발생 원인 정밀 분석**:
  1. **네이버 JS SDK(naveridlogin_js_sdk_2.0.2.js)의 내부 state 토큰 불일치**:
     - 네이버 공식 SDK는 자체 버튼 클릭 시 로컬에 저장된 \`state\`와 콜백 URL의 \`state\`를 \`checkStateToken\`으로 대조함.
     - 메인 앱에서 자체 구성한 인가 URL로 리다이렉트되면서 SDK 내부 state 검증이 실패(\`false\`), 사용자 프로필 조회가 전면 차단됨.
  2. **임의 ID 발급에 따른 미가입 처리 & 로그인 모달 재호출 루프**:
     - SDK 실패로 인해 \`id\`가 \`naver_\${Date.now()}\`로 임의 생성됨.
     - \`oauthService.ts\`의 [로그인] 흐름에서 DB에 매번 다른 임의 ID가 조회되므로 "미가입 계정"으로 판정되어 실패 처리.
     - 실패 시 메인 화면이 다시 로그인 모달을 띄우고, 이미 네이버에 세션이 맺어져 있는 사용자는 네이버 로그인 클릭 시 즉시 리다이렉트되어 동일 실패를 무한 반복하는 악순환 발생.
  3. **콜백 리다이렉트 시 URL Hash 잔존 간섭**:
     - 콜백 페이지에서 \`replace(basePath)\` 실행 시 일부 브라우저에서 기존 \`#access_token=...\` 해시가 유지되어 재파싱 간섭을 유발함.

- **해결 방안 및 구현 내용**:
  1. **버그 많은 129KB Naver SDK 완전 제거 & 순수 OpenAPI JSONP 프로필 엔진 도입**:
     - \`public/naverlogin/index.html\` 및 \`public/naverlogin.html\`에서 무거운 SDK 의존성을 완전히 제거.
     - URL 해시에서 \`access_token\`을 순수 정규식으로 안전하게 추출한 뒤, 네이버 공식 OpenAPI 엔드포인트(\`https://openapi.naver.com/v1/nid/me?access_token=...&oauth_callback=...\`)를 JSONP 방식으로 직접 호출.
     - 네이버 서버로부터 정식 영구 고유 식별자(\`id\`), \`nickname\`, \`name\`, \`email\`, \`profile_image\`를 즉각 수신하여 로컬스토리지에 보전.
  2. **JIT(Just-In-Time) 프로비저닝 (로그인 시 자동 가입 및 세션 활성화)**:
     - \`src/services/oauthService.ts\`: [로그인] 탭을 눌러 진입한 사용자라도 네이버/카카오 인증이 완료되었으면 미가입 거부 대신 즉시 Supabase/로컬 DB에 자동 가입(JIT Provisioning) 및 로그인을 원스톱 처리.
     - 사용자가 가입 신청과 로그인 중 어느 쪽을 클릭하더라도 단 한 번의 소셜 인증으로 즉시 로그인 완료.
  3. **완전한 클린 리다이렉트 & URL 상태 정리**:
     - 콜백 페이지 이동 시 \`window.location.origin + basePath\`로 해시나 쿼리 없이 깨끗한 메인 URL로 이동.
     - \`src/App.tsx\` 진입 즉시 \`history.replaceState\`로 파라미터를 정리하고 모달 닫기 및 코스 목록 화면 자동 전환.

- **빌드 및 배포**:
  - \`npm run build\` 성공 및 배포 완료.
  - GitHub \`origin/main\` 브랜치 커밋 (\`d695ef1\`) 및 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
