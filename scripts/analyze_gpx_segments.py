import xml.etree.ElementTree as ET
import glob
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000 # meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

file_path = glob.glob('c:/work/ewtguide/*.gpx')[0]
tree = ET.parse(file_path)
root = tree.getroot()
ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}

trk = root.find('gpx:trk', ns)
segs = trk.findall('gpx:trkseg', ns)

print(f"Total Segments: {len(segs)}")

seg_infos = []
for i, seg in enumerate(segs):
    pts = seg.findall('gpx:trkpt', ns)
    if not pts:
        continue
    p0 = pts[0]
    p1 = pts[-1]
    lat0, lon0 = float(p0.attrib['lat']), float(p0.attrib['lon'])
    lat1, lon1 = float(p1.attrib['lat']), float(p1.attrib['lon'])
    
    # calculate length of this segment
    length_m = 0.0
    for j in range(len(pts) - 1):
        pa, pb = pts[j], pts[j+1]
        length_m += haversine(float(pa.attrib['lat']), float(pa.attrib['lon']),
                              float(pb.attrib['lat']), float(pb.attrib['lon']))
        
    seg_infos.append({
        "seg_idx": i + 1,
        "pts_count": len(pts),
        "length_km": round(length_m / 1000.0, 2),
        "start": (round(lat0, 4), round(lon0, 4)),
        "end": (round(lat1, 4), round(lon1, 4))
    })

print(f"{'Seg':<4} | {'Pts':<5} | {'Length(km)':<10} | {'Start (lat, lon)':<20} | {'End (lat, lon)':<20}")
print("-" * 70)
for info in seg_infos:
    if info['length_km'] >= 0.5 or info['pts_count'] > 100:
        print(f"{info['seg_idx']:<4} | {info['pts_count']:<5} | {info['length_km']:<10} | {str(info['start']):<20} | {str(info['end']):<20}")
