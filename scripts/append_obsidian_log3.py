import datetime

vault_path = r'G:\내 드라이브\all\Private\obsidian\Luke\20_Tech & Hobby\agentic\Antigravity 작업 기록.md'
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')

entry = f'''
### [{now}] 동서트레일 가이드 (ewtguide) UI/UX 전면 개편 및 타이틀바·지도·고도차트 고도화 완료

1. **타이틀바 1행 단일화 및 뒤로가기 버튼 완전 제거**:
   - `[← 뒤로가기]` 및 2번째 줄(구간 › 상세 › 지도 탭) 전면 삭제 완료.
   - 메인 화면: '동서트레일 가이드' + 우측 [전체 지도] 버튼.
   - 구간 상세/지도 화면: '{{n}}구간' 단일 표기 및 우측 [구간 목록], [상세/지도], [전체 지도] 아이콘 3종 컴팩트 배치.
   - 전체 지도 화면: '전체 지도' + 우측 [구간 목록] 버튼.

2. **구간 상세 보기 (SectionDetailView) 간결화**:
   - 상단 중복 블록('지역, 코스 난이도, 완주 인증하기, n구간' 및 대형 지도 버튼) 삭제.
   - 최상단 네비게이션 행 중앙에 컴팩트한 [지도] 버튼 배치.
   - 소요 시간 카드 하단 '오르막·내리막 복합 반영' 문구 삭제.

3. **구간 지도 보기 (TrailMapView) 상호작용 및 고도 프로파일 고도화**:
   - 검색창 옆 '<- 상세' 버튼 삭제 및 우측 돋보기 버튼(엔터 키 또는 클릭 시에만 검색) 연동.
   - 일반/위성/지형도 3단 전환을 텍스트 대신 컴팩트 아이콘(Map, Layers, Mountain)으로 개정.
   - 노선 고도 프로파일: 접기/펼치기 Drawer 토글 버튼 도입, 텍스트 '고도 프로파일'로 단순화, 산 정상일수록 짙은 녹색(#047857)~저지대 검정(#020617) 수직 그라데이션 및 마우스 호버 시 자연스러운 반경(radial) 그라데이션 하이라이트 SVG 차트 구현.
   - 지도 축척 바(MapScaleBar)와 고도 차트의 위치 겹침 방지.
   - 지도 최하단 '길게 클릭 = 시설 등록/수정' 안내 캡슐 상시 노출.
   - 시설 클릭 시 사진 포함 상세 팝업 표출, 길게 누를 시 사용자 확인(confirm) 후 수정/등록 모달 전환.

4. **전체 지도 (AllSectionsMapView) 연동 개선**:
   - 전체 지도에서 노선 폴리라인 또는 구간 배지 클릭 시 상세 페이지를 거치지 않고 해당 구간 지도(TrailMapView)로 직행.

- **결과**: `npm run build` 정상 통과 및 GitHub Pages (`main` 브랜치) 배포 완료.
'''

try:
    with open(vault_path, 'a', encoding='utf-8') as f:
        f.write(entry)
    print('Successfully appended entry to Obsidian Vault!')
except Exception as e:
    print('Error:', e)
