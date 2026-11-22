# Changelog

All notable changes to **동서트레일 가이드 (ewtguide)** are documented in this file.

## [2026-11-22] — v2 아키텍처 개편 (Phase 1A & Phase 1B 완료)
- **Phase 1A (3-Tier CDN/캐시 POI & Base64 원천 차단)**:
  - `api/pois.ts`: `GET /api/pois` 단일 스냅샷 Edge CDN 프록시(`s-maxage=300, SWR=86400`, `Range` 1,000행 페이지네이션, `ETag`/304, `Access-Control-Expose-Headers: ETag, Date`).
  - `api/upload-photo.ts`: `OPTIONS` CORS + fail-fast 검증(`Content-Type` → ≤300KB → WebP/JPEG 매직 바이트 → `user_accounts` UUID) + Vercel Blob 직접 저장.
  - `poiRepository.ts` & `facilityDb.ts`: `local | cdn` 2모드(`VITE_POI_DATA_MODE=local` 시 `@supabase/supabase-js` 미로드·요청 0건), L1 60초 TTL + 서버 `updated_at` 기반 `pendingOverrides` + 실패 롤백 + Base64 저장 차단.
  - `vercel.json` `"/((?!api/).*)"` 수정, `supabase/schema_ewt_facilities.sql` Base64 `CHECK` 제약 추가, k6 부하테스트 스크립트(`k6_baseline_10vu.js`, `k6_pois_cdn.js`) 및 Vitest 단위 테스트 추가.
- **Phase 1B (55개 전 구간 통합 지도 UX & 오프라인 폴백)**:
  - `scripts/build_static_indexes.mjs`: `public/data/all_official_pois.json`(64개 공식 POI, 49.3KB) 추출 및 `all_sections_overview.json` 경량화(1128.5KB → 433.7KB).
  - `src/domain/trailGraph.ts`: 55개 구간 1D `trailKm` 인덱스, 50m 히스테리시스, 미개통 23개 구간 `null` 가드, 목적지 탭 자동 정/역 방향·이탈 분리 거리·Munter/Tobler ETA 엔진 구현.
  - `UnifiedMapView` + `MapCanvas` + `OfflineHudView` + `NavigationHud` + `ElevationDrawer` + `SectionDetailSheet` 분해 구축, 웹 전용 PWA Service Worker(`dist/sw.js`) 활성화, 레거시 3개 뷰(`TrailMapView`, `AllSectionsMapView`, `SectionListView`) 삭제 및 `Header` 구간 탐색·완주율·APK 드로어 통합.

## [2026-11-17] — 전체 코드베이스 정밀 리뷰
- **아키텍처·품질 진단**: `tsc --noUnusedLocals --noUnusedParameters` 및 로컬 LLM 배치 스캔을 통해 미사용 심볼 21건 검출 및 성능·안정성 개선 로드맵 도출.

## [2026-11-11 ~ 2026-11-14] — CodeRabbit 결함 10건 해결 & 배포 정책 확립
- **배포 거버넌스 (`60350ca`)**: Post-Commit 자동 배포 훅 제거 및 사용자 요청 기반 수동 배포 체계 확립.
- **CodeRabbit 결함 10건 전수 해결 (`b499e75`)**:
  - 대피소 팝업 배지 및 `SELECTABLE_CATEGORIES` 지원, `getFacilityKey` 통합, 고도표 타이머 stale 클로저 및 언마운트 누수 차단.
  - 첫 화면 모바일 뷰포트(`h-dvh`, Safe Area) 최적화, 33/47/52/2구간 POI 중복·오염 데이터 복원.
  - `update_shelters_info.cjs`: 1:1 ID 매핑, `--dry-run` 지원, 사용자 위키 편집본 보호 로직 탑재.

## [2026-11-04 ~ 2026-11-05] — Vercel 마이그레이션, OAuth 하드닝, 브랜드·PT 제작
- **Vercel 프로덕션 이전 (`8023561`, `19a440d`)**: `ewtguide.vercel.app` 마이그레이션, SPA rewrite 설정, 카카오/네이버/구글 리다이렉트 URI 강제 고정 및 구 `tlogger` LocalStorage 잔재 제거.
- **인접 POI Supabase 연동 (`b101c05`)**: 인접 구간 편의시설 실시간 로드 및 수정·삭제 `section_id` 정밀 라우팅.
- **브랜드 & 홍보 (`508b970`)**: 태극 화살표 머티리얼 심볼(`EastWestIcon`, `favicon.svg`) 적용 및 Canva MCP 8슬라이드 서비스 소개 PT(`DAHZ6J6A1Yw`) 제작.

## [2026-11-03] — 모바일 터치·인접 4개 구간·경로 이탈 경보 구축
- **모바일 UX (`668c6a6`, `a7d4432`, `1526d10`)**: 고도표 터치 포인팅 버그 해결, 고도 드래그 네온 강조, 구간 선택 콤보박스 헤더 이동 및 검색창 확장, 모바일 가용 캔버스 동적 추적.
- **인접 구간 & 이탈 경보**: 인접 4개 구간(`N-2~N+2`) 색상별 트레일·POI 표출, 경로 이탈 Test 모드(`<- 156m`) 및 50m 초과 Web Audio 비프 경보(30초 주기) 구축.

## [2026-10-31] — Android APK 패키징 & Chrome Custom Tabs 소셜 로그인
- **Capacitor 8 APK (`3c825e1`)**: Android 앱 빌드 파이프라인 구축 및 웹 `public/ewtguide.apk` 다운로드 배너 호스팅.
- **모바일 소셜 로그인 (`571a73e`)**: Chrome Custom Tabs + 딥링크(`com.ewtguide.app://oauth`)로 구글 WebView 403 차단 우회.
- **지도 UI/쿠키 (`9e01799`)**: 스케일 바 상시 상단 배치, 화장실 표준 픽토그램, 365일 지도/고도 상태 쿠키 보전.

## [2026-10-27] — 프로젝트 출범 (v1.0) & 전국 55개 구간 대지도
- **기획·데이터 파이프라인**: Grill-Me 인터뷰 기반 설계 사양서 확정, 숲나들e 32개 구간 크롤링, GPX(37,386pt) RDP 3m 압축(10,133pt) 및 오픈 DEM 고도 보정.
- **웹앱 & 대지도 구축**: Vite+React+TS 3단계 선형 네비게이션, 전국 55개 구간(개통 32 + 미개통 23) 대지도, Munter/Tobler 보행시간 공식, 위키형 편의시설 DB 및 양방향 완주 인증 구현.
