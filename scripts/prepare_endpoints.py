import json
import os
import re

def parse_course_endpoints(course_str, title_str):
    # Example: "1구간 : 안면도 자연휴양림 ~ 안면도수목원 ~ 방포해수욕장 ~ 백사장항"
    raw = course_str
    if ':' in raw:
        raw = raw.split(':', 1)[1]
    tokens = [t.strip() for t in raw.split('~') if t.strip()]
    if len(tokens) >= 2:
        return tokens[0], tokens[-1]
    elif len(tokens) == 1:
        return tokens[0], tokens[0]
    return "시점", "종점"

def extract_all():
    sections = []
    for sid in range(1, 56):
        path = f'public/data/sections/section_{sid}.json'
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
        pts = d.get('points', [])
        f_lat = pts[0]['lat'] if pts else 0.0
        f_lng = pts[0]['lng'] if pts else 0.0
        l_lat = pts[-1]['lat'] if pts else 0.0
        l_lng = pts[-1]['lng'] if pts else 0.0
        
        start_name, end_name = parse_course_endpoints(d.get('course', ''), d.get('title', ''))
        
        sections.append({
            'section_id': sid,
            'title': d.get('title', f'{sid}구간'),
            'region': d.get('region', ''),
            'is_opened': d.get('is_opened', False),
            'course': d.get('course', ''),
            'start_name': start_name,
            'start_lat': f_lat,
            'start_lng': f_lng,
            'end_name': end_name,
            'end_lat': l_lat,
            'end_lng': l_lng,
        })
    return sections

if __name__ == '__main__':
    data = extract_all()
    with open('scripts/raw_endpoints_input.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Extracted {len(data)} sections.")
