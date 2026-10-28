import json
import re

txt_path = r'C:\Users\pyros\.gemini\antigravity\brain\4a3091a2-2a6a-47cf-a66c-2ad1317fe92c\.system_generated\steps\1450\output.txt'
with open(txt_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate JSON array
start_idx = content.find('[')
end_idx = content.rfind(']') + 1
if start_idx != -1 and end_idx != -1:
    json_str = content[start_idx:end_idx]
    data = json.loads(json_str)
    print(f"Extracted {len(data)} items successfully.")
    with open('scripts/anchors_geocoded.json', 'w', encoding='utf-8') as out:
        json.dump(data, out, ensure_ascii=False, indent=2)
    print("Wrote scripts/anchors_geocoded.json")
    for d in data[:5]:
        print(f"ID {d['id']}: {d['name']} -> ({d['coords']['lat']}, {d['coords']['lng']})")
else:
    print("Could not find JSON array in output.txt")
