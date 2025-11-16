#!/usr/bin/env python3
"""
Export alumni_spatial_model.npy to JSON format for frontend consumption.
"""
import json
import numpy as np
import os
from pathlib import Path

def export_spatial_model():
    """Export the .npy spatial model to JSON format."""
    
    # Path to the .npy file
    npy_path = Path("slam_vlm/scripts/alumni_spatial_model.npy")
    
    if not npy_path.exists():
        print(f"Error: {npy_path} not found!")
        return False
    
    try:
        # Load the .npy file
        print(f"Loading {npy_path}...")
        data = np.load(npy_path, allow_pickle=True)
        
        # Convert to regular Python objects (handle numpy types)
        def convert_numpy_types(obj):
            """Recursively convert numpy types to JSON-serializable types."""
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, dict):
                return {str(key): convert_numpy_types(value) for key, value in obj.items()}
            elif isinstance(obj, (list, tuple)):
                return [convert_numpy_types(item) for item in obj]
            else:
                return obj
        
        # Convert the data
        converted_data = convert_numpy_types(data.item() if data.ndim == 0 else data)
        
        # Export to JSON file in frontend/public/ so it's accessible via fetch
        output_path = Path("frontend/public/alumni_spatial_model.json")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"Exporting to {output_path}...")
        with open(output_path, 'w') as f:
            json.dump(converted_data, f, indent=2)
        
        print(f"✅ Successfully exported to {output_path}")
        
        # Show some stats
        if isinstance(converted_data, dict):
            object_map = converted_data.get('object_map', converted_data)
            if isinstance(object_map, dict):
                print(f"📊 Found {len(object_map)} objects in the spatial model")
                
                # Count objects per frame
                frame_counts = {}
                for obj_id, obj_data in object_map.items():
                    if isinstance(obj_data, dict) and 'first_frame_idx' in obj_data:
                        frame_idx = obj_data['first_frame_idx']
                        frame_name = f"frame_{str(frame_idx).zfill(6)}.png"
                        frame_counts[frame_name] = frame_counts.get(frame_name, 0) + 1
                
                # Show top frames by object count
                if frame_counts:
                    top_frames = sorted(frame_counts.items(), key=lambda x: x[1], reverse=True)[:5]
                    print("🎯 Top frames by object count:")
                    for frame, count in top_frames:
                        print(f"   {frame}: {count} objects")
        
        return True
        
    except Exception as e:
        print(f"❌ Error processing {npy_path}: {e}")
        return False

if __name__ == "__main__":
    success = export_spatial_model()
    if success:
        print("\n🎉 Export complete! The frontend can now fetch /alumni_spatial_model.json")
    else:
        print("\n💥 Export failed!")