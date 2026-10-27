import xml.etree.ElementTree as ET
import glob

file_path = glob.glob('c:/work/ewtguide/*.gpx')[0]
tree = ET.parse(file_path)
root = tree.getroot()
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}

trk = root.find('gpx:trk', ns)
segs = trk.findall('gpx:trkseg', ns)

print("Checking segments for tags or attributes:")
for i, seg in enumerate(segs):
    # check child tags of seg
    children = [child.tag.replace(f"{{{ns['gpx']}}}", "") for child in seg]
    pts = seg.findall('gpx:trkpt', ns)
    if pts:
        p0 = pts[0]
        p_last = pts[-1]
        lat0, lon0 = float(p0.attrib['lat']), float(p0.attrib['lon'])
        lat1, lon1 = float(p_last.attrib['lat']), float(p_last.attrib['lon'])
        # check any tags in p0
        p0_tags = [c.tag.replace(f"{{{ns['gpx']}}}", "") for c in p0]
        name_tag = p0.find('gpx:name', ns)
        desc_tag = p0.find('gpx:desc', ns)
        cmt_tag = p0.find('gpx:cmt', ns)
        extra = []
        if name_tag is not None: extra.append(f"name={name_tag.text}")
        if desc_tag is not None: extra.append(f"desc={desc_tag.text}")
        if cmt_tag is not None: extra.append(f"cmt={cmt_tag.text}")
        extra_str = ", ".join(extra) if extra else "none"
        print(f"Seg {i+1:02d}: pts={len(pts)} | start=({lat0:.4f}, {lon0:.4f}) -> end=({lat1:.4f}, {lon1:.4f}) | tags={children[:3]} | pt0_extra: {extra_str}")
