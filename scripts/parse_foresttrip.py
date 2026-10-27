import urllib.request
import re
from bs4 import BeautifulSoup

url = 'https://www.foresttrip.go.kr/pot/frtrl/et/selectEcoTravel7.do?hmpgId=FRTRL&menuId=002008001'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

soup = BeautifulSoup(html, 'html.parser')

anchors = soup.find_all('a', class_='anchor-item')
print(f"Total anchors: {len(anchors)}")

for a in anchors[:10]:
    href = a.get('href')
    text = a.get_text(strip=True)
    target_id = href.lstrip('#') if href else ''
    target_el = soup.find(id=target_id) if target_id else None
    target_desc = target_el.get_text(" ", strip=True)[:150] if target_el else "None"
    print(f"Anchor: {text} -> href: {href}")
    print(f"  Target Text: {target_desc}")
