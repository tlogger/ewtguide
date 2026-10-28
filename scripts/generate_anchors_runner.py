import json

with open('scripts/anchors_to_geocode.json', encoding='utf-8') as f:
    anchors = json.load(f)

js_code = f"""(async () => {{
  const geocoder = new window.kakao.maps.services.Geocoder();
  const places = new window.kakao.maps.services.Places();
  const items = {json.dumps(anchors, ensure_ascii=False)};

  const searchOne = (target, fallbackName) => new Promise((resolve) => {{
    if (!target) return resolve(null);
    geocoder.addressSearch(target, (res, status) => {{
      if (status === window.kakao.maps.services.Status.OK && res && res.length > 0) {{
        return resolve({{ lat: parseFloat(res[0].y), lng: parseFloat(res[0].x), matched: res[0].address_name, type: 'address' }});
      }}
      places.keywordSearch(target, (kRes, kStatus) => {{
        if (kStatus === window.kakao.maps.services.Status.OK && kRes && kRes.length > 0) {{
          return resolve({{ lat: parseFloat(kRes[0].y), lng: parseFloat(kRes[0].x), matched: kRes[0].place_name, type: 'keyword' }});
        }}
        if (fallbackName && fallbackName !== target) {{
          places.keywordSearch(fallbackName, (fRes, fStatus) => {{
            if (fStatus === window.kakao.maps.services.Status.OK && fRes && fRes.length > 0) {{
              return resolve({{ lat: parseFloat(fRes[0].y), lng: parseFloat(fRes[0].x), matched: fRes[0].place_name, type: 'fallback' }});
            }}
            resolve(null);
          }});
        }} else {{
          resolve(null);
        }}
      }});
    }});
  }});

  const results = [];
  for (const it of items) {{
    const res = await searchOne(it.search_target, it.name);
    results.push({{ ...it, coords: res }});
  }}
  return results;
}})()"""

with open('scripts/geocode_anchors_runner.js', 'w', encoding='utf-8') as f:
    f.write(js_code)
print("Saved geocode_anchors_runner.js")
