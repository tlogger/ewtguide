# 🌲 동서트레일 가이드 (ewtguide)

> 한반도를 동서로 횡단하는 대한민국 대표 숲길 **'동서트레일(East-West Trail)'** 32개 조성 구간의 트레커를 위한 직관적인 반응형 가이드 웹 서비스입니다.

---

## 🛠️ 기술 스택
- **Frontend**: Vite, React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Map & Geo**: Kakao Maps JavaScript API, Ramer-Douglas-Peucker (RDP 3m), Haversine Cross-track Distance
- **Backend / Database**: Supabase (PostgreSQL + RLS) - 위키형 이력 보존 및 다중 중단점/완주 관리
- **Offline**: PWA Service Worker (CacheStorage & IndexedDB)
- **Deployment**: GitHub Pages (`https://<username>.github.io/ewtguide`)

---

## 📂 프로젝트 구조
```
c:/work/ewtguide/
├── 동서트레일 32개 구간 GPX_노선도 파일.gpx   # 원본 32개 구간 GPX 트랙 파일
├── scripts/
│   ├── crawl_foresttrip.py               # 숲나들e 32개 구간 공식 정보 크롤러
│   ├── foresttrip_sections.json          # 수집된 32개 구간 공식 데이터셋
│   ├── analyze_gpx_segments.py           # GPX 세그먼트 분석기
│   └── process_gpx.py                    # RDP 3m 구간 분할 및 고도 JSON 빌더 (진행 예정)
├── PROJECT_STATUS.md                     # 세부 진행 현황 및 인수인계 문서
└── README.md                             # 프로젝트 개요
```
