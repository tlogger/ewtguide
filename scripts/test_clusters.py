import xml.etree.ElementTree as ET
import glob
import math
import json

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

tree = ET.parse(glob.glob('c:/work/ewtguide/*.gpx')[0])
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
trk = tree.getroot().find('gpx:trk', ns)
segs = trk.findall('gpx:trkseg', ns)

def get_pts(seg_idx):
    # 1-based index
    s = segs[seg_idx - 1]
    pts = []
    for p in s.findall('gpx:trkpt', ns):
        lat = float(p.attrib['lat'])
        lon = float(p.attrib['lon'])
        ele_elem = p.find('gpx:ele', ns)
        ele = float(ele_elem.text) if ele_elem is not None else 0.0
        pts.append((lat, lon, ele))
    return pts

def calc_dist(pts):
    d = 0.0
    for i in range(len(pts) - 1):
        d += haversine(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1])
    return d

# Assemble Cluster 1: Seg 3, then Seg 1, then Seg 2, then Seg 4..22, then Seg 23, then Seg 24..67
c1_pts = []
c1_pts.extend(get_pts(3))
c1_pts.extend(get_pts(1))
c1_pts.extend(get_pts(2))
for i in range(4, 23):
    c1_pts.extend(get_pts(i))
c1_pts.extend(get_pts(23))
for i in range(24, 68):
    c1_pts.extend(get_pts(i))

# Assemble Cluster 2: Seg 68
c2_pts = get_pts(68)

# Assemble Cluster 3: Seg 69, 70, 71, reversed(72), 73
c3_pts = []
c3_pts.extend(get_pts(69))
c3_pts.extend(get_pts(70))
c3_pts.extend(get_pts(71))
c3_pts.extend(list(reversed(get_pts(72))))
c3_pts.extend(get_pts(73))

# Assemble Cluster 4: Seg 74, 77, 78
c4_pts = []
c4_pts.extend(get_pts(74))
c4_pts.extend(get_pts(77))
c4_pts.extend(get_pts(78))

print(f"Cluster 1: {len(c1_pts)} pts, {calc_dist(c1_pts)/1000:.2f} km")
print(f"Cluster 2: {len(c2_pts)} pts, {calc_dist(c2_pts)/1000:.2f} km")
print(f"Cluster 3: {len(c3_pts)} pts, {calc_dist(c3_pts)/1000:.2f} km")
print(f"Cluster 4: {len(c4_pts)} pts, {calc_dist(c4_pts)/1000:.2f} km")
