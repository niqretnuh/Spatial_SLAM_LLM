# Dummy CV Pipeline Data for Testing LLM Safety Analysis

dummy_cv_results = {
    "video_id": "workplace_safety_001",
    "duration": 10.0,
    "fps": 30.0,
    "frames": [
        {
            "frame_number": 0,
            "time": 0.0,
            "objects": [
                {
                    "id": "obj_1",
                    "label": "ladder",
                    "bbox": [150, 200, 250, 600],  # [x1, y1, x2, y2] in pixels
                    "xyz_coordinates": {
                        "x": 2.5,  # meters from camera (lateral position)
                        "y": 0.0,  # floor level
                        "z": 3.2   # meters away from camera (depth)
                    },
                    "depth": 3.2,

                },
                {
                    "id": "obj_2",
                    "label": "doorway",
                    "bbox": [140, 150, 280, 650],
                    "xyz_coordinates": {
                        "x": 2.4,  
                        "y": 0.0,
                        "z": 3.5
                    },
                    "depth": 3.5,

                },
                {
                    "id": "obj_3",
                    "label": "heavy_equipment",
                    "bbox": [450, 100, 550, 200],
                    "xyz_coordinates": {
                        "x": 0.0,  
                        "y": 2.8,  
                        "z": 5.0
                    },
                    "depth": 5.0,
                    
                },
                {
                    "id": "obj_4",
                    "label": "overhead_shelf",
                    "bbox": [130, 120, 270, 180],
                    "xyz_coordinates": {
                        "x": 2.5,  
                        "y": 2.3,  
                        "z": 3.0   
                    },
                    "depth": 3.0,
                },
                {
                    "id": "obj_5",
                    "label": "worker",
                    "bbox": [500, 350, 600, 650],
                    "xyz_coordinates": {
                        "x": -1.5,
                        "y": 0.0,
                        "z": 4.0
                    },
                    "depth": 4.0,
                }
            ]
        },
        {
            "frame_number": 90,
            "time": 3.0,
            "objects": [
                {
                    "id": "obj_1",
                    "label": "ladder",
                    "bbox": [150, 200, 250, 600],
                    "xyz_coordinates": {
                        "x": 2.5,
                        "y": 0.0,
                        "z": 3.2
                    },
                    "depth": 3.2,
                },
                {
                    "id": "obj_2",
                    "label": "doorway",
                    "bbox": [140, 150, 280, 650],
                    "xyz_coordinates": {
                        "x": 2.4,
                        "y": 0.0,
                        "z": 3.5
                    },
                    "depth": 3.5,

                },
                {
                    "id": "obj_3",
                    "label": "heavy_equipment",
                    "bbox": [450, 100, 550, 200],
                    "xyz_coordinates": {
                        "x": 0.0,
                        "y": 2.8,
                        "z": 5.0
                    },
                    "depth": 5.0,
                    
                },
                {
                    "id": "obj_4",
                    "label": "overhead_shelf",
                    "bbox": [130, 120, 270, 180],
                    "xyz_coordinates": {
                        "x": 2.5,
                        "y": 2.3,
                        "z": 3.0
                    },
                    "depth": 3.0,

                },
                {
                    "id": "obj_5",
                    "label": "worker",
                    "bbox": [180, 250, 240, 580],  
                    "xyz_coordinates": {
                        "x": 2.3,  
                        "y": 0.0,
                        "z": 3.3
                    },
                    "depth": 3.3,

                }
            ]
        },
        {
            "frame_number": 180,
            "time": 6.0,
            "objects": [
                {
                    "id": "obj_1",
                    "label": "ladder",
                    "bbox": [150, 200, 250, 600],
                    "xyz_coordinates": {
                        "x": 2.5,
                        "y": 0.0,
                        "z": 3.2
                    },
                    "depth": 3.2,

                },
                {
                    "id": "obj_2",
                    "label": "doorway",
                    "bbox": [140, 150, 280, 650],
                    "xyz_coordinates": {
                        "x": 2.4,
                        "y": 0.0,
                        "z": 3.5
                    },
                    "depth": 3.5,

                },
                {
                    "id": "obj_3",
                    "label": "heavy_equipment",
                    "bbox": [450, 100, 550, 200],
                    "xyz_coordinates": {
                        "x": 0.0,
                        "y": 2.8,
                        "z": 5.0
                    },
                    "depth": 5.0,
                },
                {
                    "id": "obj_4",
                    "label": "overhead_shelf",
                    "bbox": [130, 120, 270, 180],
                    "xyz_coordinates": {
                        "x": 2.5,
                        "y": 2.3,
                        "z": 3.0
                    },
                    "depth": 3.0,

                },
                {
                    "id": "obj_5",
                    "label": "worker",
                    "bbox": [160, 180, 230, 550],  
                    "xyz_coordinates": {
                        "x": 2.5,
                        "y": 1.8,  
                        "z": 3.2
                    },
                    "depth": 3.2,

                },
                {
                    "id": "obj_6",
                    "label": "hard_hat",
                    "bbox": [175, 175, 215, 210],
                    "xyz_coordinates": {
                        "x": 2.5,
                        "y": 2.1,  
                        "z": 3.2
                    },
                    "depth": 3.2,

                }
            ]
        }
    ]
}