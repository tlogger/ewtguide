# 동서트레일 가이드 (ewtguide) 프로젝트 현황 및 작업 인수인계서

## 1. 프로젝트 개요
- **서비스명**: 동서트레일 가이드 (ewtguide; East-West Trail Guide)
- **로컬 작업 경로**: `c:\Users\luke\Projects\ewtguide`
- **프로덕션 라이브 주소**: `https://ewtguide.vercel.app`
- **모바일 앱 산출물**: `public/ewtguide.apk` (Vercel 웹 호스팅 및 원클릭 다운로드 지원)
- **주요 기능**:
  1. 32개 개통 구간 정밀 노선 오버레이 (RDP 3m 압축) 및 오픈 DEM 보정 고도 프로필
  2. 전국 55개 전 구간(개통 32개 + 미개통 23개) 조망 대지도 (`AllSectionsMapView`)
  3. 숲나들e 공공 데이터 + Supabase 기반 위키형 사용자 편의시설(9개 카테고리) 등록, 수정, 삭제 및 인접 구간 POI 실시간 동기화
  4. 양방향/비순차 완주 인증 및 다중 중단점(이어걷기) 영구 기록
  5. 경로 이탈 시뮬레이션 및 50m 초과 실시간 경보음(Web Audio API) 시스템
  6. 시니어 친화적 3단계 선형 네비게이션 UI (고대비, 큰 터치 타깃, 모바일 뷰포트 동적 최적화)
  7. Capacitor 8 기반 안드로이드 모바일 앱 및 Chrome Custom Tabs + 딥링크 소셜 로그인(Kakao, Naver, Google)

---

## 2. 완료된 전체 작업 내역 (16대 마일스톤)

1. **Grill-Me 심층 인터뷰 및 세부 설계 사양서 승인 (2026-10-27)**:
   - 사양서: `G:\내 드라이브\all\Private\obsidian\Luke\20_Tech & Hobby\agentic\동서트레일 가이드 ewtguide 시스템 설계 사양서.md`
2. **숲나들e 포털 32개 공식 구간 전수 크롤링 완료 (2026-10-27)**:
   - 스크립트: `scripts/crawl_foresttrip.py` / 결과: `scripts/foresttrip_sections.json` (메타데이터 및 공공시설 67개소)
3. **GPX 노선 정밀 분석 및 4개 클러스터 연결망 검증 (2026-10-27)**:
   - 원본 GPX (37,386 포인트 / 79개 세그먼트) ➔ 서해(태안) ~ 동해(울진) 4개 클러스터 분할
4. **RDP(epsilon = 3m) 좌표 압축 및 오픈 DEM 고도 결측치 보정 (2026-10-27)**:
   - 10,133개 최적화 좌표 추출 및 누적 상승/하강 고도 (+m / -m) 완전 추출 완료
5. **Vite + React + TypeScript + Tailwind CSS 3단계 선형 네비게이션 구축 (2026-10-27)**:
   - `SectionListView`, `SectionDetailView`, `TrailMapView`, `CertificationModal`, `FacilityModal`
6. **전국 55개 전 구간 데이터셋 일원화 및 55개 코스 대지도 뷰어 탑재 (2026-10-27)**:
   - 미개통 23개 구간 점선 표기, AllTrails 스타일 트레일 라인, Munter/Tobler 보행시간 공식 적용
7. **안드로이드 네이티브 모바일 앱 (Capacitor + Gradle) 빌드 파이프라인 (2026-10-31)**:
   - Capacitor 8 연동, GPS 및 Cleartext 권한 구성, `npm run build:apk` 스크립트 추가
8. **지도 UI 최적화 및 상태 쿠키 영구 보전 (2026-10-31)**:
   - 지도 스케일바 상단 배치, 화장실 남녀 표준 픽토그램, 365일 지도/고도 쿠키 보전, 상세/지도 직행 버튼
9. **웹 배포 디렉토리 내 APK 호스팅 및 다운로드 배너 연동 (2026-10-31)**:
   - `public/ewtguide.apk` 배치 및 리스트 뷰 하단 다운로드 배너 구현
10. **모바일 소셜 로그인 Chrome Custom Tabs + Deep Link 아키텍처 개통 (2026-10-31)**:
    - 구글 403 차단 우회, 카카오/네이버 도메인 불일치 해결, `com.ewtguide.app://oauth` 딥링크 핸들러
11. **모바일 내비게이션 터치 제스처 개선 및 경로 이탈 Test 모드 구축 (2026-11-03)**:
    - 고도 차트 터치 고정, 인접 4개 구간 색상별 표출, 경로 이탈 경보 비프음(Web Audio API), 모바일 가용 캔버스 동적 추적
12. **타이틀 바 콤보박스 재배치 및 지도 검색창 너비 극대화 (2026-11-03)**:
    - 구간 선택을 상단 헤더(`Header.tsx`)로 상향 이동, 지도 검색창 시인성 개선
13. **인접 구간 시설 POI의 Supabase 클라우드 실시간 동기화 (2026-11-04)**:
    - 인접 구간 편의시설 실시간 로드 및 수정·삭제 시 해당 `section_id` 정밀 라우팅
14. **태극 화살표 S곡선 모던 머티리얼 심볼 아이콘 디자인 (2026-11-04)**:
    - 동(빨강)·서(파랑) 화살표 형상화, `EastWestIcon.tsx`, `favicon.svg`, `public/logo.svg` 교체
15. **Canva MCP 기반 서비스 소개 프레젠테이션(PT) 8슬라이드 제작 (2026-11-04)**:
    - Design ID: `DAHZ6J6A1Yw` (https://canva.link/5rwg5kxoc1qfevn)
16. **Vercel 프로덕션 마이그레이션 및 소셜 로그인 콜백 전면 하드닝 (2026-11-04)**:
    - `ewtguide.vercel.app` 이전, SPA rewrite 구성, 구 GitHub Pages 콜백 영구 파기 및 Vercel Lock
17. **CodeRabbit 정밀 코드 리뷰 기반 결함 전수 해결 및 DB·배치 파이프라인 하드닝 (2026-11-11)**:
    - 대피소 팝업 배지 및 `SELECTABLE_CATEGORIES` 지원, 목표 POI 식별 키 통합(`getFacilityKey`), 고도표 타이머 stale 클로저 및 언마운트 누수 차단
    - 첫 화면 모바일 뷰포트 최적화(`h-dvh`, Safe Area), 33/47/52/2구간 POI 중복·오염 데이터 무결성 복원
    - `update_shelters_info.cjs`: 퍼지 매칭 제거, 1:1 ID 매핑, `--dry-run` 모드 및 Supabase 페이징 기반 사용자 위키 편집본 보호 로직 탑재

---

## 3. 핵심 기술 과제 및 차기 로드맵 (Next Steps)
1. **산악 통신 음영 대비 오프라인 타일 프리패치**:
   - Leaflet 기반 오프라인 타일 캐시(CacheStorage/IndexedDB) 연동
2. **23개 미개통 구간 실측 트랙 보강**:
   - 지자체 임도 개통 고시 모니터링 및 2차 GPX 확보
3. **Supabase RLS 보안 및 위키 어뷰징 방지**:
   - 익명 편집 쿼터 제한 및 시설 수정 롤백 스냅샷 자동 트리거
4. **Google Play Console 정식 배포**:
   - 서명 키스토어 생성 및 스토어 심사 등록
