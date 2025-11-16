import time
import redis
import numpy as np

r = redis.Redis(host="localhost", port=6379, db=0)

print("[info] Requesting map from ORB-SLAM via 'orbSlam_getMap' channel")
r.publish("orbSlam_getMap", 0)

raw = None
for i in range(50):  # up to ~5 seconds
    raw = r.get("orbSlam_Map")
    if raw is not None:
        break
    time.sleep(0.1)

if raw is None:
    raise RuntimeError(
        "orbSlam_Map is not set in Redis. "
        "Make sure redisConnectOrbSlam.py is running and that SLAM has processed frames."
    )

arr = np.frombuffer(raw, dtype=np.float32)
print("[info] Total floats in orbSlam_Map:", arr.size)

if arr.size == 0:
    raise RuntimeError("ORB-SLAM returned an EMPTY map (0 floats).")

# Try to infer layout
candidates = []
if arr.size % 3 == 0:
    candidates.append(("3-float", arr.size // 3))
if arr.size % 4 == 0:
    candidates.append(("4-float", arr.size // 4))
if arr.size % 6 == 0:
    candidates.append(("6-float", arr.size // 6))

print("[info] Possible interpretations (format, num_points):", candidates)

# Prefer 3-float xyz layout if available
if arr.size % 3 == 0:
    pts = arr.reshape(-1, 3)
elif arr.size % 4 == 0:
    pts = arr.reshape(-1, 4)[:, :3]
elif arr.size % 6 == 0:
    pts = arr.reshape(-1, 6)[:, :3]
else:
    raise ValueError(f"Unknown map format: {arr.size} floats (not divisible by 3/4/6).")

print("Map points shape:", pts.shape)
print("First few points:\n", pts[: min(5, pts.shape[0])])

if pts.shape[0] < 50:
    raise RuntimeError(
        f"Map only has {pts.shape[0]} points – SLAM likely didn’t map the scene correctly. "
        "Not saving map_points.npy to avoid poisoning downstream."
    )

out_path = "/dockerMount/data/alumni/map_points.npy"
np.save(out_path, pts.astype(np.float32))
print("Saved to", out_path)
