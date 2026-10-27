import xml.etree.ElementTree as ET
import glob

tree = ET.parse(glob.glob('c:/work/ewtguide/*.gpx')[0])
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
trk = tree.getroot().find('gpx:trk', ns)
segs = trk.findall('gpx:trkseg', ns)

print(f"Total Segments in GPX: {len(segs)}")
for i, s in enumerate(segs):
    pts = s.findall('gpx:trkpt', ns)
    if pts:
        p0 = pts[0]
        p1 = pts[-1]
        print(f"Seg {i+1:02d}: pts={len(pts):5d} | ({float(p0.attrib['lat']):.4f}, {float(p0.attrib['lon']):.4f}) -> ({float(p1.attrib['lat']):.4f}, {float(p1.attrib['lon']):.4f})")
