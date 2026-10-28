import fs from 'fs';

const vaultPath = 'G:/내 드라이브/all/Private/obsidian/Luke/20_Tech & Hobby/agentic/Antigravity 작업 기록.md';
const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

const entry = `
### [${now}] 동서트레일 가이드 (ewtguide) 10대 피드백 및 기능 버그 전면 해결 완료

1. **시설 등록 좌표 정확도 버그 픽스**:
   - 기존 지도 중심(center) 좌표로 저장되던 오류를 해결하고, 카카오맵 좌표 투영 API(\`coordsFromContainerPoint\`)를 연동하여 터치/클릭한 정확한 위경도 좌표로 등록되도록 수정.
2. **시설 수정 화면 내 삭제(Delete) 버튼 추가**:
   - \`FacilityModal\`에 등록된 시설 삭제 기능 및 인앱 삭제 확인 다이얼로그 추가, 로컬 스토리지(\`removeUserFacility\`) 및 실시간 마커 연동.
3. **고도 프로파일 Drawer 차트 고도화**:
   - 타이틀, 실시간 거리/고도 배지, 닫기(✕) 버튼을 SVG 그래프 내부 상단으로 오버레이 배치하여 컴팩트한 레이아웃 완성.
   - 고도 곡선 선 두께를 얇게(\`strokeWidth: 1.2\`) 조정.
   - 마우스 호버 시 빨간 점선을 중심으로 상하 전체에 걸쳐 좌우 균등하게 은은한 수직 밴드 그라데이션(\`opacity: 0.22\`) 적용.
4. **시설 정보 표기 간소화 및 수정 시 확인창 제거**:
   - 시설 정보 표시 시 중복 노출되던 '1구간' 문자열 삭제.
   - 시설 수정 버튼 클릭 시 확인 메시지 없이 즉시 수정 모달 오픈.
5. **브라우저 기본 다이얼로그(\`tlogger.github.io 내용:\`) 완전 제거**:
   - \`window.alert()\`, \`window.confirm()\`을 전면 배제하고 세련된 인앱 모달 및 에러 안내로 교체.
6. **'1구간구간' 문자열 중복 버그 수정**:
   - 헤더 및 상세 화면에서 \`sectionNumber\`에 '구간'이 중복 결합되던 현상 완전 수정.
7. **상세 보기 고도 차트 타이틀 변경**:
   - '노선 고도 프로필' ➔ '구간 고도 프로파일'로 명칭 변경.
8. **내비게이션 바 불필요 요소 제거**:
   - 이전/다음 구간 사이의 'n구간' 텍스트 및 '지도' 텍스트를 제거하고 간결한 지도 아이콘 버튼만 유지.
9. **지도 외 영역 클릭 시 시설 등록 오작동 차단**:
   - 지도 캔버스 영역에만 롱클릭 이벤트를 제한하고 모든 플로팅 컨트롤 및 드로어에 \`stopPropagation\` 적용.
10. **전체 지도에서 구간 클릭 시 해당 구간 지도 미표시 버그 수정**:
    - \`section_\${id}.json\` 파일명 경로 누락 버그 해결하여 구간 지도(\`TrailMapView\`)로 정상 직행.

- **배포**: \`npm run build\` 통과 및 \`origin/main\` 배포 완료.
`;

try {
  fs.appendFileSync(vaultPath, entry, 'utf8');
  console.log('Successfully recorded to Obsidian Vault!');
} catch (e) {
  console.error('Error writing to Obsidian:', e);
}
