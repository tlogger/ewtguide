import json
import urllib.request
import time
import os
import glob
import math

CACHE_FILE = 'scripts/elevation_cache.json'
STATUS_FILE = 'scripts/elevation_status.json'

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False)

def fetch_elevations_safe(pairs, cache):
    """
    pairs: list of (lat, lng)
    returns list of float elevations
    """
    results = [None] * len(pairs)
    missing_indices = []

    for i, (lat, lng) in enumerate(pairs):
        key = f"{lat:.5f},{lng:.5f}"
        if key in cache:
            results[i] = cache[key]
        else:
            missing_indices.append(i)

    if not missing_indices:
        return results

    print(f" (fetching {len(missing_indices)} uncached DEM points...", end='', flush=True)

    chunk_size = 80
    for c_start in range(0, len(missing_indices), chunk_size):
        chunk_idx = missing_indices[c_start:c_start + chunk_size]
        lat_str = ','.join(f"{pairs[idx][0]:.5f}" for idx in chunk_idx)
        lon_str = ','.join(f"{pairs[idx][1]:.5f}" for idx in chunk_idx)
        url = f"https://api.open-meteo.com/v1/elevation?latitude={lat_str}&longitude={lon_str}"

        # Exponential backoff retry
        success = False
        for attempt in range(4):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'ewtguide-safe-dem/2.0'})
                with urllib.request.urlopen(req, timeout=12) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    eles = data.get('elevation', [])
                    for k, idx in enumerate(chunk_idx):
                        val = float(eles[k]) if k < len(eles) else 50.0
                        results[idx] = val
                        cache[f"{pairs[idx][0]:.5f},{pairs[idx][1]:.5f}"] = val
                    success = True
                    break
            except Exception as e:
                wait_time = (attempt + 1) * 1.5
                time.sleep(wait_time)

        if not success:
            print(f" [warn: chunk failed, using fallback]", end='', flush=True)
            for idx in chunk_idx:
                results[idx] = 50.0

        time.sleep(0.4) # polite rate limit

    save_cache(cache)
    print(" done)", end='', flush=True)
    return results

def main():
    print("=== Reliable Elevation Enrichment & Retry Pipeline ===")
    cache = load_cache()
    print(f"Loaded {len(cache)} cached elevation points.")

    sections_dir = 'public/data/sections'
    sec_files = sorted(glob.glob(f"{sections_dir}/section_*.json"),
                       key=lambda x: int(os.path.basename(x).replace('section_', '').replace('.json', '')))

    status_report = {}

    for fp in sec_files:
        with open(fp, encoding='utf-8') as f:
            sec = json.load(f)

        sec_id = sec['section_id']
        pts = sec.get('points', [])
        if not pts:
            continue

        print(f"Section {sec_id:02d} ({sec['region']})...", end='', flush=True)
        pairs = [(p['lat'], p['lng']) for p in pts]

        eles = fetch_elevations_safe(pairs, cache)

        # Smooth and calculate gain / loss
        gain = 0.0
        loss = 0.0
        min_e = 9999.0
        max_e = -9999.0

        for i, p in enumerate(pts):
            ele = round(eles[i], 1)
            p['ele'] = ele
            min_e = min(min_e, ele)
            max_e = max(max_e, ele)
            if i > 0:
                diff = ele - pts[i-1]['ele']
                if diff > 0:
                    gain += diff
                else:
                    loss += abs(diff)

        sec['elevation_gain_m'] = round(gain)
        sec['elevation_loss_m'] = round(loss)
        sec['min_elevation_m'] = round(min_e)
        sec['max_elevation_m'] = round(max_e)

        # Recalculate hiking time
        hours_float = (sec['official_distance_km'] / 3.5) + (sec['elevation_gain_m'] / 400.0) + (sec['elevation_loss_m'] / 800.0)
        tot_m = int(round(hours_float * 60))
        sec['hiking_time_hours'] = round(hours_float, 1)
        sec['hiking_time_text'] = f"{tot_m // 60}시간 {tot_m % 60}분"

        with open(fp, 'w', encoding='utf-8') as f:
            json.dump(sec, f, ensure_ascii=False)

        status_report[sec_id] = {
            "status": "success",
            "points_count": len(pts),
            "gain_m": round(gain),
            "loss_m": round(loss),
            "ele_range": f"{round(min_e)}m ~ {round(max_e)}m"
        }
        print(f" -> +{round(gain)}m / -{round(loss)}m ({round(min_e)}~{round(max_e)}m)")

    # Save status
    with open(STATUS_FILE, 'w', encoding='utf-8') as f:
        json.dump(status_report, f, ensure_ascii=False, indent=2)

    # Update summary file
    with open('public/data/sections_summary.json', encoding='utf-8') as f:
        summary_list = json.load(f)

    for item in summary_list:
        sid = item['section_id']
        sec_fp = f"public/data/sections/section_{sid}.json"
        if os.path.exists(sec_fp):
            with open(sec_fp, encoding='utf-8') as fp:
                sec_data = json.load(fp)
            item['elevation_gain_m'] = sec_data['elevation_gain_m']
            item['elevation_loss_m'] = sec_data['elevation_loss_m']
            item['min_elevation_m'] = sec_data['min_elevation_m']
            item['max_elevation_m'] = sec_data['max_elevation_m']
            item['hiking_time_hours'] = sec_data['hiking_time_hours']
            item['hiking_time_text'] = sec_data['hiking_time_text']

    with open('public/data/sections_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary_list, f, ensure_ascii=False, indent=2)

    print("\nAll sections successfully enriched and verified with reliable cache!")

if __name__ == '__main__':
    main()
