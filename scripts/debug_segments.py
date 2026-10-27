import xml.etree.ElementTree as ET
import glob
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

tree = ET.parse(glob.glob('c:/work/ewtguide/*.gpx')[0])
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
trk = tree.getroot().find('gpx:trk', ns)
segs = trk.findall('gpx:trkseg', ns)

print(f"Total Segments: {len(segs)}")
total_dist = 0
for i, s in enumerate(segs):
    pts = s.findall('gpx:trkpt', ns)
    if not pts:
        continue
    d = sum(haversine(float(pts[j].attrib['lat']), float(pts[j].attrib['lon']),
                      float(pts[j+1].attrib['lat']), float(pts[j+1].attrib['lon'])) for j in range(len(pts)-1))
    total_dist += d
    p0, p1 = pts[0], pts[-1]
    lat0, lon0 = float(p0.attrib['lat']), float(p0.attrib['lon'])
    lat1, lon1 = float(p1.attrib['lat']), float(p1.attrib['lon'])
    print(f"Seg {i+1:02d}: pts={len(pts):5d}, dist={d/1000:6.2f}km, ({lat0:.4f}, {lon0:.4f}) -> ({lat1:.4f}, {lon1:.4f})")
print(f"Total distance across all segments: {total_dist/1000:.2f}km")
