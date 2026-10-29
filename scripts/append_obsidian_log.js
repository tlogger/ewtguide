import fs from 'fs';

const p = 'G:\\내 드라이브\\all\\Private\\obsidian\\Luke\\20_Tech & Hobby\\agentic\\Antigravity 작업 기록.md';

const now = new Date();
const timeStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.toLocaleTimeString('ko-KR')}`;

const entry = `
### [${timeStr}] 동서트레일 가이드 (ewtguide) Supabase(supadb) 원격 중앙 DB 전환 및 맵/상세 4대 UI 개선

- **배경 및 원인 분석**:
  1. 기존 시설 저장이 \`localStorage\`에 한정되어 용량 한계(~5MB)로 인해 사진(Base64)이 포함된 시설 수정/등록 시 저장이 실패하고 다른 사용자와 공유되지 못하던 문제.
  2. \`exFish\` 프로젝트에서 검증된 동일한 Supabase 프로젝트(\`https://johtqemdlprtbpohdkgu.supabase.co\`)를 연동하여 모든 사용자가 실시간으로 시설 정보를 열람/수정/등록/삭제할 수 있는 중앙 원격 공유 DB로 전면 전환.

- **주요 구현 및 개선 내역**:
  1. **Supabase 중앙 DB (\`ewt_facilities\`) 전면 전환 (\`src/services/facilityDb.ts\`)**:
     - \`@supabase/supabase-js\` 패키지 탑재 및 \`schema_ewt_facilities.sql\` 스키마 구축.
     - 공식 시설(JSON)과 Supabase 원격 DB(수정본, 신규 등록, 삭제 플래그)를 실시간으로 결합하는 스마트 머지 엔진 탑재.
     - 공식 시설 수정 및 삭제 오버라이드 지원, 신규 시설 등록 시 전 사용자 기기에 실시간 공유.
     - 오프라인 및 네트워크 오류 대비 로컬 캐시(Local-First Fallback) 안전망 동시 가동.
  2. **맵 보기 상단 구간 선택 콤보박스(Select) 구현 (\`TrailMapView.tsx\`)**:
     - 검색창 돋보기 아이콘 바로 옆에 개통된 32개 구간 드롭다운 배치.
     - 사용자가 원하는 구간을 선택하면 즉시 해당 구간의 지도, GPX 폴리라인, 시설 마커로 화면 전환.
  3. **상세보기에서 '새 시설/명소 등록' 버튼 제거 (\`SectionDetailView.tsx\`)**:
     - 임의 좌표 등록을 차단하고 "지도에서 원하는 위치를 길게 눌러 등록"하도록 등록 버튼 제거 및 안내 문구 개선.
  4. **검색 시 '구간 내 시설'과 '카카오 지도 장소' 동시 노출 (\`TrailMapView.tsx\`)**:
     - 검색 드롭다운에 \`[🚩 구간 내 시설 & 명소 (N건)]\`과 \`[🔍 카카오 지도 검색 결과 (N건)]\` 두 섹션을 분리 배치.
     - 시설 검색 결과가 있어도 카카오 장소 검색 결과를 동시에 스크롤하여 선택 가능하도록 개선.
     - 카카오 검색 반경(30km) 및 전국 검색 폴백 적용으로 주변 지명 검색력 대폭 강화.
  5. **맵 화면의 우하단 '시설 등록' 플로팅 버튼 제거 (\`TrailMapView.tsx\`)**:
     - 하단 안내 힌트(\`길게 클릭 = 시설 등록/수정\`)와 단일화하여 지도 위를 0.5초 길게 눌러 정확한 위치에 등록하도록 통일.

- **빌드 및 배포**:
  - \`npm run build\` 검증 통과 (모듈 2,847개 번들링 성공).
  - GitHub \`origin/main\` 배포 완료 (\`04ac157\`).
`;

fs.appendFileSync(p, entry, 'utf8');
console.log('Successfully appended to Obsidian activity log!');
