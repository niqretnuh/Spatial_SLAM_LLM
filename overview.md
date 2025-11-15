1. Product Vision & Scope

Vision:
Give a blind/low-vision user the ability to ask “Where did I leave the knife/cup/pan?” in a simple, non-cluttered kitchen and get a reliable spoken answer based on a rudimentary 3D model + object memory.

MVP demo goal (very concrete):

User walks around a small kitchen with a phone camera. The system:

Builds a 3D map of the room.

Detects + tracks a small set of objects (e.g., mug, pan, cutting board, knife).

Remembers the last known 3D position of each.

Via voice + LLM, answers: “Where did I last leave the mug?”.

2. Assumptions & Constraints

Kitchen is relatively uncluttered, good lighting, no crowds.

Only 1 user and 1 camera (handheld phone).

Objects: limit to 3–5 classes for MVP.

Camera stream goes to a host machine (laptop/desktop) running:

pyORB-SLAM3 for mapping & pose tracking. 
GitHub
+1

Object detection + tracking.

World-state DB + LLM API integration.

LLM is a cheap, small model (e.g., “mini”/“small” tier of any provider) used mainly as a semantic interface (not doing heavy vision).

3. High-Level System Architecture

Data flow:

Camera client (phone):

Captures RGB video (≥30 FPS, 720p is enough).

Streams frames to host over Wi-Fi (RTSP / WebRTC / custom socket).

SLAM & mapping (host):

pyORB-SLAM3 ingests frames, outputs:

Camera pose T_world_cam(t)

A sparse 3D map (keypoints/landmarks).

Map is resettable per “kitchen session”.

Object detection + 3D localization:

2D detection on incoming frames (YOLO-style).

Associate each detection with depth/position using SLAM map.

Fuse over time with a tracker to obtain stable 3D coordinates.

World state store:

For each object instance:

object_id, class, last_position_world, timestamp, zone_label.

LLM + voice interface:

STT → text → LLM.

LLM calls backend tools like:

get_last_location("mug")

Backend returns semantic description.

LLM generates response; TTS speaks to user.

4. Functional Requirements (MVP)
FR-1: Kitchen session map

FR-1.1: System shall start a mapping session when user begins scanning.

FR-1.2: System shall maintain a global world frame (origin fixed for the entire session).

FR-1.3: System shall visualize (for the dev) a basic 3D point cloud / keyframe graph for debugging.

FR-2: Object detection & classification

FR-2.1: System shall detect at least:

Mug

Pan

Knife (or any sharp tool)

Fire so we can warn user when they are near fire to stay away

Cutting board

FR-2.2: Detection confidence threshold configurable (e.g., ≥0.5).

FR-2.3: System shall run detection in (near) real-time (aim ≥5 FPS end-to-end for demo).

FR-3: 3D localization and tracking

FR-3.1: For each detection, system shall estimate a 3D position (x, y, z) in the world frame.

FR-3.2: System shall track objects over time and maintain an object_id for each instance.

FR-3.3: System shall update last known position when object location stabilizes (e.g., not moving for N frames).

FR-4: “Last known location” query

FR-4.1: System shall expose an API:

GET /objects/last_location?class=mug

FR-4.2: API shall return:

3D position

Human-readable semantic label like “on counter near the sink”.

FR-4.3: If object not seen in this session, system shall respond with a clear “unknown/not seen yet”.

FR-5: Voice/LLM interface

FR-5.1: System shall accept natural language questions:

“Where did I last leave the mug?”

FR-5.2: LLM shall map user question onto one or more tool calls (get_last_location, etc.).

FR-5.3: System shall return spoken answer, e.g.:

“Your mug was last seen on the counter directly in front of you, slightly to the left.”

5. Non-Functional Requirements

NFR-1: Latency:

End-to-end query latency (question → spoken answer) under ~2–3 seconds for MVP.

NFR-2: Robustness (MVP scope):

Works in a single, known kitchen under good lighting.

Handles small camera shakes; fails gracefully if tracking is lost (e.g., “I lost track of the map, please rescan the room.”).

NFR-3: Privacy:

Video stays local; only text metadata goes to LLM API.

NFR-4: Accessibility basics:

Can be operated without looking at a screen (keyboard shortcuts or a single physical button + voice).

