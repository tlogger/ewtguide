import xml.etree.ElementTree as ET
import json
import os
import math
import urllib.request
import time

CACHE_FILE = 'scripts/elevation_cache.json'

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

def rdp_local(points, epsilon=3.0):
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

import srtm

geo_elevation_data = srtm.get_data()

def fetch_elevations_cached(pairs, cache):
    results = [None] * len(pairs)
    last_valid = 50.0

    for i, (lat, lng) in enumerate(pairs):
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
        cache[f"{lat:.5f},{lng:.5f}"] = val

    save_cache(cache)
    return results

def main():
    print("=== Step 1: Loading GPX Segments & Foresttrip Metadata ===")
    tree = ET.parse('동서트레일 32개 구간 GPX_노선도 파일.gpx')
    root = tree.getroot()
    ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
    trk = root.find('gpx:trk', ns)
    segs = trk.findall('gpx:trkseg', ns)

    def get_seg_pts(idx):
        s = segs[idx - 1]
        return [(float(p.attrib['lat']), float(p.attrib['lon'])) for p in s.findall('gpx:trkpt', ns)]

    with open('scripts/foresttrip_sections.json', encoding='utf-8') as f:
        meta_list = json.load(f)
    meta_by_num = {int(m['section_number'].replace('구간', '')): m for m in meta_list}

    def find_nearest_index(pts, target_lat, target_lng):
        best_i = 0
        best_d = 9999999
        for i, (la, lo) in enumerate(pts):
            d = haversine(la, lo, target_lat, target_lng)
            if d < best_d:
                best_d = d
                best_i = i
        return best_i

    print("=== Step 2: Extracting 32 Opened Sections using Landmark Anchors ===")
    opened_tracks = {}

    # 1구간: Seg 3
    opened_tracks[1] = get_seg_pts(3)

    # 2구간: Seg 1
    opened_tracks[2] = get_seg_pts(1)

    # 3, 4, 5구간: Seg 2
    # Landmarks: 3/4 = 태안읍행정복지센터 (36.7577, 126.2963), 4/5 = 팔봉산양길리주차장 (36.8178, 126.3665)
    pts2 = get_seg_pts(2)
    c34 = find_nearest_index(pts2, 36.7577, 126.2963)
    c45 = find_nearest_index(pts2, 36.8178, 126.3665)
    opened_tracks[3] = pts2[:c34+1]
    opened_tracks[4] = pts2[c34:c45+1]
    opened_tracks[5] = pts2[c45:]

    # 6구간: Seg 4..22
    pts6 = []
    for si in [4, 5, 6, 10, 14, 20, 21, 22]:
        pts6.extend(get_seg_pts(si))
    opened_tracks[6] = pts6

    # 7 ~ 13구간: Seg 23
    pts23 = get_seg_pts(23)
    # Landmarks:
    # 7/8: 보원사지 (36.7615, 126.6014)
    # 8/9: 충의사 (36.6884, 126.6528)
    # 9/10: 이응노생가 (36.6225, 126.6318)
    # 10/11: 내포홍성센터 (36.5758, 126.6542)
    # 11/12: 오서산상담마을 (36.4810, 126.6394)
    # 12/13: 대현1리마을회관 (36.4967, 126.7259)
    c78 = find_nearest_index(pts23, 36.7615, 126.6014)
    c89 = find_nearest_index(pts23, 36.6884, 126.6528)
    c910 = find_nearest_index(pts23, 36.6225, 126.6318)
    c1011 = find_nearest_index(pts23, 36.5758, 126.6542)
    c1112 = find_nearest_index(pts23, 36.4810, 126.6394)
    c1213 = find_nearest_index(pts23, 36.4967, 126.7259)

    opened_tracks[7] = pts23[:c78+1]
    opened_tracks[8] = pts23[c78:c89+1]
    opened_tracks[9] = pts23[c89:c910+1]
    opened_tracks[10] = pts23[c910:c1011+1]
    opened_tracks[11] = pts23[c1011:c1112+1]
    opened_tracks[12] = pts23[c1112:c1213+1]
    opened_tracks[13] = pts23[c1213:]

    # 14구간: Seg 24, 26, 29, 30, 33, 41, 52, 57, 63
    pts14 = []
    for si in [24, 26, 29, 30, 33, 41, 52, 57, 63]:
        pts14.extend(get_seg_pts(si))
    opened_tracks[14] = pts14

    # 20 ~ 22구간: Seg 68
    pts68 = get_seg_pts(68)
    # 20/21: 삼정생태공원 (36.4493, 127.4666)
    # 21/22: 대청호생태관 (36.3733, 127.4708)
    c2021 = find_nearest_index(pts68, 36.4493, 127.4666)
    c2122 = find_nearest_index(pts68, 36.3733, 127.4708)
    opened_tracks[20] = pts68[:c2021+1]
    opened_tracks[21] = pts68[c2021:c2122+1]
    opened_tracks[22] = pts68[c2122:]

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
    # 47/48: 애당교 (36.9869, 128.8662)
    # 48/49: 춘양면사무소 (36.9351, 128.9149)
    c4748 = find_nearest_index(pts77, 36.9869, 128.8662)
    c4849 = find_nearest_index(pts77, 36.9351, 128.9149)
    opened_tracks[47] = pts77[:c4748+1]
    opened_tracks[48] = pts77[c4748:c4849+1]
    opened_tracks[49] = pts77[c4849:]

    # 50 ~ 55구간: Seg 78
    pts78 = get_seg_pts(78)
    # 50/51: 분천역 (36.9323, 129.0587)
    # 51/52: 원곡교/승부역 (36.9640, 129.1362)
    # 52/53: 소광리 안내센터 (37.0099, 129.2271)
    # 53/54: 두천1리 (37.0308, 129.2761)
    # 54/55: 중섬교/하원리 (36.9601, 129.3499)
    c5051 = find_nearest_index(pts78, 36.9323, 129.0587)
    c5152 = find_nearest_index(pts78, 36.9640, 129.1362)
    c5253 = find_nearest_index(pts78, 37.0099, 129.2271)
    c5354 = find_nearest_index(pts78, 37.0308, 129.2761)
    c5455 = find_nearest_index(pts78, 36.9601, 129.3499)

    opened_tracks[50] = pts78[:c5051+1]
    opened_tracks[51] = pts78[c5051:c5152+1]
    opened_tracks[52] = pts78[c5152:c5253+1]
    opened_tracks[53] = pts78[c5253:c5354+1]
    opened_tracks[54] = pts78[c5354:c5455+1]
    opened_tracks[55] = pts78[c5455:]

    # 23 Unopened sections definitions
    with open('scripts/generate_all_55_sections.py', encoding='utf-8') as f:
        gen_code = f.read()
    import sys
    sys.path.insert(0, os.path.abspath('scripts'))
    from generate_all_55_sections import UNOPENED_SECTIONS

    unopened_by_id = {u['id']: u for u in UNOPENED_SECTIONS}

    print("=== Step 3: Compressing & Enriching DEM Elevations with Cache ===")
    cache = load_cache()
    os.makedirs('public/data/sections', exist_ok=True)

    summary_list = []
    overview_list = []

    for sec_id in range(1, 56):
        is_opened = sec_id in opened_tracks
        print(f"Processing Section {sec_id:2d} ({'개통' if is_opened else '미개통'})...", end=' ', flush=True)

        if is_opened:
            raw_pts = opened_tracks[sec_id]
            compressed = rdp_local(raw_pts, epsilon=3.0)
            meta = meta_by_num.get(sec_id, {})
            title = f"{sec_id}구간 ({meta.get('region', '')})"
            region = meta.get('region', '')
            course = meta.get('course', f"{sec_id}구간")
            official_dist = meta.get('distance_km', 15.0)
            pois = meta.get('pois', [])
        else:
            u = unopened_by_id[sec_id]
            title = f"{sec_id}구간 ({u['region']})"
            region = u['region']
            course = u['course']
            official_dist = u['dist']
            pois = []

            # Generate smooth trail curve connecting start and end
            steps = 120
            raw_pts = []
            lat1, lng1 = u['start']
            lat2, lng2 = u['end']
            mid_lat = (lat1 + lat2) / 2.0
            mid_lng = (lng1 + lng2) / 2.0
            arc = 0.015 * math.sin(sec_id * 1.7)
            for s in range(steps + 1):
                t = s / float(steps)
                lat = (1-t)*lat1 + t*lat2 + arc * math.sin(t * math.pi)
                lng = (1-t)*lng1 + t*lng2 + (arc * 0.5) * math.sin(t * math.pi * 2)
                raw_pts.append((lat, lng))
            compressed = raw_pts

        # Fetch DEM elevations
        pairs = [(p[0], p[1]) for p in compressed]
        elevations = fetch_elevations_cached(pairs, cache)

        # Smooth elevation spikes and calculate distance/gain/loss
        gain = 0.0
        loss = 0.0
        min_e = 9999.0
        max_e = -9999.0
        actual_dist = 0.0
        formatted_pts = []

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

        hiking_info = calc_hiking_time(official_dist, gain_m, loss_m)

        # Save individual section JSON
        section_detail = {
            "section_id": sec_id,
            "section_number": f"{sec_id}구간",
            "title": title,
            "region": region,
            "course": course,
            "is_opened": is_opened,
            "official_distance_km": official_dist,
            "calculated_distance_km": calc_dist_km,
            "elevation_gain_m": gain_m,
            "elevation_loss_m": loss_m,
            "min_elevation_m": min_e_m,
            "max_elevation_m": max_e_m,
            "hiking_time_hours": hiking_info['hiking_time_hours'],
            "hiking_time_text": hiking_info['hiking_time_text'],
            "start_point": {"lat": formatted_pts[0]['lat'], "lng": formatted_pts[0]['lng']},
            "end_point": {"lat": formatted_pts[-1]['lat'], "lng": formatted_pts[-1]['lng']},
            "pois": pois,
            "points": formatted_pts
        }

        with open(f"public/data/sections/section_{sec_id}.json", 'w', encoding='utf-8') as f:
            json.dump(section_detail, f, ensure_ascii=False)

        # Append to summary
        summary_list.append({
            "section_id": sec_id,
            "section_number": f"{sec_id}구간",
            "title": title,
            "region": region,
            "course": course,
            "is_opened": is_opened,
            "official_distance_km": official_dist,
            "elevation_gain_m": gain_m,
            "min_elevation_m": min_e_m,
            "max_elevation_m": max_e_m,
            "hiking_time_hours": hiking_info['hiking_time_hours'],
            "hiking_time_text": hiking_info['hiking_time_text'],
            "pois_count": len(pois)
        })

        # Downsample for overview map
        sample_step = max(1, len(formatted_pts) // 140)
        overview_path = [{"lat": p['lat'], "lng": p['lng']} for i, p in enumerate(formatted_pts) if i % sample_step == 0]
        overview_list.append({
            "section_id": sec_id,
            "section_number": f"{sec_id}구간",
            "title": title,
            "region": region,
            "is_opened": is_opened,
            "distance_km": official_dist,
            "start": {"lat": formatted_pts[0]['lat'], "lng": formatted_pts[0]['lng']},
            "end": {"lat": formatted_pts[-1]['lat'], "lng": formatted_pts[-1]['lng']},
            "path": overview_path
        })

        print(f"Done! ({len(formatted_pts)} pts, +{gain_m}m/-{loss_m}m, {hiking_info['hiking_time_text']})")

    # Save summary and overview
    with open('public/data/sections_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary_list, f, ensure_ascii=False, indent=2)

    with open('public/data/all_sections_overview.json', 'w', encoding='utf-8') as f:
        json.dump(overview_list, f, ensure_ascii=False)

    print("=== Master Dataset Generation Complete! ===")

if __name__ == '__main__':
    main()
