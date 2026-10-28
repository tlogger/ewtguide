import csv
import json

anchors = []
with open('시종점_주소.csv', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if not row: continue
        sid = row[0].strip()
        name = row[1].strip() if len(row) > 1 else ''
        addr = row[2].strip() if len(row) > 2 else ''
        if sid.isdigit():
            anchors.append({
                'id': int(sid),
                'name': name,
                'search_target': addr if addr else name
            })

with open('scripts/anchors_to_geocode.json', 'w', encoding='utf-8') as f:
    json.dump(anchors, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(anchors)} anchors.")
