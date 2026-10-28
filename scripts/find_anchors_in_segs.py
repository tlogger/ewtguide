import xml.etree.ElementTree as ET
import json
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

def find_nearest_in_all_segs(segs, target_lat, target_lng):
    best_s = -1
    best_i = -1
    best_d = float('inf')
    for s_idx, pts in enumerate(segs):
        for i, (la, lo) in enumerate(pts):
            d = haversine(la, lo, target_lat, target_lng)
            if d < best_d:
                best_d = d
                best_s = s_idx + 1
                best_i = i
    return best_s, best_i, best_d

with open('scripts/anchors_geocoded.json', 'r', encoding='utf-8') as f:
    anchors_list = json.load(f)
anchors = {a['id']: a for a in anchors_list}

tree = ET.parse('동서트레일 32개 구간 GPX_노선도 파일.gpx')
root = tree.getroot()
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
trk = root.find('gpx:trk', ns)
raw_segs = trk.findall('gpx:trkseg', ns)
segs = []
for s in raw_segs:
    segs.append([(float(p.attrib['lat']), float(p.attrib['lon'])) for p in s.findall('gpx:trkpt', ns)])

print("Searching nearest segment for each anchor:")
for aid in sorted(anchors.keys()):
    a = anchors[aid]
    if not a.get('coords'):
        continue
    s_idx, p_idx, dist = find_nearest_in_all_segs(segs, a['coords']['lat'], a['coords']['lng'])
    print(f"Anchor {aid:2d} ({a['name']:<16}): Seg {s_idx:2d}, pt {p_idx:4d}, dist {dist:.1f}m")
