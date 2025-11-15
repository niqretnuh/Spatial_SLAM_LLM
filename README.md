# Spatial SLAM LLM - Frontend

A React + TypeScript web application for the Spatial SLAM LLM system, providing an accessible interface for blind/low-vision users to locate objects in their environment using AI and computer vision.

## Features

### 🎤 Voice Interface
- **Speech Recognition**: Real-time speech-to-text with interim results
- **Text-to-Speech**: Audio feedback for responses
- **Voice History**: Export all voice interactions as JSON
- **Accessibility**: Full keyboard navigation and screen reader support

### 💬 LLM Chat Interface
- **Natural Language Queries**: Ask about object locations in plain English
- **Tool Calling**: LLM integration with backend SLAM/object detection APIs
- **Conversation History**: View and export all chat interactions
- **JSON Export**: Save conversations and tool calls for analysis

### 📦 Object Visualization
- **Real-time Object Detection**: See all detected objects with 3D positions
- **Object Location Query**: Find specific objects by class
- **Zone Information**: Objects categorized by spatial zones
- **JSON Export**: Export individual or all object data

### 🗺️ SLAM Integration
- **Session Management**: Start/stop SLAM tracking
- **Live Status**: Real-time tracking status and metrics
- **Pose Information**: Camera position and orientation tracking

## Architecture

### Hooks (Custom React Hooks)
All hooks return JSON-formatted responses suitable for display or export:

- **`useObjectQuery`**: Query object locations in the SLAM system
- **`useLLMChat`**: Chat interface with LLM tool calling support
- **`useVoiceInterface`**: Speech recognition and synthesis
- **`useSLAM`**: SLAM session management

### API Service Layer
TypeScript client for backend communication:
- Object detection API
- LLM chat and query endpoints
- SLAM session control
- Text-to-speech synthesis

### Components
- **`VoiceInterface`**: Voice input/output controls
- **`ChatInterface`**: LLM conversation UI
- **`ObjectVisualization`**: Object detection display and query
- **`App`**: Main application with navigation and SLAM status

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Backend SLAM/LLM server running (default: `localhost:8000`)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:3000`

### Configuration

Backend API endpoint can be configured in `vite.config.ts`:

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',  // Your backend URL
      changeOrigin: true,
    },
  },
}
```

## Usage

### 1. Start SLAM Session
Click "▶️ Start SLAM" in the header to initialize the SLAM tracking system.

### 2. Chat with LLM
Navigate to the Chat tab and ask questions like:
- "Where did I leave the mug?"
- "Can you find my knife?"
- "Where is the cutting board?"

### 3. Use Voice Interface
Go to the Voice tab:
1. Click "Press to Speak" to start recording
2. Ask your question
3. The system will respond with text-to-speech

### 4. View Objects
Check the Objects tab to:
- See all detected objects
- Query specific object locations
- Export object data as JSON

## JSON Response Format

All hooks provide JSON-formatted responses for easy integration:

### Object Query Response
```json
{
  "query": "mug",
  "timestamp": "2025-11-14T10:30:00Z",
  "response": {
    "found": true,
    "zone": "counter near sink",
    "relative_direction": "front-left",
    "distance_m": 0.8,
    "object": {
      "object_id": "obj_123",
      "class": "mug",
      "last_position": { "x": 1.2, "y": 0.5, "z": 0.3 }
    }
  }
}
```

### LLM Chat Response
```json
{
  "conversationId": "conv-123",
  "timestamp": "2025-11-14T10:30:00Z",
  "userMessage": "Where is my mug?",
  "assistantResponse": "Your mug is on the counter near the sink...",
  "toolCalls": [
    {
      "name": "get_last_location",
      "parameters": { "class": "mug" },
      "result": { "found": true, "zone": "counter near sink" }
    }
  ]
}
```

## Accessibility Features

- **Keyboard Navigation**: Full app control without mouse
- **Screen Reader Support**: ARIA labels and roles throughout
- **High Contrast Mode**: Automatic adaptation for high contrast preferences
- **Reduced Motion**: Respects `prefers-reduced-motion` setting
- **Focus Indicators**: Clear focus outlines on interactive elements
- **Voice Control**: Complete voice-driven operation

## Development

### Project Structure
```
frontend/
├── src/
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API client
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Type Safety
All API responses and component props are fully typed with TypeScript for better developer experience and reliability.

### Code Style
- ESLint configured for TypeScript and React
- Strict mode enabled
- Accessibility rules enforced

## Backend Integration

This frontend expects a backend server with the following endpoints:

- `GET /api/objects/last_location?class={className}` - Query object location
- `GET /api/objects` - Get all detected objects
- `POST /api/llm/chat` - Send chat message to LLM
- `POST /api/llm/query` - Query with tool calling
- `POST /api/slam/start` - Start SLAM session
- `POST /api/slam/stop` - Stop SLAM session
- `GET /api/slam/status` - Get SLAM status
- `GET /api/slam/pose` - Get current camera pose
- `POST /api/voice/tts` - Text-to-speech synthesis

See `src/services/api.ts` for complete API specification.

## License

Part of the Spatial SLAM LLM project for accessible indoor navigation.
