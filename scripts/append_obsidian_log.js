import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 카카오 로그인 시 '카카오_트래커' 기본값 출력 원인 분석 및 scope 명시 수정

- **원인 분석**:
  1. 카카오는 개인정보 보호 정책상 기본 인가 요청(\`scope\` 미지정) 시 닉네임, 프로필 사진, 이메일 등의 개인정보를 반환하지 않고 비공개(\`null\` 또는 동의 미완료) 처리함.
  2. 카카오 개발자 콘솔([카카오 로그인] > [동의 항목])에서 프로필 정보(닉네임/사진) 및 카카오계정(이메일)이 활성화되어 있지 않거나, 인가 요청 URL에 필수 \`scope\`가 포함되지 않아 카카오 API 응답에서 \`kakao_account.profile\` 객체가 비어 있게 됨.
  3. 이로 인해 코드 상의 폴백인 \`카카오 트레커\`가 최종 이름으로 채택됨.
- **조치 사항**:
  - \`src/services/oauthService.ts\`의 카카오 인가 요청 URL에 \`scope=profile_nickname,profile_image,account_email\`을 명시적으로 추가하여 동의창에서 닉네임과 이메일을 전달받도록 개선.
  - 사용자에게 카카오 개발자 콘솔 동의항목 확인 가이드 안내.
- **배포**:
  - GitHub \`origin/main\` 브랜치 커밋 (\`da9fe08\`) 및 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
