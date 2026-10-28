import xml.etree.ElementTree as ET
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

tree = ET.parse('동서트레일 32개 구간 GPX_노선도 파일.gpx')
root = tree.getroot()
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
trk = root.find('gpx:trk', ns)
raw_segs = trk.findall('gpx:trkseg', ns)

def get_pts(s_idx):
    s = raw_segs[s_idx - 1]
    return [(float(p.attrib['lat']), float(p.attrib['lon'])) for p in s.findall('gpx:trkpt', ns)]

# Target: 위라1리마을회관 (36.49681, 126.74749) -> 대룡1리 (36.49556, 126.93407)
pts = []

# 1. Seg 24 (forward)
pts.extend(get_pts(24))

# 2. Seg 26 (forward)
pts.extend(get_pts(26))

# 3. Seg 29 (reverse)
pts.extend(list(reversed(get_pts(29))))

# 4. Seg 30 (reverse)
pts.extend(list(reversed(get_pts(30))))

# 5. Seg 33 (reverse)
pts.extend(list(reversed(get_pts(33))))

# 6. Connecting segments down to Seg 52
pts.extend(list(reversed(get_pts(35))))
pts.extend(list(reversed(get_pts(37))))
pts.extend(list(reversed(get_pts(39))))
pts.extend(list(reversed(get_pts(41))))
pts.extend(list(reversed(get_pts(44))))
pts.extend(list(reversed(get_pts(46))))
pts.extend(list(reversed(get_pts(50))))

# 7. Seg 52 (reverse): lands at (36.49632, 126.93429)
pts.extend(list(reversed(get_pts(52))))

# 8. Seg 66 (reverse): lands at (36.49627, 126.93422)
pts.extend(list(reversed(get_pts(66))))

# 9. Seg 64 (reverse): lands at (36.49610, 126.93408)
pts.extend(list(reversed(get_pts(64))))

# 10. Seg 57 (forward): (36.49542, 126.93385) -> (36.49610, 126.93408)
# Let's reverse Seg 57: from (36.49610, 126.93408) to (36.49542, 126.93385)
pts.extend(list(reversed(get_pts(57))))

# 11. Seg 60 (forward): (36.49556, 126.93407)
pts.extend(get_pts(60))

# Check continuity and total length
total_dist = 0
max_gap = 0
max_gap_idx = 0
for i in range(1, len(pts)):
    d = haversine(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1])
    total_dist += d
    if d > max_gap:
        max_gap = d
        max_gap_idx = i

print(f"Total raw points: {len(pts)}")
print(f"Total distance: {total_dist/1000.0:.2f} km (Official: 19.0 km)")
print(f"Max gap between points: {max_gap:.1f}m at index {max_gap_idx}")
print(f"Start: {pts[0]} (위라1리)")
print(f"End:   {pts[-1]} (대룡1리)")
