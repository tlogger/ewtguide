import xml.etree.ElementTree as ET
import glob

files = glob.glob('c:/work/ewtguide/*.gpx')
if not files:
    print("No GPX found.")
    exit(0)

file_path = files[0]
print(f"Inspecting: {file_path}")
tree = ET.parse(file_path)
root = tree.getroot()
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}

wpts = root.findall('gpx:wpt', ns)
rtes = root.findall('gpx:rte', ns)
trks = root.findall('gpx:trk', ns)

print(f"Waypoints (<wpt>): {len(wpts)}")
print(f"Routes (<rte>): {len(rtes)}")
print(f"Tracks (<trk>): {len(trks)}")

if wpts:
    print("\n--- Sample Waypoints ---")
    for i, wpt in enumerate(wpts[:15]):
        name = wpt.find('gpx:name', ns)
        lat = wpt.attrib.get('lat')
        lon = wpt.attrib.get('lon')
        name_str = name.text if name is not None else ""
        print(f"WPT [{i+1}] {name_str} ({lat}, {lon})")

if trks:
    print("\n--- Tracks Info ---")
    for t_idx, trk in enumerate(trks):
        tname = trk.find('gpx:name', ns)
        tname_str = tname.text if tname is not None else "Unnamed"
        segs = trk.findall('gpx:trkseg', ns)
        print(f"Track [{t_idx+1}] {tname_str} - Segments: {len(segs)}")
        for s_idx, seg in enumerate(segs):
            pts = seg.findall('gpx:trkpt', ns)
            first_pt = pts[0] if pts else None
            last_pt = pts[-1] if pts else None
            ele = first_pt.find('gpx:ele', ns).text if (first_pt is not None and first_pt.find('gpx:ele', ns) is not None) else "N/A"
            time_el = first_pt.find('gpx:time', ns)
            time_str = time_el.text if time_el is not None else "N/A"
            print(f"  Seg {s_idx+1:02d}: points={len(pts)}, start_ele={ele}, start_time={time_str}")
            if s_idx >= 10:
                print(f"  ... and {len(segs) - 11} more segments")
                break
