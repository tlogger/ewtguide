# 동서트레일 가이드 (ewtguide) 프로젝트 현황 및 작업 인수인계서

## 1. 프로젝트 개요
- **서비스명**: 동서트레일 가이드 (ewtguide; East-West Trail Guide)
- **작업 경로**: `c:\work\ewtguide`
- **배포 목표**: GitHub Pages (`https://<username>.github.io/ewtguide`) ➔ 향후 PWA/Capacitor 모바일 앱 확장
- **주요 기능**:
  1. 32개 동서트레일 구간의 정밀 노선 오버레이 (RDP 3m 압축) 및 고도 프로필 제공
  2. 숲나들e 32개 공식 구간 데이터 크롤링 기반 기초 데이터 + 위키형 사용자 편의시설(숙소, 식당, 화장실, 콜택시/교통 등 8종) 등록 및 수정 이력 관리
  3. 양방향/비순차 완주 인증 및 다중 중단점(이어걷기) 기록
  4. 시니어 친화적 UI/UX (밝은 테마, 큰 폰트, 3단계 선형 네비게이션, 단일 화면 일체형 모달)

---

## 2. 지금까지 완료된 작업 내역 (2026-10-27)
1. **Grill-Me 심층 인터뷰 및 세부 설계 사양서 승인 완료**:
   - 사양서 위치: `G:\내 드라이브\all\Private\obsidian\Luke\20_Tech & Hobby\agentic\동서트레일 가이드 ewtguide 시스템 설계 사양서.md`
2. **숲나들e 포털 32개 공식 구간 전수 크롤링 완료**:
   - 스크립트: `scripts/crawl_foresttrip.py`
   - 수집 결과: `scripts/foresttrip_sections.json` (1~14구간, 20~22구간, 32~36구간, 46~55구간 총 32개 구간 거리, 코스 경로, 관할 지역, 공공시설 67개소)
3. **원본 GPX 노선 정밀 분석 완료**:
   - 원본 파일: `동서트레일 32개 구간 GPX_노선도 파일.gpx` (37,386 포인트 / 79개 세그먼트 / 해발 고도 태그 정상 보유)
   - 분석 스크립트: `scripts/analyze_gpx_segments.py`
   - 서쪽 샛별해변 ~ 동쪽 망양정해수욕장 간 32개 공식 구간 거리 매칭 확인 완료.

---

## 3. 바로 이어서 진행할 작업 (Next Steps)
1. **RDP(epsilon = 3m) 파이썬 전처리 스크립트 실행 (`scripts/process_gpx.py`)**:
   - 37,386 포인트를 3m 허용오차로 단순화하여 `public/data/sections/section_{id}.json` 생성
2. **Vite + React 19 + TypeScript + Tailwind CSS 프로젝트 초기화**:
   - `package.json`, `vite.config.ts`, `tailwind.config.js` 구성
   - 카카오맵 JavaScript API 연동 (`VITE_KAKAO_MAP_API_KEY`)
3. **3단계 선형 네비게이션 UI 구축**:
   - [구간 리스트] ➔ [구간 상세 (고도표, 콜택시, 시설)] ➔ [전체화면 카카오 지도]
