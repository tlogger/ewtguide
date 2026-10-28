import xml.etree.ElementTree as ET
import json
import math
import os

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

def find_nearest_index(pts, target_lat, target_lng):
    best_i = 0
    best_d = float('inf')
    for i, (la, lo) in enumerate(pts):
        d = haversine(la, lo, target_lat, target_lng)
        if d < best_d:
            best_d = d
            best_i = i
    return best_i, best_d

# Load anchors
with open('scripts/anchors_geocoded.json', 'r', encoding='utf-8') as f:
    anchors_list = json.load(f)
anchors = {a['id']: a for a in anchors_list}

# Load GPX
tree = ET.parse('동서트레일 32개 구간 GPX_노선도 파일.gpx')
root = tree.getroot()
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
trk = root.find('gpx:trk', ns)
segs = trk.findall('gpx:trkseg', ns)

def get_seg_pts(idx):
    s = segs[idx - 1]
    return [(float(p.attrib['lat']), float(p.attrib['lon'])) for p in s.findall('gpx:trkpt', ns)]

print(f"Total GPX Segments: {len(segs)}")

# Let's inspect Seg 2: 3, 4, 5
pts2 = get_seg_pts(2)
# Anchor 3: 몽산포해수욕장, Anchor 4: 태안읍행정복지센터, Anchor 5: 상담교, Anchor 6: 율목리마을
a3 = anchors[3]['coords']
a4 = anchors[4]['coords']
a5 = anchors[5]['coords']
a6 = anchors[6]['coords']
i_a3, d_a3 = find_nearest_index(pts2, a3['lat'], a3['lng'])
i_a4, d_a4 = find_nearest_index(pts2, a4['lat'], a4['lng'])
i_a5, d_a5 = find_nearest_index(pts2, a5['lat'], a5['lng'])
i_a6, d_a6 = find_nearest_index(pts2, a6['lat'], a6['lng'])
print(f"Seg 2: len={len(pts2)}, A3(몽산포)={i_a3} (dist={d_a3:.1f}m), A4(태안읍)={i_a4} (dist={d_a4:.1f}m), A5(상담교)={i_a5} (dist={d_a5:.1f}m), A6(율목리)={i_a6} (dist={d_a6:.1f}m)")

# Let's inspect Seg 23: 7 ~ 13
pts23 = get_seg_pts(23)
for aid in range(7, 15):
    a = anchors[aid]['coords']
    idx, d = find_nearest_index(pts23, a['lat'], a['lng'])
    print(f"Seg 23: A{aid} ({anchors[aid]['name']}) -> index {idx} (dist={d:.1f}m)")

