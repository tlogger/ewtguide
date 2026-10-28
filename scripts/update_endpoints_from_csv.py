"""
동서트레일 55개 구간 시·종점 수동 편집 반영 스크립트
사용자가 '동서트레일_55개구간_시종점_목록.csv' 파일의 위도/경도/명칭/주소를 수정한 후
이 스크립트를 실행하면 웹서비스 데이터(JSON)에 즉시 반영됩니다.

사용법:
  uv run python scripts/update_endpoints_from_csv.py
"""

import csv
import json
import os
import math
import srtm

geo_elevation_data = srtm.get_data()

CSV_PATH = '동서트레일_55개구간_시종점_목록.csv'
SECTIONS_DIR = 'public/data/sections'
SUMMARY_PATH = 'public/data/sections_summary.json'
OVERVIEW_PATH = 'public/data/all_sections_overview.json'

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

def get_ele(lat, lng, fallback=50.0):
    try:
        e = geo_elevation_data.get_elevation(lat, lng)
        if e is not None and not math.isnan(e) and e > -50:
            return round(float(e), 1)
    except:
        pass
    return fallback

def update_from_csv():
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found.")
        return

    with open(CSV_PATH, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Loaded {len(rows)} sections from {CSV_PATH}")

    overview_sections = []

    for row in rows:
        sid = int(row['구간ID'])
        section_path = os.path.join(SECTIONS_DIR, f'section_{sid}.json')
        if not os.path.exists(section_path):
            continue

        with open(section_path, encoding='utf-8') as f:
            sec_data = json.load(f)

        new_s_lat = float(row['시점_위도(Lat)'])
        new_s_lng = float(row['시점_경도(Lng)'])
        new_e_lat = float(row['종점_위도(Lat)'])
        new_e_lng = float(row['종점_경도(Lng)'])

        pts = sec_data.get('points', [])
        if pts:
            # Update first point
            pts[0]['lat'] = new_s_lat
            pts[0]['lng'] = new_s_lng
            pts[0]['ele'] = get_ele(new_s_lat, new_s_lng, pts[0].get('ele', 50.0))
            pts[0]['dist'] = 0.0

            # Update last point
            pts[-1]['lat'] = new_e_lat
            pts[-1]['lng'] = new_e_lng
            pts[-1]['ele'] = get_ele(new_e_lat, new_e_lng, pts[-1].get('ele', 50.0))

            # Recalculate cumulative distance
            cum_dist = 0.0
            for i in range(1, len(pts)):
                d = haversine(pts[i-1]['lat'], pts[i-1]['lng'], pts[i]['lat'], pts[i]['lng'])
                cum_dist += d
                pts[i]['dist'] = round(cum_dist, 2)

            sec_data['calculated_distance_km'] = round(cum_dist, 1)

        sec_data['start_point'] = {
            'lat': new_s_lat,
            'lng': new_s_lng,
            'name': row.get('시점_명칭', ''),
            'address': row.get('시점_주소', '')
        }
        sec_data['end_point'] = {
            'lat': new_e_lat,
            'lng': new_e_lng,
            'name': row.get('종점_명칭', ''),
            'address': row.get('종점_주소', '')
        }

        # Save section json
        with open(section_path, 'w', encoding='utf-8') as f:
            json.dump(sec_data, f, ensure_ascii=False, indent=2)

        # Update overview entry
        overview_sections.append({
            'section_id': sid,
            'section_number': sec_data['section_number'],
            'title': sec_data['title'],
            'region': sec_data['region'],
            'is_opened': sec_data['is_opened'],
            'official_distance_km': sec_data['official_distance_km'],
            'start_point': sec_data['start_point'],
            'end_point': sec_data['end_point'],
            'path': [{'lat': p['lat'], 'lng': p['lng']} for p in pts]
        })

    # Save overview
    with open(OVERVIEW_PATH, 'w', encoding='utf-8') as f:
        json.dump(overview_sections, f, ensure_ascii=False)

    print("Successfully updated all section JSON files and overview map dataset!")

if __name__ == '__main__':
    update_from_csv()
