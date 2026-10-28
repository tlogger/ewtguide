-- ==============================================================================
-- 동서트레일 가이드 (ewtguide) 전 구간 편의시설 및 명소 중앙 공유 DB 스키마
-- 테이블: public.ewt_facilities
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ewt_facilities (
    id VARCHAR(100) PRIMARY KEY,                         -- 고유 ID (예: 'fac_1730000000000' 또는 'p_1_0')
    section_id INTEGER NOT NULL,                        -- 트레일 구간 번호 (1~55)
    name VARCHAR(200) NOT NULL,                         -- 시설/명소 명칭
    category VARCHAR(50) NOT NULL,                      -- 'viewpoint'|'shelter'|'toilet'|'restaurant'|'lodging'|'mart'|'transport'|'cert_center'|'other'
    lat DOUBLE PRECISION NOT NULL,                      -- 위도
    lng DOUBLE PRECISION NOT NULL,                      -- 경도
    phone VARCHAR(100),                                 -- 연락처/전화번호
    business_hours VARCHAR(200),                        -- 운영 시간
    memo TEXT,                                          -- 메모 / 상세 설명 / 팁
    photo_url TEXT,                                     -- 사진 데이터 (Base64 JPEG 또는 클라우드 URL)
    is_official BOOLEAN DEFAULT false,                  -- 공식 시설 여부
    is_deleted BOOLEAN DEFAULT false,                   -- 삭제 여부 (공식 시설 은닉 등)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 등록 일시
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()   -- 최종 수정 일시
);

-- 구간별 조회 및 삭제 필터링 가속 인덱스
CREATE INDEX IF NOT EXISTS idx_ewt_facilities_section 
ON public.ewt_facilities (section_id, is_deleted);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.ewt_facilities ENABLE ROW LEVEL SECURITY;

-- 모든 사용자에게 읽기(SELECT) 전체 허용
CREATE POLICY "Allow public read access on ewt_facilities" 
ON public.ewt_facilities 
FOR SELECT 
USING (true);

-- 모든 사용자에게 등록/수정/삭제(ALL) 전체 허용 (익명 위키형 공유)
CREATE POLICY "Allow public all access on ewt_facilities" 
ON public.ewt_facilities 
FOR ALL 
USING (true) 
WITH CHECK (true);
