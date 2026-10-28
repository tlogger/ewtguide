export interface TrailPoint {
  lat: number;
  lng: number;
  ele: number;
  dist: number; // cumulative distance in km from start
}

export type FacilityCategory = 
  | 'viewpoint'    // 관광지 / 뷰포인트 / 명소 (NEW)
  | 'shelter'      // 쉼터 / 정자
  | 'toilet'       // 화장실
  | 'restaurant'   // 식당 / 카페
  | 'lodging'      // 숙소 / 민박 / 야영장
  | 'mart'         // 마트 / 편의점
  | 'transport'    // 대중교통 / 콜택시
  | 'cert_center'  // 인증센터 / 안내소
  | 'other';       // 기타 / 위험지역

export interface POI {
  id?: string;
  name: string;
  category: FacilityCategory;
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
