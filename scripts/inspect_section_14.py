import json
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

with open('public/data/sections/section_14.json', 'r', encoding='utf-8') as f:
    sec14 = json.load(f)

pts = sec14['points']
print(f"Total points in section 14: {len(pts)}")
print(f"Official distance: {sec14.get('official_distance_km')}km")
print(f"Calculated distance: {sec14.get('calculated_distance_km')}km")

print("\n--- Checking jumps (> 50m) ---")
for i in range(1, len(pts)):
    d = haversine(pts[i-1]['lat'], pts[i-1]['lng'], pts[i]['lat'], pts[i]['lng'])
    if d > 50:
        print(f"Jump at index {i-1} -> {i}: {d:.1f}m")
        print(f"  pt[{i-1}]: ({pts[i-1]['lat']}, {pts[i-1]['lng']}) dist={pts[i-1]['dist']}km")
        print(f"  pt[{i}]: ({pts[i]['lat']}, {pts[i]['lng']}) dist={pts[i]['dist']}km")

print("\n--- Last 30 points of Section 14 ---")
for idx in range(max(0, len(pts)-30), len(pts)):
    p = pts[idx]
    d_prev = haversine(pts[idx-1]['lat'], pts[idx-1]['lng'], p['lat'], p['lng']) if idx > 0 else 0
    print(f"pt[{idx}]: ({p['lat']:.6f}, {p['lng']:.6f}) ele={p['ele']}m dist={p['dist']}km (step={d_prev:.1f}m)")

print(f"\nStart point: {sec14.get('start_point')} ({sec14.get('start_name')})")
print(f"End point: {sec14.get('end_point')} ({sec14.get('end_name')})")
