-- ==============================================================================
-- 동서트레일 가이드 (ewtguide) 통합 DB 스키마
-- 테이블: public.user_accounts (소셜 OAuth2 계정 및 토큰 보전)
-- 테이블: public.ewt_facilities (다중 카테고리 지원 편의시설/명소 중앙 공유 DB)
-- ==============================================================================

-- 1. 회원 계정 및 소셜 OAuth2 토큰 보전 테이블
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(20) NOT NULL,                        -- 'google' | 'kakao' | 'naver'
    provider_user_id VARCHAR(100) NOT NULL,              -- 소셜 고유 식별자 ID
    email VARCHAR(200),                                   -- 사용자 이메일
    name VARCHAR(100),                                    -- 이름/닉네임
    profile_image TEXT,                                   -- 프로필 사진 URL
    access_token TEXT,                                    -- OAuth2 Access Token
    refresh_token TEXT,                                   -- OAuth2 Refresh Token
    token_expires_at TIMESTAMP WITH TIME ZONE,            -- 토큰 만료 일시
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),    -- 가입 신청 일시
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 최종 로그인 일시
    UNIQUE(provider, provider_user_id)
);

-- 2. 편의시설/명소 공유 테이블 (다중 카테고리 지원)
CREATE TABLE IF NOT EXISTS public.ewt_facilities (
    id VARCHAR(100) PRIMARY KEY,                         -- 결정론적 고유 ID
    section_id INTEGER NOT NULL,                        -- 트레일 구간 번호 (1~55)
    name VARCHAR(200) NOT NULL,                         -- 시설/명소 명칭
    category VARCHAR(50) NOT NULL,                      -- 대표 기본 카테고리 (하위 호환)
    categories TEXT[] NOT NULL DEFAULT '{}',            -- 다중 카테고리 목록
    lat DOUBLE PRECISION NOT NULL,                      -- 위도
    lng DOUBLE PRECISION NOT NULL,                      -- 경도
    phone VARCHAR(100),                                 -- 연락처/전화번호
    business_hours VARCHAR(200),                        -- 운영 시간
    memo TEXT,                                          -- 메모 / 상세 설명 / 팁
    photo_url TEXT,                                     -- 사진 데이터 (Base64 JPEG 또는 클라우드 URL)
    registered_by UUID REFERENCES public.user_accounts(id) ON DELETE SET NULL, -- 등록자
    is_official BOOLEAN DEFAULT false,                  -- 공식 시설 여부
    is_deleted BOOLEAN DEFAULT false,                   -- 영구 삭제 여부
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 등록 일시
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()   -- 최종 수정 일시
);

-- 구간별 조회 및 삭제 필터링 가속 인덱스
CREATE INDEX IF NOT EXISTS idx_ewt_facilities_section 
ON public.ewt_facilities (section_id, is_deleted);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ewt_facilities ENABLE ROW LEVEL SECURITY;

-- 모든 사용자에게 user_accounts 읽기/쓰기 허용 (OAuth 가입/로그인 동기화)
DROP POLICY IF EXISTS "Allow public all on user_accounts" ON public.user_accounts;
CREATE POLICY "Allow public all on user_accounts" 
ON public.user_accounts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 모든 사용자에게 ewt_facilities 읽기/쓰기 전체 허용 (위키형 트레일 정보 공유)
DROP POLICY IF EXISTS "Allow public all access on ewt_facilities" ON public.ewt_facilities;
CREATE POLICY "Allow public all access on ewt_facilities" 
ON public.ewt_facilities 
FOR ALL 
USING (true) 
WITH CHECK (true);
