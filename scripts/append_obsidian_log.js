import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 카카오 로그인 시 기존 '카카오 트레커' 잔존 원인 규명 및 최신 프로필 자동 동기화 적용

- **원인 분석**:
  1. 카카오 API(\`https://kapi.kakao.com/v2/user/me\`) 실호출 결과, 카카오 인증 토큰을 통해 사용자의 실제 닉네임(\`정상돈\`)과 프로필 사진(\`http://k.kakaocdn.net/...\`)이 정상적으로 응답되고 있음을 직접 확인.
  2. 그러나 Supabase 중앙 DB의 \`user_accounts\` 테이블에는 동의 항목을 켜기 전 최초 테스트 시 저장되었던 과거 레코드(\`name: '카카오 트레커'\`)가 고정되어 있었음.
  3. 기존 \`updateUserLoginSession\` 함수가 로그인 시 토큰만 갱신하고 기존 \`name\`과 \`profile_image\`는 DB에 업데이트하지 않고 기존 DB 값을 그대로 반환했기 때문에, 새 닉네임이 반영되지 않고 과거 이름이 계속 출력됨.
- **해결 조치**:
  1. \`updateUserLoginSession\` 함수를 개정하여 로그인 시 소셜 포털에서 전달된 최신 프로필 정보(\`name\`, \`profile_image\`, \`email\`)가 DB에 즉시 동기화·업데이트되도록 파이프라인 구축.
  2. Supabase DB의 기존 레코드도 즉시 정상 카카오 프로필(\`정상돈\`, 프로필 사진)로 보정 완료.
- **배포 및 검증**:
  - \`npm run build\` 성공.
  - GitHub \`origin/main\` 브랜치 커밋 (\`079033d\`) 및 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
