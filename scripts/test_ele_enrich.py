import json
import urllib.request
import time
import os

def fetch_elevations(lat_lng_pairs):
    """
    lat_lng_pairs: list of (lat, lng)
    returns list of elevations
    """
    elevations = []
    chunk_size = 100
    for i in range(0, len(lat_lng_pairs), chunk_size):
        chunk = lat_lng_pairs[i:i+chunk_size]
        lat_str = ','.join(f"{p[0]:.5f}" for p in chunk)
        lon_str = ','.join(f"{p[1]:.5f}" for p in chunk)
        url = f"https://api.open-meteo.com/v1/elevation?latitude={lat_str}&longitude={lon_str}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'ewtguide-gpx-processor'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                elevations.extend(data.get('elevation', [0.0] * len(chunk)))
        except Exception as e:
            print(f"Error fetching elevations at chunk {i}: {e}")
            elevations.extend([0.0] * len(chunk))
        time.sleep(0.1) # courtesy rate limit
    return elevations

# Test on section 33 (괴산군, 문경시 삼풍리 ~ 하내리)
sec_path = 'public/data/sections/section_33.json'
with open(sec_path, encoding='utf-8') as f:
    sec = json.load(f)

pairs = [(p['lat'], p['lng']) for p in sec['points']]
print(f"Fetching elevations for Section 33 ({len(pairs)} points)...")
eles = fetch_elevations(pairs)
print(f"Sample elevations for Section 33: min={min(eles)}m, max={max(eles)}m, sample={eles[:5]}")
