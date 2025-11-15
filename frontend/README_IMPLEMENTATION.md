# Third Eye Visual Intelligence Platform

An AI-powered video analysis tool for accessibility and safety insights, featuring computer vision processing, LLM-based insights, and natural language interaction.

## Features Implemented

### 🎯 Core Functionality
- **Video Input**: Upload videos or record live using webcam
- **Domain Selection**: Choose analysis type (accessibility, safety, construction, etc.)
- **Live Video Feed**: Real-time webcam display for recording
- **CV Processing**: Object detection with depth estimation (placeholder endpoints)
- **Video Playback**: Annotated video player with overlays
- **AI Insights**: LLM-generated contextual insights
- **Chat Interface**: Natural language queries about video content
- **Voice Interface**: Speech-to-text and text-to-speech integration

### 🖥️ New Layout Design
- **Side-by-side Interface**: Video input and domain selection on top
- **Integrated Chat & Voice**: Bottom section with chat and voice side by side
- **Live Video Display**: Webcam feed visible during recording
- **Processing Status**: Real-time feedback during video analysis

### ♿ Accessibility Features
- Full keyboard navigation support
- Screen reader compatibility (ARIA labels)
- Voice control for hands-free operation
- High contrast mode support
- Reduced motion support for accessibility
- Audio feedback for all interactions

## Project Structure

```
frontend/
├── src/
│   ├── components/           # UI Components
│   │   ├── VideoInput.tsx    # Video upload/record component
│   │   ├── VideoPlayer.tsx   # Annotated video player
│   │   ├── DomainSelection.tsx # Analysis domain selection
│   │   ├── ChatInterface.tsx # Enhanced chat interface
│   │   ├── VoiceInterface.tsx # Voice control interface
│   │   └── SlamVisualization3D.tsx # SLAM visualization
│   │
│   ├── hooks/               # Custom React Hooks
│   │   ├── useVideoProcessing.ts # Video processing logic
│   │   ├── useLLMChat.ts    # Enhanced with video context
│   │   ├── useVoiceInterface.ts # Voice I/O handling
│   │   └── useSLAM.ts       # SLAM session management
│   │
│   ├── services/            # API Services
│   │   └── api.ts           # Extended with video endpoints
│   │
│   ├── types/               # TypeScript Definitions
│   │   └── index.ts         # Video processing types added
│   │
│   ├── App.tsx              # Redesigned main layout
│   └── App.css              # Updated styling
│
└── package.json             # Dependencies
```

## Installation & Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The application will be available at `http://localhost:3000`

## Backend API Requirements

The frontend expects these endpoints (with placeholder implementations):

### Video Processing
```
POST /api/process-video        # Upload and process video
GET  /api/process-video/{id}/status  # Check processing status
GET  /api/cv-results/{id}     # Get CV pipeline results
POST /api/generate-insights   # Generate AI insights
GET  /api/insights/{id}       # Get video insights
POST /api/query-insights      # Query insights with questions
GET  /api/processed-video/{id} # Get processed video file
```

### Existing Endpoints
```
GET  /api/objects/last_location  # Object location queries
GET  /api/objects              # All detected objects
POST /api/llm/chat             # LLM chat (enhanced with video context)
POST /api/llm/query            # LLM queries with tool calling
POST /api/slam/start           # Start SLAM session
POST /api/slam/stop            # Stop SLAM session
GET  /api/slam/status          # Get SLAM status
GET  /api/slam/pose            # Get camera pose
POST /api/voice/tts            # Text-to-speech
GET  /api/slam/visualization   # SLAM 3D visualization
```

## New Features in Detail

### 1. Video Input Component
- **File Upload**: Drag & drop or file picker for video files (MP4, MOV, AVI, WebM)
- **Live Recording**: Browser-based video recording using MediaRecorder API
- **Webcam Display**: Live camera feed visible while recording
- **Preview**: Show selected/recorded video before processing
- **Progress Feedback**: Visual progress during upload and processing

