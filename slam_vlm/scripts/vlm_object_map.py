import os
from pathlib import Path
from collections import defaultdict
import sys

import numpy as np
import cv2

import torch
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
import clip  # OpenAI CLIP
from PIL import Image

from alumni_config import (
    DATA_ROOT,
    ROOM_POINTS_NPY,
    OBJECT_MAP_NPY,
    POSES_NPY,
    POSE_TIMES_NPY,
    FX, FY, CX, CY,
    IMG_W, IMG_H,
)
from clip_labels import CANDIDATE_LABELS

IMG_DIR = DATA_ROOT / "images"
TS_FILE = DATA_ROOT / "timestamps.txt"

MAX_FRAMES = 2000
MAX_DEPTH = 30.0

_device = "cuda" if torch.cuda.is_available() else "cpu"

# GroundingDINO (open-vocab detection) + CLIP (embeddings)
_GDINO_MODEL_NAME = "IDEA-Research/grounding-dino-base"

print(f"[info] Loading GroundingDINO model: {_GDINO_MODEL_NAME}")
gd_processor = AutoProcessor.from_pretrained(_GDINO_MODEL_NAME)
gd_model = AutoModelForZeroShotObjectDetection.from_pretrained(
    _GDINO_MODEL_NAME
).to(_device)
gd_model.eval()

print("[info] Loading CLIP ViT-B/32 for instance embeddings")
_clip_model, _clip_preprocess = clip.load("ViT-B/32", device=_device)
_clip_model.eval()

# VLM detection + CLIP embedding
def vlm_detect_and_segment(img_bgr, text_prompts, min_score=0.25):
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w = img_rgb.shape[:2]

    prompt_str = " . ".join(text_prompts)

    inputs = gd_processor(
        images=img_rgb,
        text=prompt_str,
        return_tensors="pt"
    ).to(_device)

    with torch.no_grad():
        outputs = gd_model(**inputs)

    # Post-process to get boxes / scores / labels
    results = gd_processor.post_process_grounded_object_detection(
        outputs=outputs,
        input_ids=inputs.input_ids,
        box_threshold=min_score,
        text_threshold=0.25,
        target_sizes=[(h, w)],
    )[0]
    # results keys: "boxes" (N,4), "scores" (N,), "labels" (list[str])

    boxes = results["boxes"].cpu().numpy()       # (N, 4) xyxy
    scores = results["scores"].cpu().numpy()     # (N,)
    label_spans = results["labels"]             # list of strings

    detections = []

    for box_xyxy, score, span in zip(boxes, scores, label_spans):
        if score < min_score:
            continue

        x1, y1, x2, y2 = box_xyxy.tolist()

        # Crop for CLIP embedding
        x1i = max(0, int(np.floor(x1)))
        y1i = max(0, int(np.floor(y1)))
        x2i = min(w - 1, int(np.ceil(x2)))
        y2i = min(h - 1, int(np.ceil(y2)))

        if x2i <= x1i or y2i <= y1i:
            continue

        crop_rgb = img_rgb[y1i:y2i, x1i:x2i]
        if crop_rgb.size == 0:
            continue

        pil_crop = Image.fromarray(crop_rgb)
        clip_input = _clip_preprocess(pil_crop).unsqueeze(0).to(_device)

        with torch.no_grad():
            feat = _clip_model.encode_image(clip_input)
            feat = feat / feat.norm(dim=-1, keepdim=True)

        feat_np = feat[0].cpu().numpy()

        detections.append(
            {
                "label": span,             
                "score": float(score),
                "bbox": (x1, y1, x2, y2),
                "mask": None,             
                "feat": feat_np,
            }
        )

    return detections

# Debug visualization
DEBUG_DIR = Path("./debug_vlm_room_spatial")
DEBUG_DIR.mkdir(exist_ok=True)  # ensure folder exists
print(f"[info] Debug VLM frames dir: {DEBUG_DIR}")

