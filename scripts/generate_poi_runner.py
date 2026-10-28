import json

with open('scripts/pois_to_geocode.json', encoding='utf-8') as f:
    pois = json.load(f)

js_content = f"""(async () => {{
  const geocoder = new window.kakao.maps.services.Geocoder();
  const places = new window.kakao.maps.services.Places();
  const items = {json.dumps(pois, ensure_ascii=False)};

  const searchItem = (item) => new Promise((resolve) => {{
    // 1. If address exists, try addressSearch
    if (item.addr) {{
      geocoder.addressSearch(item.addr, (res, status) => {{
        if (status === window.kakao.maps.services.Status.OK && res && res.length > 0) {{
          return resolve({{ lat: parseFloat(res[0].y), lng: parseFloat(res[0].x) }});
        }}
        // Fallback to keywordSearch
        places.keywordSearch(item.clean_name + ' ' + item.region, (kRes, kStatus) => {{
          if (kStatus === window.kakao.maps.services.Status.OK && kRes && kRes.length > 0) {{
            return resolve({{ lat: parseFloat(kRes[0].y), lng: parseFloat(kRes[0].x) }});
          }}
          // Fallback to start point
          resolve({{ lat: item.start_lat, lng: item.start_lng }});
        }});
      }});
    }} else {{
      places.keywordSearch(item.clean_name + ' ' + item.region, (kRes, kStatus) => {{
        if (kStatus === window.kakao.maps.services.Status.OK && kRes && kRes.length > 0) {{
          return resolve({{ lat: parseFloat(kRes[0].y), lng: parseFloat(kRes[0].x) }});
        }}
        // Try without region
        places.keywordSearch(item.clean_name, (kRes2, kStatus2) => {{
          if (kStatus2 === window.kakao.maps.services.Status.OK && kRes2 && kRes2.length > 0) {{
            return resolve({{ lat: parseFloat(kRes2[0].y), lng: parseFloat(kRes2[0].x) }});
          }}
          resolve({{ lat: item.start_lat, lng: item.start_lng }});
        }});
      }});
    }}
  }});

  const results = [];
  for (const it of items) {{
    const coords = await searchItem(it);
    results.push({{ ...it, lat: coords.lat, lng: coords.lng }});
  }}
  return results;
}})()"""

with open('scripts/geocode_pois_runner.js', 'w', encoding='utf-8') as f:
    f.write(js_content)
print("Saved geocode_pois_runner.js")
