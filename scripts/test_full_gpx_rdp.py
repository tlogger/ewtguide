import xml.etree.ElementTree as ET
import math

def rdp_local(points, epsilon=4.0):
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

tree = ET.parse('동서트레일 32개 구간 GPX_노선도 파일.gpx')
root = tree.getroot()
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
trk = root.find('gpx:trk', ns)
segs = trk.findall('gpx:trkseg', ns)

all_pts = []
for s in segs:
    pts = [(float(p.attrib['lat']), float(p.attrib['lon'])) for p in s.findall('gpx:trkpt', ns)]
    all_pts.extend(pts)

print(f"Raw total points: {len(all_pts)}")
simplified = rdp_local(all_pts, epsilon=4.0)
print(f"Simplified with epsilon=4.0m: {len(simplified)} points")
