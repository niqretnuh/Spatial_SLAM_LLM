# System Architecture & Data Flow

This document describes the architecture and data flow of the Spatial SLAM LLM frontend application.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Chat      │  │    Voice     │  │   Objects    │          │
│  │  Interface   │  │  Interface   │  │Visualization │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Custom Hooks Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │useObjectQuery│  │  useLLMChat  │  │useVoiceInter-│          │
│  │              │  │              │  │    face      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐                                               │
│  │   useSLAM    │                                               │
│  │              │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
├─────────────────────────────────────────────────────────────────┤
│                      API Client (Axios)                          │
│                   Type-Safe HTTP Requests                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Backend APIs                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Object   │  │   LLM    │  │  SLAM    │  │  Voice   │       │
│  │Detection │  │   API    │  │  System  │  │   TTS    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Object Location Query Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ Clicks "Find Mug"
     ↓
┌────────────────────┐
│ ObjectVisualization│
│    Component       │
└────┬───────────────┘
     │ Calls queryObject('mug')
     ↓
┌────────────────────┐
│  useObjectQuery    │
│      Hook          │
└────┬───────────────┘
     │ 1. Set loading state
     │ 2. Call API
     ↓
┌────────────────────┐
│   API Client       │
│ (services/api.ts)  │
└────┬───────────────┘
     │ GET /api/objects/last_location?class=mug
     ↓
┌────────────────────┐
│  Backend Server    │
│ (Object Detection) │
└────┬───────────────┘
     │ Returns JSON
     ↓
┌────────────────────┐
│   API Client       │
│  (Parse Response)  │
└────┬───────────────┘
     │ Returns ApiResponse<ObjectLocationResponse>
     ↓
┌────────────────────┐
│  useObjectQuery    │
│      Hook          │
└────┬───────────────┘
     │ 1. Update state
     │ 2. Log JSON
     │ 3. Trigger re-render
     ↓
┌────────────────────┐
│ ObjectVisualization│
│    Component       │
└────┬───────────────┘
     │ Displays result
     ↓
┌──────────┐
│   User   │
│  Sees    │
│ Result   │
└──────────┘
```

### 2. LLM Chat Flow with Tool Calling

```
┌──────────┐
│   User   │
└────┬─────┘
     │ Types: "Where is my mug?"
     ↓
┌────────────────────┐
│  ChatInterface     │
│    Component       │
└────┬───────────────┘
     │ Calls sendMessage()
     ↓
┌────────────────────┐
│   useLLMChat       │
│      Hook          │
└────┬───────────────┘
     │ 1. Add user message
     │ 2. Call API
     ↓
┌────────────────────┐
│   API Client       │
└────┬───────────────┘
     │ POST /api/llm/chat
     │ Body: { message, context }
     ↓
┌────────────────────┐
│  Backend LLM       │
│    Service         │
└────┬───────────────┘
     │ 1. Process message
     │ 2. Identify need for tool
     │ 3. Call get_last_location("mug")
     ↓
┌────────────────────┐
│ Object Detection   │
│     Service        │
└────┬───────────────┘
     │ Returns location data
     ↓
┌────────────────────┐
│  Backend LLM       │
│    Service         │
└────┬───────────────┘
     │ Generates natural language response
     │ Returns JSON with tool calls
     ↓
┌────────────────────┐
│   API Client       │
└────┬───────────────┘
     │ Returns LLMChatResponse
     ↓
┌────────────────────┐
│   useLLMChat       │
│      Hook          │
└────┬───────────────┘
     │ 1. Add assistant message
     │ 2. Store tool calls
     │ 3. Log JSON
     ↓
┌────────────────────┐
│  ChatInterface     │
│    Component       │
└────┬───────────────┘
     │ Displays message with tool info
     ↓
