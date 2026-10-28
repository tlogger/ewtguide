import json
import csv
import re
import os

def process():
    input_path = 'C:/Users/pyros/.gemini/antigravity/brain/4a3091a2-2a6a-47cf-a66c-2ad1317fe92c/.system_generated/steps/1110/output.txt'
    with open(input_path, encoding='utf-8') as f:
        content = f.read()

    # The file starts with "Execution result:\n["
    m = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
    if not m:
        print("Could not find JSON array")
        return

    data = json.loads(m.group(0))
    print(f"Loaded {len(data)} sections.")

    # Save to public/data/sections_endpoints.json
    with open('public/data/sections_endpoints.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Prepare CSV fieldnames
    fieldnames = [
        '구간ID',
        '구간명',
        '개통여부',
        '관할지역',
        '코스요약',
        '시점_명칭',
        '시점_위도(Lat)',
        '시점_경도(Lng)',
        '시점_주소',
        '시점_도로명',
        '시점_지번',
        '시점_건물명',
        '종점_명칭',
        '종점_위도(Lat)',
        '종점_경도(Lng)',
        '종점_주소',
        '종점_도로명',
        '종점_지번',
        '종점_건물명',
    ]

    csv_rows = []
    for item in data:
        row = {
            '구간ID': item['section_id'],
            '구간명': item['title'],
            '개통여부': '개통' if item['is_opened'] else '미개통',
            '관할지역': item['region'],
            '코스요약': item['course'],
            '시점_명칭': item['start_name'],
            '시점_위도(Lat)': f"{item['start_lat']:.6f}",
            '시점_경도(Lng)': f"{item['start_lng']:.6f}",
            '시점_주소': item['start_address'],
            '시점_도로명': item.get('start_road', ''),
            '시점_지번': item.get('start_jibun', ''),
            '시점_건물명': item.get('start_building', ''),
            '종점_명칭': item['end_name'],
            '종점_위도(Lat)': f"{item['end_lat']:.6f}",
            '종점_경도(Lng)': f"{item['end_lng']:.6f}",
            '종점_주소': item['end_address'],
            '종점_도로명': item.get('end_road', ''),
            '종점_지번': item.get('end_jibun', ''),
            '종점_건물명': item.get('end_building', ''),
        }
        csv_rows.append(row)

    # Save CSV files:
    # 1. c:\work\ewtguide\동서트레일_55개구간_시종점_목록.csv
    # 2. c:\work\ewtguide\public\data\sections_endpoints.csv
    out_files = [
        '동서트레일_55개구간_시종점_목록.csv',
        'public/data/sections_endpoints.csv'
    ]

    for p in out_files:
        with open(p, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_rows)
        print(f"Saved {p}")

if __name__ == '__main__':
    process()
