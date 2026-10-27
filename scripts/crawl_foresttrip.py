import urllib.request
import re
import json
import time
from bs4 import BeautifulSoup

BASE_URL = 'https://www.foresttrip.go.kr/pot/frtrl/et/selectEcoTravel7.do?hmpgId=FRTRL'

print("Step 1: Fetching main page to get all section links...")
req = urllib.request.Request(BASE_URL, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
with urllib.request.urlopen(req) as resp:
    main_html = resp.read().decode('utf-8', errors='ignore')

soup = BeautifulSoup(main_html, 'html.parser')
anchors = soup.find_all('a', class_='anchor-item')
print(f"Found {len(anchors)} section anchors.")

sections_data = []

for idx, a in enumerate(anchors):
    href = a.get('href')
    title = a.get_text(strip=True)
    if not href:
        continue
    
    cntns_match = re.search(r'cntnsId=(\d+)', href)
    cntns_id = cntns_match.group(1) if cntns_match else str(idx + 1)
    
    section_url = f"{BASE_URL}&cntnsId={cntns_id}"
    print(f"[{idx+1}/{len(anchors)}] Scraping {title} (cntnsId={cntns_id})...")
    
    try:
        s_req = urllib.request.Request(section_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(s_req) as s_resp:
            s_html = s_resp.read().decode('utf-8', errors='ignore')
        
        s_soup = BeautifulSoup(s_html, 'html.parser')
        
        # Course info from .list-body .cell
        course_text = ""
        region_text = ""
        distance_km = 0.0
        
        cells = s_soup.select('.list-body .cell')
        for c in cells:
            label = c.find('i', class_='label')
            text_el = c.find('span', class_='text')
            if label and text_el:
                l_text = label.get_text(strip=True)
                val_text = text_el.get_text(strip=True)
                if '코스' in l_text:
                    course_text = val_text
                elif '지역' in l_text:
                    region_text = val_text
                elif '거리' in l_text:
                    d_match = re.search(r'([\d\.]+)', val_text)
                    if d_match:
                        distance_km = float(d_match.group(1))

        # Thumbnails and POIs from route-thumbnail
        pois = []
        thumbnails = s_soup.find_all('div', class_='route-thumbnail')
        for thumb in thumbnails:
            thumb_text = thumb.get_text("\n", strip=True)
            lines = [l.strip() for l in thumb_text.split("\n") if l.strip()]
            if lines:
                poi_name = lines[0]
                poi_desc = " ".join(lines[1:])
                cat = "other"
                if any(w in poi_desc for w in ['안내시설', '안내소', '인증']):
                    cat = "cert_center"
                elif '화장실' in poi_desc:
                    cat = "toilet"
                elif any(w in poi_desc for w in ['숙박', '휴양림', '캠핑장', '민박']):
                    cat = "lodging"
                elif any(w in poi_desc for w in ['식당', '먹거리', '수산물', '카페']):
                    cat = "restaurant"
                elif any(w in poi_desc for w in ['쉼터', '대피소']):
                    cat = "shelter"
                    
                pois.append({
                    "name": poi_name,
                    "description": poi_desc,
                    "category": cat
                })
        
        sections_data.append({
            "section_number": title,
            "cntns_id": cntns_id,
            "url": section_url,
            "course": course_text,
            "region": region_text,
            "distance_km": distance_km,
            "pois": pois
        })
        time.sleep(0.15)
    except Exception as e:
        print(f"  Error on {title}: {e}")

output_path = 'c:/work/ewtguide/scripts/foresttrip_sections.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(sections_data, f, ensure_ascii=False, indent=2)

print(f"\nCompleted! Saved {len(sections_data)} sections to {output_path}")
