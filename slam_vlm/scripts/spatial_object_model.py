import numpy as np
import os

class SpatialObjectModel:
    def __init__(self, object_map_path):
        if not os.path.exists(object_map_path):
            raise FileNotFoundError(f"Object map file not found: {object_map_path}")
        self.object_map = np.load(object_map_path, allow_pickle=True).item()
        self.objects = {}
        for key, obj in self.object_map.items():
            self.objects[key] = {
                'label': obj.get('label'),
                'center': obj.get('center'),
                'indices': obj.get('indices'),
                'num_points': obj.get('num_points'),
                'bbox_min': obj.get('bbox_min'),
                'bbox_max': obj.get('bbox_max'),
                'num_obs': obj.get('num_obs'),
                'first_frame_idx': obj.get('first_frame_idx'),
                'first_bbox': obj.get('first_bbox'),
                'first_frame_path': obj.get('first_frame_path'),
                'position': obj.get('position'),
                'size': obj.get('size'),
                'point_cloud': obj.get('point_cloud'),
            }

    def get_object_keys(self):
        return list(self.objects.keys())

    def get_object_info(self, key):
        return self.objects.get(key)

    def get_object_by_label(self, label):
        return [k for k, v in self.objects.items() if v['label'].lower() == label.lower()]

    def distance_between_objects(self, key1, key2):
        obj1 = self.objects.get(key1)
        obj2 = self.objects.get(key2)
        if obj1 is None or obj2 is None:
            raise ValueError(f"One or both object keys not found: {key1}, {key2}")
        c1 = obj1['center']
        c2 = obj2['center']
        return float(np.linalg.norm(c1 - c2))

    def print_summary(self):
        print("SpatialObjectModel contains the following objects:")
        for key, obj in self.objects.items():
            print(f"{key:25s} label={obj['label']:15s} center={obj['center']} points={obj['num_points']:5d} obs={obj['num_obs']:4d}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Spatial Object Model Query Tool")
    parser.add_argument("--object_map_path", type=str, default="/home/qinh3/yolo/alumni/object_map_vlm_merged.npy")
    parser.add_argument("--summary", action="store_true", help="Print summary of all objects")
    parser.add_argument("--distance", nargs=2, metavar=("OBJ1", "OBJ2"), help="Compute distance between two object keys")
    args = parser.parse_args()

    model = SpatialObjectModel(args.object_map_path)
    if args.summary:
        model.print_summary()
    if args.distance:
        d = model.distance_between_objects(args.distance[0], args.distance[1])
        print(f"Distance between {args.distance[0]} and {args.distance[1]}: {d:.3f} meters")
