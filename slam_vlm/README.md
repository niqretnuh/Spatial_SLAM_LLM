".scripts/alumni_spatial_model.npy" holds the spatial model for alumni photo.
It contains spatial information, point cloud, path to image (its first appearance).

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

Wrapper class spatial_object_model.py can load dictionary -- but this is more for a demo. Our backend can just load alumni_spatial_model.py -- just remember that image path are "../alumni_images....", so adjust path when using it.