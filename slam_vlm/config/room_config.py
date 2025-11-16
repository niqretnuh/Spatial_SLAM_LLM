from pathlib import Path

DATA_ROOT = Path("/ABSOLUTE/PATH/TO/SLAM_YOLO/data/SCENE_NAME")
IMG_DIR = DATA_ROOT / "images"
TS_FILE = DATA_ROOT / "timestamps.txt"

# SLAM outputs
POSES_NPY       = DATA_ROOT / "poses_Tcw.npy"  
POSE_TIMES_NPY  = DATA_ROOT / "pose_times.npy"      
ROOM_POINTS_NPY = DATA_ROOT / "map_points_xyz.npy"  
OBJECT_MAP_NPY  = DATA_ROOT / "object_map.npy"    

# Camera intrinsics 
FX = 458.654
FY = 457.296
CX = 367.215
CY = 248.375

IMG_W = 752
IMG_H = 480

# Distortion coefficients
DIST_COEFFS = [-0.28340811, 0.07395907, 0.00019359, 1.76187114e-05]

# Scene-agnostic extras
MAX_FRAMES = 3000
MAX_DEPTH  = 50.0  
