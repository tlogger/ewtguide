export interface TrailPoint {
  lat: number;
  lng: number;
  ele: number;
  dist: number; // cumulative distance in km from start
}

export type FacilityCategory = 
  | 'lodging'      // 숙소
  | 'restaurant'   // 식당
  | 'mart'         // 마트/편의점
  | 'toilet'       // 화장실
  | 'shelter'      // 쉼터/정자
  | 'cert_center'  // 인증센터/안내소
  | 'transport'    // 대중교통/콜택시
  | 'other';       // 기타

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
  is_official?: boolean;
  created_at?: string;
}

export interface SectionSummary {
  section_id: number;
  section_number: string; // e.g. "1구간"
  title: string;
  region: string;
  course: string;
  official_distance_km: number;
  actual_distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  min_elevation_m: number;
  max_elevation_m: number;
  start_point: { lat: number; lng: number };
  end_point: { lat: number; lng: number };
  pois_count: number;
  points_count: number;
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