def draw_debug_boxes(img_bgr, detections, frame_idx):
    img = img_bgr.copy()

    for det in detections:
        label = det["label"]
        score = det["score"]
        (x1, y1, x2, y2) = det["bbox"]

        cv2.rectangle(
            img,
            (int(x1), int(y1)),
            (int(x2), int(y2)),
            (0, 255, 0),
            2,
        )

        text = f"{label} ({score:.2f})"
        cv2.putText(
            img,
            text,
            (int(x1), max(int(y1) - 10, 0)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 0),
            2,
        )

    out_path = DEBUG_DIR / f"vlm_frame_{frame_idx:05d}.jpg"
    cv2.imwrite(str(out_path), img)

# "Is same object" logic (CLIP + label + geometry)
def cosine_similarity(a, b, eps=1e-8):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + eps))

def vlm_is_same_object(
    feat_a,
    feat_b,
    label_a,
    label_b,
    center_a=None,
    center_b=None,
    cos_thresh=0.60,
    dist_thresh=0.8,
):
    """
    Decide whether two instances correspond to the same physical object.
    """
    # 1) Label gate
    la = label_a.strip().lower()
    lb = label_b.strip().lower()
    if la != lb:
        return False, 0.0, None

    # 2) CLIP similarity
    sim = cosine_similarity(feat_a, feat_b)
    if sim < cos_thresh:
        return False, sim, None

    # 3) geometry gate
    dist = None
    if center_a is not None and center_b is not None:
        dist = float(np.linalg.norm(center_a - center_b))
        if dist > dist_thresh:
            return False, sim, dist

    return True, sim, dist

def load_poses_and_times():
    T_all = np.load(POSES_NPY)        
    t_all = np.load(POSE_TIMES_NPY)    
    print("Loaded poses:", T_all.shape)
    print("Loaded times:", t_all.shape)
    return T_all, t_all

def load_map_points():
    pts = np.load(ROOM_POINTS_NPY)     
    print("Loaded map points:", pts.shape)
    return pts

