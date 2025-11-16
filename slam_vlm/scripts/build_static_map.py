import numpy as np

pts = np.load("/dockerMount/data/alumni/map_points.npy")
print("Loaded raw map points:", pts.shape)

max_points = 20000
if pts.shape[0] > max_points:
    idx = np.random.choice(pts.shape[0], max_points, replace=False)
    pts_ds = pts[idx]
    print(f"Downsampled to {pts_ds.shape[0]} points (random)")
else:
    pts_ds = pts
    print("No downsampling needed")

center = pts_ds.mean(axis=0)
dists = np.linalg.norm(pts_ds - center, axis=1)
# Keep points within some percentile of distance (e.g., 95%)
thr = np.percentile(dists, 95)
mask = dists < thr
pts_clean = pts_ds[mask]
print(f"After simple outlier trim: {pts_clean.shape[0]} points")

out_path = "/dockerMount/data/alumni/room1_static_map.ply"

with open(out_path, "w") as f:
    f.write("ply\n")
    f.write("format ascii 1.0\n")
    f.write(f"element vertex {pts_clean.shape[0]}\n")
    f.write("property float x\n")
    f.write("property float y\n")
    f.write("property float z\n")
    f.write("end_header\n")
    for x, y, z in pts_clean:
        f.write(f"{x} {y} {z}\n")

print("Saved PLY to", out_path)