6. Technology Stack & Platform Choice
6.1 You already chose: pyORB-SLAM3

Several Python bindings exist (pyOrbSlam3, orbslam3-python, etc.) that wrap ORB-SLAM3 for visual SLAM. 

+2
PyPI
+2

This gives you:

Monocular/stereo/RGB-D SLAM.

Pose + sparse map.

Good choice for research-y desktop/laptop pipeline.

6.2 setup 

Stable video streaming.

Known intrinsics / resolution.
So both iOS and Android are fine if you’re just treating the phone as a “smart webcam”.

If we want extra depth / scene semantics now or later, which ecosystem is nicer?

iOS / ARKit pros:

On LiDAR iPhones/iPads, ARKit gives high-quality depth maps and scene reconstruction (meshes, plane detection, scene geometry). 
Apple Developer
+2
docs.unity3d.com
+2

Strong, mature AR stack with Scene Geometry and LiDAR-based meshing tuned for indoor scenes. 
docs.unity3d.com
+1

Very good built-in accessibility (VoiceOver), handy for eventual on-device UX.

Given you’re using pyORB-SLAM3 on a host:

For the current MVP, the critical part is: “Can I reliably stream frames at a fixed resolution with known intrinsics?”

iOS with LiDAR gives you a very nice future path if you later decide to:

Offload mapping to ARKit instead of ORB-SLAM.

Fuse LiDAR depth with your detections.

Recommendation for this PDR:

Short term MVP (pyORB-SLAM3 + desktop): go with Android, because:

Cheap devices.

Easier experimentation with raw camera + streaming.

Future version (on-device / more semantics): plan iOS + ARKit on LiDAR devices as an upgrade path.

You can even keep this abstract in the PDR:

“Camera client must run on a commodity smartphone (Android preferred for MVP; iOS/ARKit as optional enhancement in later phases).”

7. What Needs to Be Implemented (Concrete Tasks)
7.1 Camera client app (phone)

Capture video at fixed resolution (e.g., 640×480 or 1280×720).

Expose camera intrinsics.

Stream frames to host (RTSP/WebRTC/custom TCP).

Simple UI:

Start/stop stream.

(Optional) audio pass-through for voice queries.

7.2 SLAM integration service (host)

Wrap pyORB-SLAM3 into a service that:

Accepts incoming frames.

Maintains a SLAM session (start/stop/reset).

Exposes current camera pose and, optionally, keyframe info via an internal API.

7.3 Object detection + 3D position estimation

Choose a small detector (e.g., YOLOv8n) trained/fine-tuned on your 3–5 kitchen objects.

For each frame:

Run detection.

Use pose + map to estimate depth / 3D coordinates.

Simplest: raycast to closest map point along the detection center line, or use triangulation via multiple views.

Maintain a tracker that smooths positions and assigns object_ids.

7.4 World-state database

Schema (could be SQLite/Postgres):

objects:

object_id (PK)

class (string)

last_x, last_y, last_z (floats)

last_seen_ts (timestamp)

zones:

zone_id, label, bounding volume

Logic:

Update object entries after each stable detection.

Map (x, y, z) to zone by checking if inside any zone volume.

7.5 Backend API & LLM tools

Backend HTTP or gRPC API:

GET /objects/last_location?class=knife

Returns JSON: { "found": true, "zone": "counter near sink", "relative_direction": "front-left", "distance_m": 0.8 }

LLM “tool” description:

A function the LLM can call when user asks about object location.

Simple prompt template:

System: “You are an assistant helping a blind cook locate objects. Use tools to get factual positions, then describe them in simple speech.”

7.6 Voice loop (for demo)

STT: use OS-level or low-cost API.

TTS: same.

Glue:

Button press → start listening → STT → LLM+tool → TTS answer.

8. Feasibility & Rough Effort Structure

Ignoring exact time numbers, you can think of the work in 3 main phases:

Core technical spine

Camera streaming + pyORB-SLAM3 working end-to-end.

Simple object detector gives 3D positions in the mapped room.

Memory + LLM interface

World-state DB.

Backend APIs.

LLM “tool calling” wired up; text-in/text-out.

Demo UX

Voice input/output.

A canned demo script:

Scan kitchen → place mug in two different locations → ask “Where did I leave the mug?” and get correct answer.