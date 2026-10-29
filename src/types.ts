export interface TrailPoint {
  lat: number;
  lng: number;
  ele: number;
  dist: number; // cumulative distance in km from start
}

export type FacilityCategory = 
  | 'viewpoint'    // 명소 (구 뷰포인트/명소)
  | 'toilet'       // 화장실
  | 'restaurant'   // 음식료 (구 식당/카페)
  | 'lodging'      // 숙소/야영 (구 숙소/야영장)
  | 'mart'         // 마트 (구 마트/편의점)
  | 'transport'    // 교통 (구 교통/콜택시)
  | 'cert_center'  // 안내소 (구 인증/안내소)
  | 'other'        // 기타 (구 기타/주의지점)
  | 'shelter';     // 구 쉼터/정자 (하위 호환 유지)

export interface POI {
  id?: string;
  name: string;
  category: FacilityCategory;
  categories?: FacilityCategory[]; // 다중 카테고리 지원
  description?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  business_hours?: string;
  memo?: string;
  photo_url?: string; // Base64 or URL
  is_official?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type AuthProvider = 'google' | 'kakao' | 'naver';

export interface UserAccount {
  id: string;
  provider: AuthProvider;
  provider_user_id: string;
  email?: string | null;
  name?: string | null;
  profile_image?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  created_at?: string | null;
  last_login_at?: string | null;
}

export interface SectionSummary {
  section_id: number;
  section_number: string; // e.g. "1구간"
  title: string;
  region: string;
  course: string;
  start_name?: string;
  end_name?: string;
  is_opened: boolean; // 개통 여부 (true: 개통 32개, false: 미개통 23개)
  official_distance_km: number;
  actual_distance_km?: number;
  calculated_distance_km?: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  min_elevation_m?: number;
  max_elevation_m?: number;
  hiking_time_hours?: number;
  hiking_time_text?: string;
  start_point?: { lat: number; lng: number };
  end_point?: { lat: number; lng: number };
  pois_count?: number;
  poi_count?: number;
  points_count?: number;
}

export interface SectionDetail extends SectionSummary {
  pois: POI[];
  points: TrailPoint[];
}

export interface Checkpoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  timestamp: string;
  memo?: string;
}

export interface TrekProgress {
  completedSections: number[]; // section_ids
  checkpoints: Record<number, Checkpoint[]>; // section_id -> checkpoints
}