┌──────────┐
│   User   │
│  Sees    │
│ Response │
└──────────┘
```

### 3. Voice-Activated Query Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ Clicks "Press to Speak"
     ↓
┌────────────────────┐
│  VoiceInterface    │
│    Component       │
└────┬───────────────┘
     │ Calls startListening()
     ↓
┌────────────────────┐
│ useVoiceInterface  │
│      Hook          │
└────┬───────────────┘
     │ 1. Initialize Web Speech API
     │ 2. Start recognition
     ↓
┌────────────────────┐
│  Browser Speech    │
│  Recognition API   │
└────┬───────────────┘
     │ User speaks: "Where is my mug?"
     ↓
┌────────────────────┐
│ useVoiceInterface  │
│      Hook          │
└────┬───────────────┘
     │ 1. Get transcript
     │ 2. Log JSON
     │ 3. Update state
     ↓
┌────────────────────┐
│  VoiceInterface    │
│    Component       │
└────┬───────────────┘
     │ Transcript complete, trigger callback
     ↓
┌────────────────────┐
│   App Component    │
│ (handleVoiceTranscript)
└────┬───────────────┘
     │ Forward to LLM chat
     ↓
┌────────────────────┐
│   useLLMChat       │
│      Hook          │
└────┬───────────────┘
     │ Process as normal chat
     │ (see LLM Chat Flow)
     ↓
┌────────────────────┐
│  LLM Response      │
└────┬───────────────┘
     │ Returns text response
     ↓
┌────────────────────┐
│ useVoiceInterface  │
│      Hook          │
└────┬───────────────┘
     │ Calls speak(response)
     ↓
┌────────────────────┐
│  Backend TTS API   │
│  (or browser TTS)  │
└────┬───────────────┘
     │ Audio generated
     ↓
┌────────────────────┐
│ useVoiceInterface  │
│      Hook          │
└────┬───────────────┘
     │ 1. Play audio
     │ 2. Log synthesis JSON
     ↓
┌──────────┐
│   User   │
│  Hears   │
│ Response │
└──────────┘
```

### 4. SLAM Session Management Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ Clicks "Start SLAM"
     ↓
┌────────────────────┐
│   App Component    │
└────┬───────────────┘
     │ Calls startSession()
     ↓
┌────────────────────┐
│    useSLAM Hook    │
└────┬───────────────┘
     │ POST /api/slam/start
     ↓
┌────────────────────┐
│  Backend SLAM      │
│    Service         │
└────┬───────────────┘
     │ 1. Initialize ORB-SLAM3
     │ 2. Start camera stream
     │ 3. Begin tracking
     ↓
┌────────────────────┐
│    useSLAM Hook    │
└────┬───────────────┘
     │ 1. Store session data
     │ 2. Start polling for updates
     ↓
┌────────────────────┐
│  Polling Interval  │
│   (every 1 sec)    │
└────┬───────────────┘
     │ GET /api/slam/status
     │ GET /api/slam/pose
     ↓
┌────────────────────┐
│  Backend SLAM      │
│    Service         │
└────┬───────────────┘
     │ Returns current status & pose
     ↓
┌────────────────────┐
│    useSLAM Hook    │
└────┬───────────────┘
     │ Update state with new data
     ↓
┌────────────────────┐
│   App Component    │
└────┬───────────────┘
     │ Display updated status
     ↓
┌──────────┐
│   User   │
│  Sees    │
│ Live     │
│ Status   │
└──────────┘
```

## Component Interaction Map

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                             │
│  ┌────────────────────────────────────────────────┐    │
│  │  Header (SLAM Status & Controls)               │    │
│  │  - Uses useSLAM()                              │    │
│  │  - Shows session status                        │    │
│  │  - Start/Stop buttons                          │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Navigation Tabs                               │    │
│  │  - Chat | Objects | Voice                      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Main Content Area                             │    │
│  │                                                 │    │
│  │  ┌──────────────────────────────────────────┐ │    │
│  │  │  ChatInterface                           │ │    │
│  │  │  - Uses useLLMChat()                     │ │    │
│  │  │  - Uses useVoiceInterface() for TTS      │ │    │
│  │  └──────────────────────────────────────────┘ │    │
│  │                                                 │    │
│  │  ┌──────────────────────────────────────────┐ │    │
│  │  │  ObjectVisualization                     │ │    │
│  │  │  - Uses useObjectQuery()                 │ │    │
│  │  └──────────────────────────────────────────┘ │    │
│  │                                                 │    │
│  │  ┌──────────────────────────────────────────┐ │    │
│  │  │  VoiceInterface                          │ │    │
│  │  │  - Uses useVoiceInterface()              │ │    │
│  │  └──────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Footer                                        │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## State Management

### Hook State Flow

Each custom hook manages its own state:

```typescript
// useObjectQuery
{
  data: ObjectLocationResponse | null,
  objects: DetectedObject[],
  isLoading: boolean,
  error: string | null
}

// useLLMChat
{
  messages: ChatMessage[],
  isLoading: boolean,
  error: string | null,
  lastResponse: LLMChatResponse | null,
  toolCalls: ToolCall[]
}

