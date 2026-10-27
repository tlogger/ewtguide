import xml.etree.ElementTree as ET
import glob
import math
import json
import os

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0 # meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
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
        dx = bx - ax
        dy = by - ay
        line_len = math.hypot(dx, dy)

        max_dist = 0.0
        max_idx = start_idx

        if line_len == 0.0:
            for i in range(start_idx + 1, end_idx):
                px, py = pts_m[i]
                d = math.hypot(px - ax, py - ay)
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
            left_res = rdp_recursive(start_idx, max_idx)
            right_res = rdp_recursive(max_idx, end_idx)
            return left_res + right_res
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

def main():
    print("Starting GPX processing...")
    gpx_file = glob.glob('c:/work/ewtguide/*.gpx')[0]
    tree = ET.parse(gpx_file)
    ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
    trk = tree.getroot().find('gpx:trk', ns)
    segs = trk.findall('gpx:trkseg', ns)

    last_valid_ele = 50.0
    def get_pts(seg_idx):
        nonlocal last_valid_ele
        s = segs[seg_idx - 1]
        pts = []
        for p in s.findall('gpx:trkpt', ns):
            lat = float(p.attrib['lat'])
            lon = float(p.attrib['lon'])
            ele_elem = p.find('gpx:ele', ns)
            ele = last_valid_ele
            if ele_elem is not None and ele_elem.text:
                try:
                    val = float(ele_elem.text.strip())
                    if not (math.isinf(val) or math.isnan(val) or val < -100 or val > 3000):
                        ele = val
                        last_valid_ele = val
                except:
                    pass
            pts.append((lat, lon, ele))
        return pts

    # 4 clusters
    # Cluster 1: Seg 3, Seg 1, Seg 2, Seg 4..22, Seg 23, Seg 24..67
    c1 = []
    c1.extend(get_pts(3))
    c1.extend(get_pts(1))
    c1.extend(get_pts(2))
    for i in range(4, 23):
        c1.extend(get_pts(i))
    c1.extend(get_pts(23))
    for i in range(24, 68):
        c1.extend(get_pts(i))

    # Cluster 2: Seg 68
    c2 = get_pts(68)

    # Cluster 3: Seg 69, 70, 71, reversed(72), 73
    c3 = []
    c3.extend(get_pts(69))
    c3.extend(get_pts(70))
    c3.extend(get_pts(71))
    c3.extend(list(reversed(get_pts(72))))
    c3.extend(get_pts(73))

    # Cluster 4: Seg 74, 77, 78
    c4 = []
    c4.extend(get_pts(74))
    c4.extend(get_pts(77))
    c4.extend(get_pts(78))

    clusters = [
        {"name": "Cluster 1 (1~14)", "pts": c1, "section_nums": list(range(1, 15))},
        {"name": "Cluster 2 (20~22)", "pts": c2, "section_nums": [20, 21, 22]},
        {"name": "Cluster 3 (32~36)", "pts": c3, "section_nums": [32, 33, 34, 35, 36]},
        {"name": "Cluster 4 (46~55)", "pts": c4, "section_nums": list(range(46, 56))}
    ]

    with open('scripts/foresttrip_sections.json', encoding='utf-8') as f:
        meta_list = json.load(f)
    meta_by_num = {int(m['section_number'].replace('구간', '')): m for m in meta_list}

    out_dir = 'public/data/sections'
    os.makedirs(out_dir, exist_ok=True)

    summary_list = []
    total_processed_pts = 0

    for cluster in clusters:
        pts = cluster['pts']
        sec_nums = cluster['section_nums']
        
        # Calculate cumulative distance along cluster points
        cum_dists = [0.0]
        for i in range(len(pts) - 1):
            d = haversine(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1])
            cum_dists.append(cum_dists[-1] + d)
        total_cluster_dist = cum_dists[-1]

        # Calculate official distances and target cuts
        off_dists = [meta_by_num[num]['distance_km'] * 1000.0 for num in sec_nums]
        total_off_dist = sum(off_dists)

        # Scale factor
        scale = total_cluster_dist / total_off_dist if total_off_dist > 0 else 1.0

        target_cuts = []
        cur_sum = 0.0
        for od in off_dists[:-1]:
            cur_sum += od * scale
            target_cuts.append(cur_sum)

        # Find point indices for cuts
        cut_indices = [0]
        cur_cut_idx = 0
        for i, cd in enumerate(cum_dists):
            if cur_cut_idx < len(target_cuts) and cd >= target_cuts[cur_cut_idx]:
                cut_indices.append(i)
                cur_cut_idx += 1
        cut_indices.append(len(pts))

        for idx, num in enumerate(sec_nums):
            start_i = cut_indices[idx]
            end_i = cut_indices[idx+1]
            # Sliced points for this section
            raw_sec_pts = pts[start_i:end_i]
            if len(raw_sec_pts) < 2 and start_i > 0:
                raw_sec_pts = pts[start_i-1:end_i]

            # Apply RDP 3m compression
            compressed = rdp_local(raw_sec_pts, epsilon=3.0)
            total_processed_pts += len(compressed)

            # Calculate actual section stats
            sec_dist = 0.0
            gain = 0.0
            loss = 0.0
            min_e = 9999.0
            max_e = -9999.0

            formatted_points = []
            cur_d = 0.0
            for pi in range(len(compressed)):
                lat, lon, ele = compressed[pi]
                if pi > 0:
                    prev_lat, prev_lon, prev_ele = compressed[pi-1]
                    step_d = haversine(prev_lat, prev_lon, lat, lon)
                    cur_d += step_d
                    diff = ele - prev_ele
                    if diff > 0:
                        gain += diff
                    else:
                        loss += abs(diff)

                min_e = min(min_e, ele)
                max_e = max(max_e, ele)
                formatted_points.append({
                    "lat": round(lat, 6),
                    "lng": round(lon, 6),
                    "ele": round(ele, 1),
                    "dist": round(cur_d / 1000.0, 2)
                })

            meta = meta_by_num[num]
            sec_data = {
                "section_id": num,
                "section_number": f"{num}구간",
                "title": f"{num}구간 ({meta['region']})",
                "region": meta['region'],
                "course": meta['course'],
                "official_distance_km": meta['distance_km'],
                "actual_distance_km": round(cur_d / 1000.0, 2),
                "elevation_gain_m": round(gain),
                "elevation_loss_m": round(loss),
                "min_elevation_m": round(min_e),
                "max_elevation_m": round(max_e),
                "start_point": {
                    "lat": formatted_points[0]["lat"],
                    "lng": formatted_points[0]["lng"]
                },
                "end_point": {
                    "lat": formatted_points[-1]["lat"],
                    "lng": formatted_points[-1]["lng"]
                },
                "pois": meta.get('pois', []),
                "points_count": len(formatted_points),
                "points": formatted_points
            }

            # Save section file
            sec_path = os.path.join(out_dir, f"section_{num}.json")
            with open(sec_path, 'w', encoding='utf-8') as f:
                json.dump(sec_data, f, ensure_ascii=False)

            # Summary entry
            summary_list.append({
                "section_id": num,
                "section_number": f"{num}구간",
                "title": sec_data['title'],
                "region": meta['region'],
                "course": meta['course'],
                "official_distance_km": meta['distance_km'],
                "actual_distance_km": sec_data['actual_distance_km'],
                "elevation_gain_m": sec_data['elevation_gain_m'],
                "elevation_loss_m": sec_data['elevation_loss_m'],
                "min_elevation_m": sec_data['min_elevation_m'],
                "max_elevation_m": sec_data['max_elevation_m'],
                "start_point": sec_data['start_point'],
                "end_point": sec_data['end_point'],
                "pois_count": len(sec_data['pois']),
                "points_count": sec_data['points_count']
            })

    # Save summary
    with open('public/data/sections_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary_list, f, ensure_ascii=False, indent=2)

    print(f"Successfully processed {len(summary_list)} sections!")
    print(f"Total compressed points saved: {total_processed_pts}")

if __name__ == '__main__':
    main()