### 2. Video Player with Overlays
- **Synchronized Playback**: Video timeline synced with CV frame data
- **Object Overlays**: Real-time bounding boxes drawn on canvas
- **Severity Colors**: Different colors for insight severity levels
- **Interactive Objects**: Click objects to get detailed insights
- **Insights Display**: Visual indicators for objects with AI insights
- **Custom Controls**: Play/pause, timeline scrubbing, frame navigation

### 3. Domain Selection
- **Pre-defined Domains**: 
  - Accessibility Analysis (low vision safety)
  - Construction Safety (OSHA compliance) 
  - Fall Prevention (hazard detection)
  - General Insights (comprehensive analysis)
- **Custom Domain**: Free-text input for specific analysis needs
- **Context Passing**: Selected domain influences LLM insights

### 4. Enhanced Chat Interface
- **Video Context**: Automatically includes video information in queries
- **Status Indicators**: Shows CV and insights processing status
- **Object Queries**: Ask specific questions about detected objects
- **Export Functionality**: Download conversation as JSON
- **Tool Calling**: LLM can call functions to get video data

### 5. Voice Interface Improvements
- **Hands-free Operation**: Complete voice control for accessibility
- **Auto-send**: Optional automatic sending of voice transcripts
- **Visual Feedback**: Recording status and confidence indicators
- **Export Support**: Save voice interaction history

## Data Flow

```
1. User uploads/records video
2. Domain selection for analysis type
3. Video processing (CV pipeline) - placeholder
4. AI insight generation using LLM
5. Annotated video playback with overlays
6. Interactive chat about video content
7. Voice queries for accessibility
```

## Browser Compatibility

| Browser | Video Input | Voice Recognition | Full Features |
|---------|-------------|-------------------|---------------|
| Chrome  | ✅ Full     | ✅ Full          | ✅ Complete   |
| Edge    | ✅ Full     | ✅ Full          | ✅ Complete   |
| Firefox | ✅ Full     | ❌ No SpeechAPI  | ⚠️ Limited   |
| Safari  | ✅ Full     | ⚠️ Limited      | ⚠️ Limited   |

**Recommended**: Chrome or Edge for full functionality

## Mock Data for Testing

For demonstration purposes, the app includes mock CV and insight data when backend endpoints are not available:

```javascript
// Mock CV Results
{
  video_id: "demo-123",
  fps: 30,
  frames: [
    {
      time: 1.0,
      objects: [
        {
          id: "obj_1", 
          label: "ladder",
          bbox: [100, 100, 200, 300],
          depth: 2.8,
          confidence: 0.92
        }
      ]
    }
  ]
}

// Mock Insights
{
  "frame_1000": [
    {
      object_id: "obj_1",
      insight: "Ladder not properly secured. OSHA violation.",
      severity: "high"
    }
  ]
}
```

## Development Commands

```bash
npm run dev              # Start development server
npm run build            # Production build  
npm run preview          # Preview production build
npm run lint             # Lint TypeScript code
```

## Key Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Axios** - HTTP client for API calls
- **Web APIs**:
  - MediaRecorder for video recording
  - getUserMedia for webcam access
  - Web Speech API for voice recognition
  - Canvas API for video overlays

## Accessibility Compliance

The application follows WCAG guidelines:
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Voice control
- ✅ High contrast mode
- ✅ Reduced motion support
- ✅ Proper ARIA labeling
- ✅ Focus management

## Next Steps for Backend Integration

1. **Implement Video Processing API**: Create endpoints for CV pipeline
2. **LLM Integration**: Set up insight generation service
3. **File Storage**: Configure video file storage (S3, local, etc.)
4. **WebSocket Support**: Real-time processing updates
5. **Authentication**: User management and session handling

## Performance Considerations

- Video files limited to 400MB max size
- Canvas rendering optimized for 30fps overlay performance
- Efficient API polling for processing status
- Lazy loading of components and resources
- Optimized bundle size with tree shaking

---

**Status**: ✅ Frontend implementation complete and ready for backend integration

The application provides a complete user interface for video-based AI analysis with full accessibility support, ready to be connected to backend services for computer vision and LLM processing.