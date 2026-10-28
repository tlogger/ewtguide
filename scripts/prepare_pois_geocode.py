import json
import os
import re

def parse_pois():
    pois_to_geocode = []
    for sid in range(1, 56):
        path = f'public/data/sections/section_{sid}.json'
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
        for idx, p in enumerate(d.get('pois', [])):
            raw_name = p.get('name', '')
            addr = ''
            clean_name = raw_name
            if ':' in raw_name:
                parts = raw_name.split(':', 1)
                clean_name = parts[0].strip()
                addr = parts[1].strip()
            
            pois_to_geocode.append({
                'section_id': sid,
                'poi_idx': idx,
                'raw_name': raw_name,
                'clean_name': clean_name,
                'addr': addr,
                'region': d.get('region', ''),
                'start_lat': d['start_point']['lat'],
                'start_lng': d['start_point']['lng'],
                'end_lat': d['end_point']['lat'],
                'end_lng': d['end_point']['lng'],
            })
    return pois_to_geocode

if __name__ == '__main__':
    items = parse_pois()
    print(f"Total POIs to geocode: {len(items)}")
    with open('scripts/pois_to_geocode.json', 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