// useVoiceInterface
{
  isListening: boolean,
  transcript: string,
  interimTranscript: string,
  confidence: number,
  isSpeaking: boolean,
  error: string | null,
  voiceHistory: VoiceInteraction[]
}

// useSLAM
{
  session: SLAMSession | null,
  currentPose: CameraPose | null,
  isLoading: boolean,
  error: string | null
}
```

### State Updates

```
User Action
    ↓
Component Event Handler
    ↓
Hook Function Call
    ↓
setState() in Hook
    ↓
Component Re-render
    ↓
Updated UI
```

## API Request/Response Cycle

### Request Flow
```
1. Component calls hook function
2. Hook sets loading state
3. Hook calls API client method
4. API client constructs HTTP request
5. Request sent to backend
6. Backend processes request
7. Backend returns JSON response
8. API client wraps response in ApiResponse<T>
9. Hook updates state with data
10. Component receives updated state
11. UI re-renders with new data
```

### Error Handling
```
Backend Error
    ↓
API Client catches error
    ↓
Returns ApiResponse with success=false
    ↓
Hook sets error state
    ↓
Component displays error message
```

## JSON Data Format Examples

### Object Query JSON
```json
{
  "query": "mug",
  "timestamp": "2025-11-14T10:30:00.000Z",
  "response": {
    "found": true,
    "zone": "counter",
    "relative_direction": "front-left",
    "distance_m": 0.8,
    "object": {
      "object_id": "obj_123",
      "class": "mug",
      "last_position": { "x": 1.2, "y": 0.5, "z": 0.3 },
      "last_seen_ts": "2025-11-14T10:29:00.000Z",
      "zone_label": "counter"
    },
    "message": "Your mug was found on the counter"
  }
}
```

### LLM Chat JSON
```json
{
  "conversationId": "conv-abc123",
  "timestamp": "2025-11-14T10:30:00.000Z",
  "userMessage": "Where is my mug?",
  "assistantResponse": "Your mug is on the counter near the sink",
  "toolCalls": [
    {
      "name": "get_last_location",
      "parameters": { "class": "mug" },
      "result": {
        "found": true,
        "zone": "counter near sink"
      }
    }
  ],
  "objects": [...]
}
```

### Voice Interaction JSON
```json
{
  "type": "recognition",
  "text": "Where is my mug",
  "timestamp": "2025-11-14T10:30:00.000Z",
  "confidence": 0.95
}
```

## Performance Optimizations

### React Optimizations
- `useCallback` for memoized functions
- `useMemo` for computed values
- Conditional rendering to avoid unnecessary updates
- Component lazy loading with React.lazy()

### API Optimizations
- Request debouncing for search inputs
- Response caching for repeated queries
- Parallel requests where possible
- Automatic retry logic for failed requests

### Bundle Optimizations
- Code splitting by route
- Tree shaking unused code
- Minification and compression
- CSS optimization

## Security Considerations

### Frontend Security
- API proxy hides backend URL
- No sensitive data in localStorage
- HTTPS required for voice API
- Input sanitization before API calls
- TypeScript prevents type-based vulnerabilities

### Backend Communication
- CORS properly configured
- Authentication tokens (if implemented)
- Rate limiting on API calls
- Error messages don't leak sensitive info

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CDN (Optional)                    │
│              (CloudFront, Cloudflare)                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│               Static File Host                       │
│          (Vercel, Netlify, S3, etc.)                │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │     index.html + JS/CSS bundles            │    │
│  └────────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ API requests proxied to:
                   ↓
┌─────────────────────────────────────────────────────┐
│              Backend API Server                      │
│           (localhost:8000 in dev)                    │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   Object    │  │     LLM     │  │    SLAM    │ │
│  │  Detection  │  │   Service   │  │   System   │ │
│  └─────────────┘  └─────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Monitoring & Logging

### Client-Side Logging
All hooks log JSON to console:
- Object queries
- LLM interactions
- Voice recognition/synthesis
- SLAM status updates
- API errors

### Export Functionality
Users can export:
- Individual object data
- Complete conversation history
- Voice interaction logs
- Analysis reports

All exports are timestamped JSON files saved to Downloads.

---

This architecture provides a scalable, maintainable, and accessible frontend for the Spatial SLAM LLM system. The hook-based design ensures clean separation of concerns, while the JSON-first approach ensures all data is transparent and exportable.
