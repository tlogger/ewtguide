import json

with open('c:/work/ewtguide/scripts/foresttrip_sections.json', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total sections loaded: {len(data)}")
for s in data:
    print(f"[{s['section_number']}] {s['region']} ({s['distance_km']}km) - {s['course']} (POIs: {len(s['pois'])})")
