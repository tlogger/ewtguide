import json
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

with open('public/data/sections/section_14.json', 'r', encoding='utf-8') as f:
    sec = json.load(f)

pts = sec['points']
print(f"Total points: {len(pts)}")
for i in range(1, len(pts)):
    d = haversine(pts[i-1]['lat'], pts[i-1]['lng'], pts[i]['lat'], pts[i]['lng'])
    if d > 120:
        print(f"Jump {i-1}->{i}: {d:.1f}m at dist={pts[i-1]['dist']}km -> {pts[i]['dist']}km")
        print(f"   from: ({pts[i-1]['lat']}, {pts[i-1]['lng']})")
        print(f"   to:   ({pts[i]['lat']}, {pts[i]['lng']})")
