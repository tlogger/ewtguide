import xml.etree.ElementTree as ET
import json
import os
import math
import srtm

CACHE_FILE = 'scripts/elevation_cache.json'
geo_elevation_data = srtm.get_data()

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

def rdp_local(points, epsilon=2.0):
    """
    Ramer-Douglas-Peucker simplification with exact metric tolerance epsilon (meters).
    """
    if len(points) < 3:
        return points
    mid_lat = math.radians(points[len(points)//2][0])
    kx = 111320.0 * math.cos(mid_lat)
    ky = 110540.0
    pts_m = [(p[1] * kx, p[0] * ky) for p in points]

    def rdp_recursive(start_idx, end_idx):
        if end_idx <= start_idx + 1:
            return [start_idx]
        ax, ay = pts_m[start_idx]
        bx, by = pts_m[end_idx]
        dx, dy = bx - ax, by - ay
        line_len = math.hypot(dx, dy)
        max_dist = 0.0
        max_idx = start_idx
        if line_len == 0.0:
            for i in range(start_idx + 1, end_idx):
                d = math.hypot(pts_m[i][0] - ax, pts_m[i][1] - ay)
                if d > max_dist:
                    max_dist = d
                    max_idx = i
        else:
            inv_len = 1.0 / line_len
            for i in range(start_idx + 1, end_idx):
                px, py = pts_m[i]
                d = abs(dx * (ay - py) - (ax - px) * dy) * inv_len
                if d > max_dist:
                    max_dist = d
                    max_idx = i
        if max_dist > epsilon:
            return rdp_recursive(start_idx, max_idx) + rdp_recursive(max_idx, end_idx)
        else:
            return [start_idx]

    idx_list = rdp_recursive(0, len(points) - 1)
    idx_list.append(len(points) - 1)
    unique_indices = []
    seen = set()
    for idx in idx_list:
        if idx not in seen:
            unique_indices.append(idx)
            seen.add(idx)
    return [points[i] for i in unique_indices]

def calc_hiking_time(dist_km, gain_m, loss_m):
    # Tobler-like trail hiking time: distance at 3.5km/h, +1h per 400m ascent, +1h per 800m descent
    hours_float = (dist_km / 3.5) + (gain_m / 400.0) + (loss_m / 800.0)
    total_minutes = int(round(hours_float * 60))
    h = total_minutes // 60
    m = total_minutes % 60
    text = f"{h}시간 {m}분" if (h > 0 and m > 0) else (f"{h}시간" if h > 0 else f"{m}분")
    return {
        "hiking_time_hours": round(hours_float, 1),
        "hiking_time_text": text
    }

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False)

def fetch_elevations_cached(pairs, cache):
    results = [None] * len(pairs)
    last_valid = 50.0

    for i, (lat, lng) in enumerate(pairs):
        key = f"{lat:.5f},{lng:.5f}"
        if key in cache:
            results[i] = cache[key]
            last_valid = cache[key]
            continue

        val = None
        try:
            ele = geo_elevation_data.get_elevation(lat, lng)
            if ele is not None and not math.isnan(ele) and ele > -50:
                val = round(float(ele), 1)
        except Exception:
            pass

        if val is None:
            val = last_valid
        else:
            last_valid = val

        results[i] = val
        cache[key] = val

    return results

def main():
    print("=== Step 1: Loading GPX Segments & Anchors ===")
    tree = ET.parse('동서트레일 32개 구간 GPX_노선도 파일.gpx')
    root = tree.getroot()
    ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
    trk = root.find('gpx:trk', ns)
    segs = trk.findall('gpx:trkseg', ns)

    def get_seg_pts(idx):
        s = segs[idx - 1]
        return [(float(p.attrib['lat']), float(p.attrib['lon'])) for p in s.findall('gpx:trkpt', ns)]

    with open('scripts/anchors_geocoded.json', 'r', encoding='utf-8') as f:
        anchors_list = json.load(f)
    anchors = {a['id']: a for a in anchors_list}

    # Section anchor names mapping
    SECTION_ANCHOR_NAMES = {
        1: ("안면도 자연휴양림", "백사장항"),
        2: ("백사장항", "몽산포해수욕장"),
        3: ("몽산포해수욕장", "태안읍행정복지센터"),
        4: ("태안읍행정복지센터", "상담교"),
        5: ("상담교", "율목리마을"),
        6: ("율목리마을", "삼웅2리마을회관"),
        7: ("삼웅2리마을회관", "용현리"),
        8: ("용현리", "충의사"),
        9: ("충의사", "이응노생가기념관"),
        10: ("이응노생가기념관", "내포문화숲길홍성센터"),
        11: ("내포문화숲길홍성센터", "오서산상담마을"),
        12: ("오서산상담마을", "대현1리마을회관"),
        13: ("대현1리마을회관", "위라1리마을회관"),
        14: ("위라1리마을회관", "대룡1리"),
        20: ("봉산동버스기점", "삼정생태공원"),
        21: ("삼정생태공원", "대청호자연생태관"),
        22: ("대청호자연생태관", "와정삼거리"),
        32: ("태성리", "삼풍리"),
        33: ("삼풍리", "하내리"),
        34: ("하내리", "수예리마을회관"),
        35: ("수예리마을회관", "모정동"),
        36: ("모정동", "이목리"),
        46: ("의풍1리마을회관", "오전약수관광지주차장"),
        47: ("오전약수관광지주차장", "애당교"),
        48: ("애당교", "춘양면사무소"),
        49: ("춘양면사무소", "현동삼거리"),
        50: ("현동삼거리", "분천역"),
        51: ("분천역", "원곡교"),
        52: ("원곡교", "소광리"),
        53: ("소광리", "두천1리"),
        54: ("두천1리", "중섬교"),
        55: ("중섬교", "망양정해수욕장")
    }

    # Extract 32 opened tracks with exact point-continuity (End(N) == Start(N+1))
    opened_tracks = {}

    # 1구간: Seg 3 (pt 264..579)
    seg3 = get_seg_pts(3)
    opened_tracks[1] = seg3[264:580]

    # 2구간: Seg 1
    opened_tracks[2] = get_seg_pts(1)

    # 3, 4, 5구간: Seg 2 (cut points: 418 for 3/4, 908 for 4/5)
    pts2 = get_seg_pts(2)
    opened_tracks[3] = pts2[58:419]
    opened_tracks[4] = pts2[418:909]
    opened_tracks[5] = pts2[908:2314]

    # 6구간: Seg 4..22
    pts6 = []
    for si in [4, 5, 6, 10, 14, 20, 21, 22]:
        pts6.extend(get_seg_pts(si))
    opened_tracks[6] = pts6

    # 7 ~ 13구간: Seg 23
    pts23 = get_seg_pts(23)
    opened_tracks[7] = pts23[2:1293]
    opened_tracks[8] = pts23[1292:2183]
    opened_tracks[9] = pts23[2182:2616]
    opened_tracks[10] = pts23[2615:2937]
    opened_tracks[11] = pts23[2936:3357]
    opened_tracks[12] = pts23[3356:4185]
    opened_tracks[13] = pts23[4184:]

    # 14구간: Seg 24, 26, 29, 30, 33, 41, 52, 57, 63
    pts14 = []
    for si in [24, 26, 29, 30, 33, 41, 52, 57, 63]:
        pts14.extend(get_seg_pts(si))
    opened_tracks[14] = pts14

    # 20 ~ 22구간: Seg 68
    pts68 = get_seg_pts(68)
    opened_tracks[20] = pts68[239:1103]
    opened_tracks[21] = pts68[1102:2845]
    opened_tracks[22] = pts68[2844:]

    # 32 ~ 36구간: Seg 69..73
    opened_tracks[32] = get_seg_pts(69)
    opened_tracks[33] = get_seg_pts(70)
    opened_tracks[34] = get_seg_pts(71)
    opened_tracks[35] = list(reversed(get_seg_pts(72)))
    opened_tracks[36] = get_seg_pts(73)

    # 46구간: Seg 74
    opened_tracks[46] = get_seg_pts(74)

    # 47 ~ 49구간: Seg 77
    pts77 = get_seg_pts(77)
    opened_tracks[47] = pts77[283:1177]
    opened_tracks[48] = pts77[1176:1628]
    opened_tracks[49] = pts77[1627:]

    # 50 ~ 55구간: Seg 78
    pts78 = get_seg_pts(78)
    opened_tracks[50] = pts78[180:863]
    opened_tracks[51] = pts78[862:1398]
    opened_tracks[52] = pts78[1397:4146]
    opened_tracks[53] = pts78[4145:7936]
    opened_tracks[54] = pts78[7935:8579]
    opened_tracks[55] = pts78[8578:10119]

    # Verify continuity for connected segments:
    print("=== Checking Cut Point Continuity ===")
    pairs_to_check = [
        (3, 4), (4, 5), (7, 8), (8, 9), (9, 10), (10, 11), (11, 12), (12, 13),
        (20, 21), (21, 22), (47, 48), (48, 49),
        (50, 51), (51, 52), (52, 53), (53, 54), (54, 55)
    ]
    for p1, p2 in pairs_to_check:
        end_p1 = opened_tracks[p1][-1]
        start_p2 = opened_tracks[p2][0]
        dist = haversine(end_p1[0], end_p1[1], start_p2[0], start_p2[1])
        assert dist == 0.0, f"Continuity error between Sec {p1} and Sec {p2}: dist={dist}m"
    print("All contiguous cut points verified: dist = 0.0m exact match!")

    # Load existing POIs from existing section JSON files to preserve 65 geocoded POIs
    existing_pois = {}
    for sec_id in range(1, 56):
        sec_file = f"public/data/sections/section_{sec_id}.json"
        if os.path.exists(sec_file):
            try:
                with open(sec_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    existing_pois[sec_id] = data.get('pois', [])
            except:
                existing_pois[sec_id] = []
        else:
            existing_pois[sec_id] = []

    # Load metadata from foresttrip_sections.json
    with open('scripts/foresttrip_sections.json', encoding='utf-8') as f:
        meta_list = json.load(f)
    meta_by_num = {int(m['section_number'].replace('구간', '')): m for m in meta_list}

    # Load unopened sections metadata
    from generate_all_55_sections import UNOPENED_SECTIONS
    unopened_by_id = {u['id']: u for u in UNOPENED_SECTIONS}

    print("\n=== Step 2: Simplifying with epsilon=2.0m & Calculating Elevations ===")
    cache = load_cache()
    os.makedirs('public/data/sections', exist_ok=True)

    summary_list = []
    overview_list = []
    full_track_features = []

    for sec_id in range(1, 56):
        is_opened = sec_id in opened_tracks
        print(f"Sec {sec_id:2d} ({'개통' if is_opened else '미개통'})...", end=' ', flush=True)

        start_name = ""
        end_name = ""
        pois = existing_pois.get(sec_id, [])

        if is_opened:
            raw_pts = opened_tracks[sec_id]
            # Exact 2.0m RDP tolerance
            compressed = rdp_local(raw_pts, epsilon=2.0)
            meta = meta_by_num.get(sec_id, {})
            title = f"{sec_id}구간 ({meta.get('region', '')})"
            region = meta.get('region', '')
            course = meta.get('course', f"{sec_id}구간")
            official_dist = meta.get('distance_km', 15.0)
            start_name, end_name = SECTION_ANCHOR_NAMES.get(sec_id, ("", ""))
        else:
            u = unopened_by_id[sec_id]
            title = f"{sec_id}구간 ({u['region']})"
            region = u['region']
            course = u['course']
            official_dist = u['dist']
            compressed = []  # Explicitly empty for unopened sections per user instruction
            start_name = u['course'].split('~')[0].strip() if '~' in u['course'] else ""
            end_name = u['course'].split('~')[-1].strip() if '~' in u['course'] else ""

        formatted_pts = []
        gain_m = 0
        loss_m = 0
        min_e_m = 0
        max_e_m = 0
        calc_dist_km = 0.0
        start_pt = None
        end_pt = None

        if is_opened and compressed:
            # Elevation lookup
            pairs = [(p[0], p[1]) for p in compressed]
            elevations = fetch_elevations_cached(pairs, cache)

            actual_dist = 0.0
            gain = 0.0
            loss = 0.0
            min_e = 9999.0
            max_e = -9999.0

            for pi in range(len(compressed)):
                lat, lng = compressed[pi]
                ele = round(float(elevations[pi]), 1)
                min_e = min(min_e, ele)
                max_e = max(max_e, ele)

                if pi > 0:
                    step_d = haversine(compressed[pi-1][0], compressed[pi-1][1], lat, lng)
                    actual_dist += step_d
                    diff = ele - formatted_pts[-1]['ele']
                    if abs(diff) > 0.4:
                        if diff > 0:
                            gain += diff
                        else:
                            loss += abs(diff)

                formatted_pts.append({
                    "lat": round(lat, 6),
                    "lng": round(lng, 6),
                    "ele": ele,
                    "dist": round(actual_dist / 1000.0, 2)
                })

            gain_m = int(round(gain))
            loss_m = int(round(loss))
            min_e_m = int(round(min_e))
            max_e_m = int(round(max_e))
            calc_dist_km = round(actual_dist / 1000.0, 1)
            start_pt = {"lat": formatted_pts[0]['lat'], "lng": formatted_pts[0]['lng']}
            end_pt = {"lat": formatted_pts[-1]['lat'], "lng": formatted_pts[-1]['lng']}

        hiking_info = calc_hiking_time(official_dist if not is_opened else calc_dist_km, gain_m, loss_m)

        # Build Section JSON
        section_detail = {
            "section_id": sec_id,
            "section_number": f"{sec_id}구간",
            "title": title,
            "region": region,
            "course": course,
            "start_name": start_name,
            "end_name": end_name,
            "is_opened": is_opened,
            "official_distance_km": official_dist,
            "calculated_distance_km": calc_dist_km,
            "elevation_gain_m": gain_m,
            "elevation_loss_m": loss_m,
            "min_elevation_m": min_e_m,
            "max_elevation_m": max_e_m,
            "hiking_time_hours": hiking_info['hiking_time_hours'],
            "hiking_time_text": hiking_info['hiking_time_text'],
            "start_point": start_pt,
            "end_point": end_pt,
            "pois": pois,
            "points": formatted_pts
        }

        with open(f"public/data/sections/section_{sec_id}.json", 'w', encoding='utf-8') as f:
            json.dump(section_detail, f, ensure_ascii=False, indent=2)

        # Summary entry
        summary_item = {
            "section_id": sec_id,
            "section_number": f"{sec_id}구간",
            "title": title,
            "region": region,
            "course": course,
            "start_name": start_name,
            "end_name": end_name,
            "is_opened": is_opened,
            "official_distance_km": official_dist,
            "calculated_distance_km": calc_dist_km,
            "elevation_gain_m": gain_m,
            "elevation_loss_m": loss_m,
            "hiking_time_hours": hiking_info['hiking_time_hours'],
            "hiking_time_text": hiking_info['hiking_time_text'],
            "poi_count": len(pois),
            "start_point": start_pt,
            "end_point": end_pt
        }
        summary_list.append(summary_item)

        # Overview entry (ONLY opened sections per user instruction)
        if is_opened and formatted_pts:
            overview_item = {
                "section_id": sec_id,
                "section_number": f"{sec_id}구간",
                "title": title,
                "region": region,
                "course": course,
                "start_name": start_name,
                "end_name": end_name,
                "is_opened": True,
                "distance_km": calc_dist_km,
                "elevation_gain_m": gain_m,
                "elevation_loss_m": loss_m,
                "start_point": start_pt,
                "end_point": end_pt,
                "path": [{"lat": p['lat'], "lng": p['lng'], "ele": p['ele']} for p in formatted_pts]
            }
            overview_list.append(overview_item)

            # Feature for full_trail_track.json
            full_track_features.append({
                "type": "Feature",
                "properties": {
                    "section_id": sec_id,
                    "section_number": f"{sec_id}구간",
                    "title": title,
                    "start_name": start_name,
                    "end_name": end_name,
                    "distance_km": calc_dist_km
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[p['lng'], p['lat'], p['ele']] for p in formatted_pts]
                }
            })

    save_cache(cache)

    # Save summary
    with open('public/data/sections_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary_list, f, ensure_ascii=False, indent=2)

    # Save overview (32 opened sections only)
    with open('public/data/all_sections_overview.json', 'w', encoding='utf-8') as f:
        json.dump(overview_list, f, ensure_ascii=False, indent=2)

    # Save full trail track (32 opened sections only)
    full_track_geojson = {
        "type": "FeatureCollection",
        "features": full_track_features
    }
    with open('public/data/full_trail_track.json', 'w', encoding='utf-8') as f:
        json.dump(full_track_geojson, f, ensure_ascii=False, indent=2)

    print(f"\nSUCCESS!")
    print(f"- public/data/sections/section_1..55.json generated (epsilon=2.0m).")
    print(f"- public/data/sections_summary.json (55 sections) generated.")
    print(f"- public/data/all_sections_overview.json ({len(overview_list)} opened sections) generated.")
    print(f"- public/data/full_trail_track.json ({len(full_track_features)} opened features) generated.")

if __name__ == '__main__':
    main()
