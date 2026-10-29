import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) 소셜 OAuth2(네이버/카카오/구글) 가입·로그인 및 편의시설 DB 다중선택/UI 전면 개편

- **타 서비스 소셜 OAuth2 인증 벤치마킹 및 표준 플로우 정립 (6번 항목)**:
  1. **가입 신청 vs 로그인 명시 분리형 아키텍처 수립**:
     - 타 서비스(토스, 벨로그, 당근, 인프런 등) 조사 결과 반영.
     - [가입 신청] 시: 네이버/카카오/구글 표준 OAuth2 동의를 거쳐 \`user_accounts\` DB에 프로필 및 발급된 OAuth 토큰(\`access_token\`, \`refresh_token\`, 만료일시)을 영구 보전.
     - [로그인] 시: OAuth2 인증 후 DB를 검증하여 등록된 회원이면 토큰 갱신 및 세션 연결, 미등록 회원이면 가입 신청 안내 모달 유도.
  2. **하이브리드 OAuth2 프로바이더 연동**:
     - 구글 & 카카오: Supabase Auth 내장 Provider 기반 표준 연동.
     - 네이버: 네이버 로그인 웹 플로우 및 인가 토큰 획득 연동.
  3. **헤더 로그인/로그아웃 상시 아이콘 탑재 (\`Header.tsx\`)**:
     - 타이틀바 우측에 [로그인] 버튼 및 로그인 시 프로필/이름/[로그아웃] 상태 원클릭 토글 지원.
     - 소셜 인증 모달(\`AuthModal.tsx\`) 제공.

- **Supabase 중앙 DB 미공유 원인 규명 및 통합 스키마 배포 (3번 항목)**:
  1. **원인 규명**: Supabase 프로젝트에 \`ewt_facilities\` 테이블이 아직 미배포(\`PGRST205\` 에러)되어 모든 브라우저가 \`localStorage\`로만 폴백 저장되고 있었음.
  2. **통합 DDL 스크립트 배포 (\`supabase/schema_ewt_facilities.sql\`)**:
     - \`public.user_accounts\` (소셜 OAuth 토큰 보전) 및 \`public.ewt_facilities\` (다중 카테고리 \`categories TEXT[]\` 지원) 통합 스키마 작성 및 RLS 정책 일괄 구축.

- **편의시설/명소 카테고리 개편 및 원형 Material 아이콘 시스템 (4번, 5.2번 항목)**:
  1. **카테고리 정리**: 쉼터/정자 삭제, 명소(카메라), 음식료(포크&나이프), 교통(차량), 숙소/야영(텐트), 안내소(i), 마트(쇼핑백), 기타(핀)로 개편.
  2. **다중 선택 토글 시스템**: 체크박스 대신 선택 시 원형 Material 아이콘이 반전/강조되는 세련된 현대적 토글 컴포넌트(\`CategoryIcon.tsx\`) 구축. 1개 시설에 여러 종류 동시 지정 지원.

- **UI/UX 세부 개선 완료 (1번, 2번, 5번 항목)**:
  1. **코스 보기**: 각 카드 하단의 불필요한 '상세보기' 텍스트 제거 (우측 꺾쇠 아이콘만 심플하게 유지).
  2. **고도 프로파일**: '차트 위... 지도 연동 가능' 안내 문구 완전 삭제.
  3. **수정 모달**: '등록된...수정합니다' 문구 삭제, [명칭/이름] 필드를 [시설 종류] 상단으로 우선 배치, [메모] 라벨 축소 및 textarea 최소 5줄로 확대, [수정 저장하기] ➔ [저장], 좌측 삭제 버튼 ➔ 입력 취소/창 닫기 역할을 하는 [취소] 버튼으로 변경.

- **빌드 및 배포**:
  - \`npm run build\` 프로덕션 번들링 성공 (2,850개 모듈).
  - GitHub \`origin/main\` 브랜치 푸시 완료.
`;

try {
  fs.appendFileSync(p, entry, 'utf8');
  console.log('Successfully appended to Obsidian activity log!');
} catch (err) {
  console.error('Failed to append to Obsidian log:', err.message);
}
