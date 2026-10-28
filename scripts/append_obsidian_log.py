log_path = r'G:\내 드라이브\all\Private\obsidian\Luke\20_Tech & Hobby\agentic\Antigravity 작업 기록.md'
entry = """
### 2026-10-28 (15:35): 카카오맵 줌 레벨 스냅백 버그 근본 해결, 3단 지도 타입(일반/위성/지형도) 지원 및 스플래시 버튼 한 줄 배치
- **줌 레벨 스냅백 및 +/- 버튼 미작동 버그 근본 원인 규명 및 해결**:
  - 원인: KakaoMap 컴포넌트에 inline object literal로 `center`를 전달하거나, `onCenterChanged` 핸들러가 없어 지도 드래그/줌/호버 리렌더링 발생 시마다 React 내부의 초기 `center`와 `level` 상태로 카카오맵 인스턴스를 강제 재설정(setCenter/setLevel 호출)하던 문제.
  - 해결: `onCenterChanged`와 `onZoomChanged`를 완벽히 연동하고, 초기 `fitBounds`는 `initialFitDoneRef`를 통해 최초 로드 시 단 1회만 실행하도록 제한.
  - 결과: +/- 줌 버튼 클릭, 마우스 휠 주밍, 하단 고도 프로필 차트 실시간 호버링 중에도 줌 레벨이 원래대로 튀거나 되돌아가지 않고 완벽하게 유지됨(4km -> 2km -> 1km 연속 줌 및 지연 후 유지 전수 검증 통과).
- **3대 지도 타입(일반지도, 위성지도, 지형도) 완벽 지원**:
  - 카카오맵 공식 `<MapTypeId type="TERRAIN" />` 레이어를 연동하여 등고선과 산악 음영이 표출되는 '지형도' 모드 추가.
  - 구간 지도 및 전체 지도 상단에 [일반] | [위성] | [지형] 3단 세그먼트 토글러를 배치하여 직관적으로 지도 모드 전환 가능.
- **스플래시 화면 버튼 가로 한 줄(flex-row) 배치**:
  - '코스 보기'와 '전체 지도' 버튼을 `flex flex-row gap-2.5`로 배치하여 타이틀 일러스트 하단에 컴팩트하게 임베딩 완료.
- **GitHub Pages 라이브 배포 및 Puppeteer 전수 검증 완료**:
  - 라이브 사이트(https://tlogger.github.io/ewtguide/)에 실시간 반영 및 줌/타입전환/스플래시 레이아웃 검증 통과.
"""

with open(log_path, 'a', encoding='utf-8') as f:
    f.write(entry)
print('Successfully appended to Obsidian Activity Log!')
