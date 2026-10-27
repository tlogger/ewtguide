import xml.etree.ElementTree as ET
import glob
import math

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

print(f"Total Segments: {len(segs)}")

# Let's extract each segment's points
seg_list = []
for i, s in enumerate(segs):
    pts = []
    for p in s.findall('gpx:trkpt', ns):
        lat = float(p.attrib['lat'])
        lon = float(p.attrib['lon'])
        ele_elem = p.find('gpx:ele', ns)
        ele = float(ele_elem.text) if ele_elem is not None else 0.0
        pts.append((lat, lon, ele))
    if pts:
        seg_list.append((i + 1, pts))

# Check gaps between consecutive segments in order
for idx in range(len(seg_list) - 1):
    s_idx1, pts1 = seg_list[idx]
    s_idx2, pts2 = seg_list[idx+1]
    gap = haversine(pts1[-1][0], pts1[-1][1], pts2[0][0], pts2[0][1])
    rev_gap = haversine(pts1[-1][0], pts1[-1][1], pts2[-1][0], pts2[-1][1])
    if gap > 100: # gap greater than 100m
        print(f"Gap between Seg {s_idx1} and Seg {s_idx2}: {gap/1000:.2f}km (if reversed: {rev_gap/1000:.2f}km)")
        print(f"   Seg {s_idx1} end: ({pts1[-1][0]:.4f}, {pts1[-1][1]:.4f})")
        print(f"   Seg {s_idx2} start: ({pts2[0][0]:.4f}, {pts2[0][1]:.4f})")
