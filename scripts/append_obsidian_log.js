import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 카카오 로그인 이메일 비우기(이름+프로필만 노출) 및 로그아웃 시 즉시 메인 화면 복귀 개선

- **작업 내용**:
  1. **카카오 로그인 계정 이메일 비움 처리**:
     - 카카오는 이메일 동의가 제외되어 있으므로 가짜 임의 이메일(\`kakao_{id}@kakao.com\`)을 생성하지 않고 빈 값(\`null\` 또는 \`''\`)으로 유지.
     - 계정 모달(\`AuthModal.tsx\`)에서 카카오 계정의 경우 불필요한 이메일 행을 노출하지 않고, 사용자 이름과 카카오 프로필 사진만 깔끔하게 출력하도록 조정.
     - Supabase 중앙 DB의 기존 사용자 레코드에서도 \`email: null\`로 정제 완료.
  2. **로그아웃 시 모달 즉시 닫힘 및 메인 화면 복귀**:
     - \`AuthModal.tsx\`에서 [로그아웃] 클릭 시 '로그인 창'으로 리로드/업데이트되지 않고, 팝업을 즉시 닫고(\`onClose()\`) 원래 보고 있던 메인 지도/코스 화면으로 부드럽게 복귀하도록 흐름 개선.

- **빌드 및 배포**:
  - \`npm run build\` 성공 및 배포 완료.
  - GitHub \`origin/main\` 브랜치 커밋 (\`76bdcfc\`) 및 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
