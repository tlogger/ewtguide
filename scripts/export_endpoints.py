import json
import os

def main():
    lines = []
    for sid in range(1, 56):
        path = f'public/data/sections/section_{sid}.json'
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
        pts = d.get('points', [])
        f_lat = pts[0]['lat'] if pts else 0
        f_lng = pts[0]['lng'] if pts else 0
        l_lat = pts[-1]['lat'] if pts else 0
        l_lng = pts[-1]['lng'] if pts else 0
        region = d.get('region', '')
        title = d.get('title', '')
        course = d.get('course', '')
        is_opened = d.get('is_opened', False)
        lines.append(f"{sid:02d} | {'개통' if is_opened else '미개통'} | {region:6s} | {title:18s} | Start=({f_lat:.6f}, {f_lng:.6f}) -> End=({l_lat:.6f}, {l_lng:.6f}) | Course: {course}")

    for l in lines:
        print(l)

if __name__ == '__main__':
    main()
