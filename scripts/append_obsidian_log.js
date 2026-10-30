import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 카카오 로그인 KOE205(invalid_scope) 에러 원인 규명 및 수정 배포

- **KOE205 에러 원인 정밀 분석**:
  1. \`KOE205\`는 카카오 인가 요청 시 전달한 \`scope\`(동의 항목) 중 **카카오 디벨로퍼스 앱에 정식 승인·활성화되지 않은 항목이 포함되어 있을 때 카카오 인증 서버가 즉각 요청을 차단**하는 에러임.
  2. 카카오 정책상 \`account_email\`(카카오계정 이메일)은 일반 개발자 앱에서는 원칙적으로 차단되어 있거나 '비즈 앱 전환' 및 검수가 선행되어야 사용 가능함.
  3. 앞선 패치에서 \`scope\`에 \`account_email\`을 포함시켰기 때문에, 일반 앱 상태인 카카오 앱(ID: 1628651)에서 인가 요청 시 \`KOE205 (invalid_scope)\` 에러가 발생함.
- **수정 및 해결 조치**:
  - \`src/services/oauthService.ts\`: 카카오 인가 요청 \`scope\`를 일반 앱에서도 100% 즉시 승인되는 안전한 필수 프로필 스코프인 \`scope=profile_nickname,profile_image\`로 조정.
  - 카카오 사용자 프로필 파싱 로직에서 닉네임과 프로필 사진을 1순위로 추출하고, 이메일은 제공된 경우에만 반영하며 미제공 시 고유 식별자 기반 이메일(\`kakao_{id}@kakao.com\`)로 안전하게 매핑.
- **배포 및 검증**:
  - \`npm run build\` 성공.
  - GitHub \`origin/main\` 브랜치 커밋 (\`f677272\`) 및 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
