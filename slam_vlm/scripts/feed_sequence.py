import time
from pathlib import Path

import redis
import cv2
import numpy as np

DATA_ROOT = Path("/dockerMount/data/alumni")
IMG_DIR = DATA_ROOT / "images"
TS_FILE = DATA_ROOT / "timestamps.txt"

POSES_NPY      = DATA_ROOT / "poses_Tcw.npy"
POSE_TIMES_NPY = DATA_ROOT / "pose_times.npy"

r = redis.Redis(host="localhost", port=6379, db=0)


def load_entries():
    """Load timestamps + filenames from timestamps.txt."""
    entries = []
    with TS_FILE.open("r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            t_str, fname = line.split()
            t = float(t_str)
            entries.append((t, fname))
    return entries


def main():
    entries = load_entries()
    print(f"Loaded {len(entries)} frames from alumni")

    poses = []
    pose_times = []

    for i, (t_sim, fname) in enumerate(entries):
        img_path = IMG_DIR / fname
        # ORB-SLAM3 monocular pipeline expects grayscale here
        img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
        if img is None:
            print(f"[{i}] Failed to load {img_path}")
            continue

        # Send image to ORB-SLAM3 via Redis
        r.set("rawPinholeGrayImage", img.tobytes())
        r.set("orbSlam_newImageAvailable", 1)

        # Give SLAM a tiny bit of time
        time.sleep(0.01)

        # Try to read back pose
        pose_bytes = r.get("orbSlam_Pose")
        if pose_bytes is not None:
            mat = np.frombuffer(pose_bytes, dtype=np.float32)
            if mat.size == 16:
                T = mat.reshape(4, 4)
                poses.append(T)
                pose_times.append(t_sim)

        if i % 50 == 0:
            print(f"Feeding frame {i}/{len(entries)}: {fname}")

    poses = np.array(poses, dtype=np.float32)
    pose_times = np.array(pose_times, dtype=np.float64)

    print("Saved poses and times for alumni.")
    print("  poses shape     :", poses.shape)
    print("  pose_times shape:", pose_times.shape)

    np.save(POSES_NPY, poses)
    np.save(POSE_TIMES_NPY, pose_times)


if __name__ == "__main__":
    main()
