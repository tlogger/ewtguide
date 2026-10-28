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

print(f"Total raw segments: {len(raw_segs)}")

# Let's inspect seg 23 to 68
for idx in range(23, 68):
    s = raw_segs[idx]
    pts = [(float(p.attrib['lat']), float(p.attrib['lon'])) for p in s.findall('gpx:trkpt', ns)]
    start = pts[0]
    end = pts[-1]
    
    # Calculate length of segment
    seg_len = 0
    for i in range(1, len(pts)):
        seg_len += haversine(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1])
    
    print(f"Seg {idx+1:2d}: pts={len(pts):4d}, len={seg_len/1000.0:5.2f}km | start=({start[0]:.5f}, {start[1]:.5f}) -> end=({end[0]:.5f}, {end[1]:.5f})")
