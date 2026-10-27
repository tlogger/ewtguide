import math

def rdp_local(points, epsilon=3.0):
    """
    points: list of (lat, lon, ele)
    epsilon: tolerance in meters
    """
    if len(points) < 3:
        return points

    # Use center latitude for projection
    mid_lat = math.radians(points[len(points)//2][0])
    kx = 111320.0 * math.cos(mid_lat)
    ky = 110540.0

    # Project to meters
    pts_m = [(p[1] * kx, p[0] * ky) for p in points]

    def rdp_recursive(start_idx, end_idx):
        if end_idx <= start_idx + 1:
            return [start_idx]

        ax, ay = pts_m[start_idx]
        bx, by = pts_m[end_idx]
        dx = bx - ax
        dy = by - ay
        line_len = math.hypot(dx, dy)

        max_dist = 0.0
        max_idx = start_idx

        if line_len == 0.0:
            for i in range(start_idx + 1, end_idx):
                px, py = pts_m[i]
                d = math.hypot(px - ax, py - ay)
                if d > max_dist:
                    max_dist = d
                    max_idx = i
        else:
            inv_len = 1.0 / line_len
            for i in range(start_idx + 1, end_idx):
                px, py = pts_m[i]
                # perpendicular distance in meters
                d = abs(dx * (ay - py) - (ax - px) * dy) * inv_len
                if d > max_dist:
                    max_dist = d
                    max_idx = i

        if max_dist > epsilon:
            left_res = rdp_recursive(start_idx, max_idx)
            right_res = rdp_recursive(max_idx, end_idx)
            return left_res + right_res
        else:
            return [start_idx]

    idx_list = rdp_recursive(0, len(points) - 1)
    idx_list.append(len(points) - 1)
    # Remove duplicates preserving order
    unique_indices = []
    seen = set()
    for idx in idx_list:
        if idx not in seen:
            unique_indices.append(idx)
            seen.add(idx)
    return [points[i] for i in unique_indices]

# Test on cluster 1
from test_clusters import c1_pts
print(f"Original points in Cluster 1: {len(c1_pts)}")
compressed = rdp_local(c1_pts, epsilon=3.0)
print(f"Compressed points with epsilon=3m: {len(compressed)} ({len(compressed)/len(c1_pts)*100:.1f}%)")
