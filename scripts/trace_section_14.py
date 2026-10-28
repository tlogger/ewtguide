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

# Target End Anchor: 대룡1리
# 충남 공주시 신풍면 대룡리 397-4 -> (36.49573, 126.93409)
target_lat = 36.49573
target_lng = 126.93409

# Let's inspect chain of Seg 24 -> 26 -> 29(rev) -> 30(rev) -> 33(rev) -> 52(rev)
pts24 = get_pts(24)
pts26 = get_pts(26)
pts29_rev = list(reversed(get_pts(29)))
pts30_rev = list(reversed(get_pts(30)))
pts33_rev = list(reversed(get_pts(33)))
pts52_rev = list(reversed(get_pts(52)))

print(f"pts24: start={pts24[0]} -> end={pts24[-1]}")
print(f"gap 24->26: {haversine(pts24[-1][0], pts24[-1][1], pts26[0][0], pts26[0][1]):.1f}m")
print(f"pts26: start={pts26[0]} -> end={pts26[-1]}")
print(f"gap 26->29_rev: {haversine(pts26[-1][0], pts26[-1][1], pts29_rev[0][0], pts29_rev[0][1]):.1f}m")
print(f"pts29_rev: start={pts29_rev[0]} -> end={pts29_rev[-1]}")
print(f"gap 29_rev->30_rev: {haversine(pts29_rev[-1][0], pts29_rev[-1][1], pts30_rev[0][0], pts30_rev[0][1]):.1f}m")
print(f"pts30_rev: start={pts30_rev[0]} -> end={pts30_rev[-1]}")
print(f"gap 30_rev->33_rev: {haversine(pts30_rev[-1][0], pts30_rev[-1][1], pts33_rev[0][0], pts33_rev[0][1]):.1f}m")
print(f"pts33_rev: start={pts33_rev[0]} -> end={pts33_rev[-1]}")
print(f"gap 33_rev->52_rev: {haversine(pts33_rev[-1][0], pts33_rev[-1][1], pts52_rev[0][0], pts52_rev[0][1]):.1f}m")
print(f"pts52_rev: start={pts52_rev[0]} -> end={pts52_rev[-1]}")

dist_to_daeryong = haversine(pts52_rev[-1][0], pts52_rev[-1][1], target_lat, target_lng)
print(f"Distance from end of 52_rev to 대룡1리: {dist_to_daeryong:.1f}m")

# What about segments between 52 and 67?
print("\nInspecting Segments 52 to 67:")
for s_num in range(52, 68):
    p = get_pts(s_num)
    d_start = haversine(p[0][0], p[0][1], target_lat, target_lng)
    d_end = haversine(p[-1][0], p[-1][1], target_lat, target_lng)
    print(f"Seg {s_num}: len={len(p)} | start=({p[0][0]:.5f}, {p[0][1]:.5f}, dist={d_start:.1f}m) -> end=({p[-1][0]:.5f}, {p[-1][1]:.5f}, dist={d_end:.1f}m)")
