import json
import urllib.request
import time
import os
import glob

def fetch_elevations_batch(lat_lng_pairs):
    elevations = []
    chunk_size = 100
    for i in range(0, len(lat_lng_pairs), chunk_size):
        chunk = lat_lng_pairs[i:i+chunk_size]
        lat_str = ','.join(f"{p[0]:.5f}" for p in chunk)
        lon_str = ','.join(f"{p[1]:.5f}" for p in chunk)
        url = f"https://api.open-meteo.com/v1/elevation?latitude={lat_str}&longitude={lon_str}"
        success = False
        for retry in range(3):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'ewtguide-elevation-fetcher'})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    elevations.extend(data.get('elevation', [0.0] * len(chunk)))
                    success = True
                    break
            except Exception as e:
                time.sleep(1.0)
        if not success:
            print(f"Warning: Failed to fetch elevation for chunk starting at {i}")
            elevations.extend([0.0] * len(chunk))
        time.sleep(0.08)
    return elevations

def main():
    sec_files = sorted(glob.glob('public/data/sections/section_*.json'), 
                       key=lambda x: int(os.path.basename(x).replace('section_', '').replace('.json', '')))
    
    print(f"Enriching elevations for {len(sec_files)} sections...")
    summary_list = []

    for file_path in sec_files:
        with open(file_path, encoding='utf-8') as f:
            sec = json.load(f)

        sec_id = sec['section_id']
        pairs = [(p['lat'], p['lng']) for p in sec['points']]
        print(f"Processing Section {sec_id} ({len(pairs)} points)...", end=' ', flush=True)

        eles = fetch_elevations_batch(pairs)

        gain = 0.0
        loss = 0.0
        min_e = 9999.0
        max_e = -9999.0

        for idx, p in enumerate(sec['points']):
            ele = round(eles[idx], 1)
            p['ele'] = ele
            min_e = min(min_e, ele)
            max_e = max(max_e, ele)
            if idx > 0:
                diff = ele - sec['points'][idx-1]['ele']
                if diff > 0:
                    gain += diff
                else:
                    loss += abs(diff)

        sec['elevation_gain_m'] = round(gain)
        sec['elevation_loss_m'] = round(loss)
        sec['min_elevation_m'] = round(min_e)
        sec['max_elevation_m'] = round(max_e)

        # Save back enriched section
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(sec, f, ensure_ascii=False)

        summary_list.append({
            "section_id": sec['section_id'],
            "section_number": sec['section_number'],
            "title": sec['title'],
            "region": sec['region'],
            "course": sec['course'],
            "official_distance_km": sec['official_distance_km'],
            "actual_distance_km": sec['actual_distance_km'],
            "elevation_gain_m": sec['elevation_gain_m'],
            "elevation_loss_m": sec['elevation_loss_m'],
            "min_elevation_m": sec['min_elevation_m'],
            "max_elevation_m": sec['max_elevation_m'],
            "start_point": sec['start_point'],
            "end_point": sec['end_point'],
            "pois_count": len(sec.get('pois', [])),
            "points_count": len(sec['points'])
        })
        print(f"Done! ele: {round(min_e)}m ~ {round(max_e)}m, +{round(gain)}m / -{round(loss)}m")

    with open('public/data/sections_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary_list, f, ensure_ascii=False, indent=2)

    print("\nElevation enrichment complete! All 32 sections updated.")

if __name__ == '__main__':
    main()
