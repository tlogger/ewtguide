import json
data = json.load(open('public/data/sections_summary.json', encoding='utf-8'))
for s in data:
    print(f"[{s['section_number']}] {s['region']}: {s['official_distance_km']}km | ele: {s['min_elevation_m']}m ~ {s['max_elevation_m']}m (+{s['elevation_gain_m']}m / -{s['elevation_loss_m']}m)")