def load_image_list():
    timestamps = []
    filenames = []
    with TS_FILE.open("r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            t_str, fname = line.split()
            t = float(t_str)
            timestamps.append(t)
            filenames.append(fname)
    timestamps = np.array(timestamps)
    print("Loaded image list:", len(filenames), "frames")
    return timestamps, filenames

def project_points(K, R_cw, t_cw, pts_w):
    X_c = pts_w @ R_cw.T + t_cw.reshape(1, 3)  
    z = X_c[:, 2]

    z_safe = np.where(np.abs(z) < 1e-6, 1e-6, z)
    valid = z_safe > 0.1

    x = X_c[:, 0] / z_safe
    y = X_c[:, 1] / z_safe
    u = K[0, 0] * x + K[0, 2]
    v = K[1, 1] * y + K[1, 2]

    valid &= (u >= 0) & (u < IMG_W) & (v >= 0) & (v < IMG_H)

    uv = np.stack([u, v], axis=1)
    return uv, z_safe, valid

def mask_points_in_detection(uv_valid, valid_idx, det, img_shape):
    u1, v1, u2, v2 = det["bbox"]
    in_box = (
        (uv_valid[:, 0] >= u1) & (uv_valid[:, 0] <= u2) &
        (uv_valid[:, 1] >= v1) & (uv_valid[:, 1] <= v2)
    )

    if det["mask"] is None:
        return valid_idx[in_box]

    mask = det["mask"]
    H, W = img_shape[:2]
    if mask.shape != (H, W):
        mask = cv2.resize(mask.astype(np.uint8), (W, H),
                          interpolation=cv2.INTER_NEAREST).astype(bool)

    uv_det = uv_valid[in_box]
    u_int = uv_det[:, 0].astype(int)
    v_int = uv_det[:, 1].astype(int)
    inside_mask = mask[v_int, u_int]

    local_idx = np.where(in_box)[0][inside_mask]
    return valid_idx[local_idx]

class ObjectTrack:
    def __init__(self, track_id, label, center_3d, feat, frame_idx, init_indices, first_bbox=None, first_frame_path=None):
        self.id = track_id
        self.label = label
        self.center_3d = center_3d.astype(np.float32)
        self.feat = feat.astype(np.float32)
        self.last_seen = frame_idx
        self.point_indices = set(init_indices.tolist())
        self.num_obs = 1
        # Store first detection info for visualization
        self.first_frame_idx = frame_idx
        self.first_bbox = first_bbox  # (x1, y1, x2, y2) in pixels
        self.first_frame_path = first_frame_path  # path to the image file

def match_to_tracks(detection, center_3d, tracks, frame_idx,
                    cos_thresh=0.75, dist_thresh=5.0):
    best_track = None
    best_score = -1.0
    
    # Get detection label for filtering
    det_label = detection["label"].strip().lower()

    for tr in tracks:
        tr_label = tr.label.strip().lower()
        
        # LABEL GATE: Only consider tracks with same label
        if tr_label != det_label:
            continue

        # Compute CLIP similarity
        sim = cosine_similarity(detection["feat"], tr.feat)
        if sim < cos_thresh:
            continue
            
        # Compute 3D distance
        dist = np.linalg.norm(center_3d - tr.center_3d)
        if dist > dist_thresh:
            continue

        # Combined score: emphasize similarity, lightly penalize distance
        score = sim - 0.01 * dist  # Reduced distance penalty
        
        if score > best_score:
            best_score = score
            best_track = tr
            
        # Debug output for potential merges
        if sim > 0.7:  # Log high-similarity candidates
            print(f"    [match] {det_label} detection vs track_{tr.id}: "
                  f"sim={sim:.3f}, dist={dist:.1f}m, score={score:.3f} "
                  f"{'✓MATCH' if score == best_score else '✗skip'}")

    return best_track

# Main VLM object map builder
def build_vlm_object_map():
    # Intrinsics
    K = np.array([[FX, 0,  CX],
                  [0,  FY, CY],
                  [0,  0,  1]], dtype=np.float32)

    T_all, t_all = load_poses_and_times()
    map_pts = load_map_points()
    img_ts, img_files = load_image_list()

    N = min(len(T_all), len(img_files), MAX_FRAMES)
    print(f"[info] Using first {N} frames")

    tracks = []         # list[ObjectTrack]
    next_track_id = 0
    track_to_indices = defaultdict(set)  # track_id -> set of map_pt indices

    for i in range(N):
        T_cw = T_all[i]
        R_cw = T_cw[:3, :3]
        t_cw = T_cw[:3, 3]

        img_path = IMG_DIR / img_files[i]
        img = cv2.imread(str(img_path))
        if img is None:
            print(f"[{i}] Failed to load image:", img_path)
            continue

        # 1) VLM detection
        detections = vlm_detect_and_segment(
            img_bgr=img,
            text_prompts=CANDIDATE_LABELS,
            min_score=0.25,
        )
        if not detections:
            if i % 50 == 0:
                print(f"[{i}] No VLM detections.")
            continue

        if i % 5 == 0:
            print(f"[DEBUG] Writing VLM debug frame {i} (dets={len(detections)})")
            draw_debug_boxes(img, detections, i)

        # 2) Project map points into this frame
        uv, depth, valid = project_points(K, R_cw, t_cw, map_pts)
        valid_idx = np.where(valid & (depth < MAX_DEPTH))[0]
        if valid_idx.size == 0:
            continue

        uv_valid = uv[valid_idx]

        for det in detections:
            label = det["label"]
            score = det["score"]
            if score < 0.25:
                continue

            # 3) Which map points belong to this detection?
            obj_indices = mask_points_in_detection(
                uv_valid, valid_idx, det, img_shape=img
            )
            if obj_indices.size == 0:
                continue

            pts_obj = map_pts[obj_indices]
            center_3d = pts_obj.mean(axis=0)

            # 4) Track association with debug info
            if i % 10 == 0:  # Debug every 10 frames
                print(f"  [frame {i}] Processing {label} detection (score={score:.2f})")
                
            matched = match_to_tracks(det, center_3d, tracks, i)

            if matched is None:
                # NEW TRACK
                tr = ObjectTrack(
                    track_id=next_track_id,
                    label=label,
                    center_3d=center_3d,
                    feat=det["feat"],
                    frame_idx=i,
                    init_indices=obj_indices,
                    first_bbox=det["bbox"],  # (x1, y1, x2, y2)
                    first_frame_path=str(img_path)  # Path to image file
                )
                tracks.append(tr)
                track_to_indices[tr.id].update(obj_indices.tolist())
                
                if i % 10 == 0:
                    print(f"    → NEW TRACK {next_track_id} ({label})")
                    
                next_track_id += 1
            else:
                # UPDATE TRACK (EMA in 3D + CLIP space)
                alpha = 1.0 / (matched.num_obs + 1)
                matched.center_3d = (1 - alpha) * matched.center_3d + alpha * center_3d
                matched.feat = (1 - alpha) * matched.feat + alpha * det["feat"]
                matched.feat = matched.feat / (np.linalg.norm(matched.feat) + 1e-8)
                matched.last_seen = i
                matched.num_obs += 1
                matched.point_indices.update(obj_indices.tolist())
                track_to_indices[matched.id].update(obj_indices.tolist())
                
                if i % 10 == 0:
                    print(f"    → MERGED with track {matched.id} (obs={matched.num_obs})")

        if i % 10 == 0:
            # Frame-level summary
            label_counts = defaultdict(int)
            for tr in tracks:
                root_label = tr.label.split('_')[0].strip().lower()
                label_counts[root_label] += 1
            
            print(f"  [frame {i}] Current totals: " + 
                  ", ".join([f"{lbl}={cnt}" for lbl, cnt in sorted(label_counts.items())]))
            print(f"  [frame {i}] Total tracks: {len(tracks)}")
            print()

    print(f"[info] Finished online tracking with {len(tracks)} tracks")

    # Group tracks by label for summary
    label_counts = defaultdict(int)
    for tr in tracks:
        root_label = tr.label.split('_')[0].strip().lower()
        label_counts[root_label] += 1
    
    print("\n[DEBUG] Final track counts by label:")
    for label, count in sorted(label_counts.items()):
        print(f"  {label}: {count}")

    # Build final 3D object map
    object_map = {}
    track_to_indices = defaultdict(set)  # Rebuild for final output
    
    # Rebuild track_to_indices for final tracks
    for tr in tracks:
        track_to_indices[tr.id] = tr.point_indices

    for tr in tracks:
        idx = np.array(sorted(track_to_indices[tr.id]), dtype=int)
        if idx.size == 0:
            continue

        pts = map_pts[idx]
        center = pts.mean(axis=0)
        bbox_min = pts.min(axis=0)
        bbox_max = pts.max(axis=0)

        key = f"{tr.label}_{tr.id}"
        object_map[key] = {
            "label": tr.label,
            "center": center,
            "indices": idx,
            "num_points": int(pts.shape[0]),
            "bbox_min": bbox_min,
            "bbox_max": bbox_max,
            "num_obs": tr.num_obs,
            # for visualization
            "first_frame_idx": tr.first_frame_idx,
            "first_bbox": tr.first_bbox,  # (x1, y1, x2, y2) in pixels
            "first_frame_path": tr.first_frame_path,  # Path to source image
            "position": center,  # Alias for center (visualization compatibility)
            "size": bbox_max - bbox_min,  # 3D size (width, height, depth) in meters
            "point_cloud": pts,  # The actual 3D points belonging to this object
        }

    out_path = OBJECT_MAP_NPY
    np.save(out_path, object_map, allow_pickle=True)
    print(f"\n[info] Saved VLM object map to {out_path}")
    print("Summary:")
    for name, info in object_map.items():
        c = info["center"]
        print(
            f"{name:25s} label={info['label']:15s} "
            f"center={c} points={info['num_points']:5d} obs={info['num_obs']:4d}"
        )

if __name__ == "__main__":
    build_vlm_object_map()