import json
import os
import math

def rdp_local(points, epsilon=4.0):
    if len(points) < 3:
        return points
    mid_lat = math.radians(points[len(points)//2]['lat'])
    kx = 111320.0 * math.cos(mid_lat)
    ky = 110540.0
    pts_m = [(p['lng'] * kx, p['lat'] * ky) for p in points]

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

def haversine(p1, p2):
    R = 6371.0
    lat1, lon1 = math.radians(p1['lat']), math.radians(p1['lng'])
    lat2, lon2 = math.radians(p2['lat']), math.radians(p2['lng'])
    dp, dl = lat2 - lat1, lon2 - lon1
    a = math.sin(dp/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dl/2)**2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

def main():
    print("=== Building Single Full Trail Track (epsilon = 4.0m) ===")
    all_raw_points = []
    section_markers = []
    total_dist = 0.0

    for sid in range(1, 56):
        path = f'public/data/sections/section_{sid}.json'
        if not os.path.exists(path):
            print(f"Warning: {path} not found")
            continue
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
        pts = d.get('points', [])
        if not pts:
            continue

        # Add section start marker
        first_pt = pts[0]
        last_pt = pts[-1]
        section_markers.append({
            'section_id': sid,
            'section_number': d.get('section_number', f'{sid}구간'),
            'title': d.get('title', ''),
            'region': d.get('region', ''),
            'is_opened': d.get('is_opened', False),
            'distance_km': d.get('official_distance_km', round(d.get('calculated_distance_km', 0), 1)),
            'start_point': {'lat': first_pt['lat'], 'lng': first_pt['lng']},
            'end_point': {'lat': last_pt['lat'], 'lng': last_pt['lng']}
        })

        for p in pts:
            all_raw_points.append({
                'lat': round(p['lat'], 6),
                'lng': round(p['lng'], 6),
                'ele': round(p.get('ele', 50.0), 1),
                'section_id': sid,
                'is_opened': d.get('is_opened', False)
            })

    print(f"Raw unified track: {len(all_raw_points)} points across 55 sections.")

    # Apply RDP with epsilon = 4.0 meters
    simplified = rdp_local(all_raw_points, epsilon=4.0)
    print(f"Simplified with epsilon=4.0m: {len(simplified)} points.")

    # Calculate cumulative distance
    cum_dist = 0.0
    for i in range(len(simplified)):
        if i > 0:
            d = haversine(simplified[i-1], simplified[i])
            cum_dist += d
        simplified[i]['dist'] = round(cum_dist, 2)

    output_data = {
        'total_distance_km': round(cum_dist, 1),
        'total_points': len(simplified),
        'epsilon_meters': 4.0,
        'sections_count': len(section_markers),
        'section_markers': section_markers,
        'track': simplified
    }

    out_path = 'public/data/full_trail_track.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False)
    print(f"Saved single full trail track to {out_path} ({os.path.getsize(out_path)} bytes)")

if __name__ == '__main__':
    main()
