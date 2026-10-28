import json
import re
import os

def update_pois():
    input_file = 'C:/Users/pyros/.gemini/antigravity/brain/4a3091a2-2a6a-47cf-a66c-2ad1317fe92c/.system_generated/steps/1297/output.txt'
    with open(input_file, encoding='utf-8') as f:
        content = f.read()

    m = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
    if not m:
        print("Could not find JSON array")
        return

    data = json.loads(m.group(0))
    print(f"Loaded {len(data)} geocoded POIs.")

    # Group by section_id
    by_section = {}
    for item in data:
        sid = item['section_id']
        by_section.setdefault(sid, []).append(item)

    updated_count = 0
    for sid, pois in by_section.items():
        sec_path = f'public/data/sections/section_{sid}.json'
        if not os.path.exists(sec_path):
            continue
        with open(sec_path, encoding='utf-8') as f:
            sec_data = json.load(f)

        existing_pois = sec_data.get('pois', [])
        for item in pois:
            idx = item['poi_idx']
            if idx < len(existing_pois):
                existing_pois[idx]['lat'] = item['lat']
                existing_pois[idx]['lng'] = item['lng']
                updated_count += 1

        sec_data['pois'] = existing_pois
        with open(sec_path, 'w', encoding='utf-8') as f:
            json.dump(sec_data, f, ensure_ascii=False, indent=2)

    print(f"Successfully updated {updated_count} POIs across sections with exact coordinates!")

if __name__ == '__main__':
    update_pois()
