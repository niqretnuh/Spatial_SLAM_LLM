Below is a clean, engineering-ready requirements list for your system. It separates functional requirements, non-functional requirements, data formats, API expectations, and UI/UX requirements — so engineers can immediately begin implementation.

⸻

📘 Product Requirements Document (PRD) — “Third Eye” Visual Intelligence Platform

1. Core Concept

A web-based tool that allows users to upload or record a video, runs a computer vision pipeline to extract object detections + depth estimates, then uses an LLM/VLM to generate domain-specific insights.
Users replay the annotated video with visual overlays and interact via chat or voice.

⸻

2. Functional Requirements

2.1 Video Input

Upload
	•	Support .mp4, .mov, .avi, .webm.
	•	Enable drag-and-drop and file picker.
	•	Client uploads file using multipart/form-data to backend endpoint /process-video.

Record
	•	Access webcam using navigator.mediaDevices.getUserMedia().
	•	Implement in-browser recording using MediaRecorder API or react-webcam.
	•	Capture video as .webm blob.
	•	Upload blob to the same /process-video endpoint.

Preview
	•	Show video thumbnail or first frame once selected.
	•	Allow user to click “Process Video.”

⸻

2.2 CV Pipeline Processing (Backend)
	•	Accept uploaded video or recorded blob.
	•	Run the existing CV pipeline on server or GPU node.
	•	Extract:
	•	per-frame timestamps
	•	bounding boxes (pixel coords)
	•	object labels
	•	object depth estimates (in meters or normalized units)
	•	optional segmentation masks
	•	Store results in a structured, frame-indexed format (JSON).

Output JSON Format

Engineers must return structured results as:

{
  "video_id": "123abc",
  "fps": 30,
  "frames": [
    {
      "time": 0.033,
      "objects": [
        {
          "id": "obj_1",
          "label": "ladder",
          "bbox": [x1, y1, x2, y2],
          "depth": 2.8
        }
      ]
    }
  ]
}

	•	Store processed results in DB or filesystem associated with video_id.

⸻

2.3 Domain Selection
	•	User selects analysis mode:
	•	Accessibility (low vision safety)
	•	Construction OSHA safety
	•	Fall-prevention
	•	General insight mode
	•	Custom: user text input describing domain
	•	Selected mode is included in LLM prompt.

⸻

2.4 Insight Generation (LLM/VLM Integration)
	•	Backend takes CV pipeline results + user domain input.
	•	Sends structured prompt to LLM (OpenAI API or internal VLM).
	•	LLM returns frame-specific or object-specific insights, e.g.:

{
  "frame_131": [
    {
      "object_id": "obj_1",
      "insight": "This ladder is not secured at its base. OSHA 1926.1053(b)(6)."
    }
  ]
}

	•	Cache or store LLM results linked to video_id.

⸻

2.5 Annotated Video Playback (Frontend)

Video Player
	•	Use native <video> tag or react-player.
	•	Support:
	•	play/pause
	•	timeline scrub
	•	frame-accurate time matching

Overlay Layer (Canvas)
	•	Use react-konva for drawing overlays.
	•	For each frame:
	•	Draw bounding boxes from CV JSON.
	•	Display label & depth next to box.
	•	Display LLM insights anchored to objects.
	•	Allow click on a box to show extended insight in sidebar.

Synchronization
	•	Every requestAnimationFrame, align the current video time with nearest CV frame.
	•	Update overlay layers accordingly.

⸻

2.6 Chat Interface
	•	User can ask questions via text or speech.
	•	Questions + selected video_id sent to backend /query-insights.
	•	Backend passes user question + CV results + LLM insights → LLM.
	•	LLM returns contextual answer about the video.

Examples:
	•	“What hazards do you see here?”
	•	“Explain anything dangerous within 3 meters.”
	•	“Summarize accessibility issues.”

⸻

2.7 Voice Interface
	•	Implement microphone button using Web Speech API or Whisper.
	•	Convert voice → text.
	•	Send text to LLM.
	•	Display results.

⸻

3. Non-Functional Requirements

Performance
	•	Video upload max size: 400MB.
	•	Pipeline processing must handle 30–60 fps.
	•	Overlay rendering must maintain 30fps on mid-tier laptops.

Scalability
	•	CV pipeline should be containerized (Docker) for GPU option.
	•	Support parallel processing via queue or job runner (optional for MVP).

Security
	•	Sanitize user-uploaded files.
	•	No long-term storage of videos unless user opts in.
	•	HTTPS required.

Cross-Platform
	•	Fully functional on Chrome, Safari, Firefox.
	•	Mobile recording optional but not required for MVP.

⸻

4. Technical Stack Requirements

Frontend
	•	React
	•	react-konva (canvas overlays)
	•	TailwindCSS (UI)
	•	react-webcam or MediaRecorder API (video record)
	•	React Query or Axios (API communication)

Backend
	•	FastAPI / Flask / Node.js (engineers choose)
	•	Video upload & storage (local FS, S3, or Supabase)
	•	CV pipeline runner (Python)
	•	OpenAI or custom LLM API
	•	Redis or DB for caching results (optional)

Data Storage
	•	/uploads/{video_id}.mp4
	•	/results/{video_id}.json (CV annotations)
	•	/insights/{video_id}.json (LLM insights)

⸻

5. End-to-End Processing Flow
	1.	User uploads / records video
	2.	Backend stores video
	3.	CV pipeline runs → generates annotations JSON
	4.	User selects domain or describes their goal
	5.	LLM generates contextual insights
	6.	Frontend displays annotated video with overlays
	7.	User interacts via chat/voice for deeper insight
	8.	Optional: export annotated video or insights

⸻

6. Success Criteria (MVP)
	•	Users can upload or record a video.
	•	CV pipeline runs and outputs object labels + depth.
	•	LLM generates contextual insights for the domain selected.
	•	Annotated video playback with overlays is smooth and synchronized.
	•	User can ask natural-language questions and get useful interpretations.

⸻

If you want, I can also produce:
	•	a backend API spec
	•	a wireframe UI mockup
	•	a task-level engineering roadmap
	•	a one-page pitch for hackathon judges

Just tell me what you want next.