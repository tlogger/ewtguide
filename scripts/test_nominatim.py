import urllib.request
import json
import time

coords = [
    (36.496766, 126.358909), # 1구간 시점
    (36.586376, 126.315198), # 1구간 종점
    (36.758085, 126.296696), # 4구간 시점
    (36.932290, 129.058703), # 50구간 종점 (분천역)
    (36.968060, 129.412604), # 55구간 종점 (망양정)
]

for lat, lng in coords:
    url = f'https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=18&addressdetails=1'
    req = urllib.request.Request(url, headers={'User-Agent': 'EwtGuideTrail/1.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.load(resp)
            print(f"({lat}, {lng}) -> {data.get('display_name')}")
    except Exception as e:
        print('Error:', e)
    time.sleep(1)
