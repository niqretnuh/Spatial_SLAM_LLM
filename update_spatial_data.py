#!/usr/bin/env python3
"""
Update specific objects in the alumni spatial model with new distances and dimensions.
Distance is calculated as euclidean distance from (0,0,0) to center.
"""
import json
import math

def calculate_center_for_distance(target_distance):
    """Calculate a center position that gives the target distance from origin"""
    # For simplicity, we'll place the object along the positive z-axis
    return [0.0, 0.0, target_distance]

def update_spatial_model():
    # Load the JSON file
    with open('frontend/public/alumni_spatial_model.json', 'r') as f:
        data = json.load(f)
    
    print('=== UPDATING ALUMNI SPATIAL MODEL DATA ===')
    
    # Track changes
    changes = []
    
    # Process each frame's modifications
    for obj_id, obj_data in data.items():
        label = obj_data.get('label', '').lower()
        frame_idx = obj_data.get('first_frame_idx', -1)
        frame_name = f'frame_{str(frame_idx + 1).zfill(6)}.png'
        
        # Frame 000001.png modifications
        if frame_idx == 0:  # frame_000001.png
            if 'car' in label:
                obj_data['center'] = calculate_center_for_distance(17.0)
                obj_data['size'] = [3.0, 1.5, obj_data.get('size', [0,0,0])[2]]  # Keep existing height
                changes.append(f"Frame 1 - {obj_id} (car): distance=17m, size=3.0x1.5m")
                
            elif 'traffic' in label and 'light' in label:
                obj_data['center'] = calculate_center_for_distance(20.0)
                changes.append(f"Frame 1 - {obj_id} (traffic light): distance=20m")
                
            elif 'window' in label:
                obj_data['center'] = calculate_center_for_distance(6.0)
                changes.append(f"Frame 1 - {obj_id} (window): distance=6m")
                
            elif 'tree' in label:
                obj_data['center'] = calculate_center_for_distance(12.0)
                changes.append(f"Frame 1 - {obj_id} (tree): distance=12m")
        
        # Frame 000018.png modifications  
        elif frame_idx == 17:  # frame_000018.png
            if 'light' in label:
                obj_data['center'] = calculate_center_for_distance(18.0)
                obj_data['size'] = [2.3, 0.2, obj_data.get('size', [0,0,0])[2]]  # Keep existing height
                changes.append(f"Frame 18 - {obj_id} (light): distance=18m, size=2.3x0.2m")
        
        # Frame 000025.png modifications
        elif frame_idx == 24:  # frame_000025.png
            if 'bench' in label:
                # Remove bench by setting first_frame_idx to a non-existent frame
                obj_data['first_frame_idx'] = 999
                obj_data['first_frame_path'] = "../alumni_images/frame_999999.png"
                changes.append(f"Frame 25 - {obj_id} (bench): REMOVED from frame")
        
        # Frame 000033.png modifications
        elif frame_idx == 32:  # frame_000033.png
            if 'window' in label:
                obj_data['center'] = calculate_center_for_distance(15.0)
                changes.append(f"Frame 33 - {obj_id} (window): distance=15m")
                
            elif 'fence' in label or 'fense' in label:
                # Distance should be 10m (keep existing center if already ~10m, otherwise update)
                current_distance = math.sqrt(sum(x*x for x in obj_data.get('center', [0,0,0])))
                if abs(current_distance - 10.0) > 1.0:  # Only update if significantly different
                    obj_data['center'] = calculate_center_for_distance(10.0)
                obj_data['size'] = [6.0, 1.1, obj_data.get('size', [0,0,0])[2]]  # length=6m, width=1.1m
                changes.append(f"Frame 33 - {obj_id} (fence): distance=10m, size=6.0x1.1m")
        
        # Frame 000034.png modifications
        elif frame_idx == 33:  # frame_000034.png
            if 'tree' in label:
                current_size = obj_data.get('size', [0, 0, 0])
                current_distance = math.sqrt(sum(x*x for x in obj_data.get('center', [0,0,0])))
                
                # Check if this is the 0x0m tree or the 14.3m tree
                if current_size[0] == 0 and current_size[1] == 0:
                    # This is the 0x0m tree -> make it 3.2m x 1.6m and 14.3m away
                    obj_data['center'] = calculate_center_for_distance(14.3)
                    obj_data['size'] = [3.2, 1.6, current_size[2]]
                    changes.append(f"Frame 34 - {obj_id} (tree 0x0): distance=14.3m, size=3.2x1.6m")
                elif abs(current_distance - 14.3) < 2.0:  # This is the ~14.3m tree
                    # Update dimensions to 1.5m x 0.6m
                    obj_data['size'] = [1.5, 0.6, current_size[2]]
                    changes.append(f"Frame 34 - {obj_id} (tree 14.3m): distance=14.3m (kept), size=1.5x0.6m")
    
    # Save the updated JSON
    with open('frontend/public/alumni_spatial_model.json', 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f'\\nUpdated {len(changes)} objects:')
    for change in changes:
        print(f'  - {change}')
    
    print('\\n✅ Alumni spatial model updated successfully!')

if __name__ == "__main__":
    update_spatial_model()