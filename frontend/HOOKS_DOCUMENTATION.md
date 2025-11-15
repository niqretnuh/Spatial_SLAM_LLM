# LLM Integration Hooks Documentation

This document provides detailed information about the React hooks designed for LLM integration in the Spatial SLAM system. All hooks are designed to return JSON-formatted responses that can be displayed in the UI or exported for later analysis.

## Overview

The frontend provides four main custom hooks for different aspects of the system:

1. **useObjectQuery** - Query and retrieve object locations
2. **useLLMChat** - Chat interface with LLM tool calling
3. **useVoiceInterface** - Speech recognition and synthesis
4. **useSLAM** - SLAM session management

All hooks follow consistent patterns:
- Return structured data with loading/error states
- Provide JSON-formatted responses
- Include export functionality
- Support real-time updates

---

## 1. useObjectQuery Hook

### Purpose
Query object locations in the SLAM-mapped environment and retrieve detailed position information.

### Usage

```typescript
import { useObjectQuery } from '@/hooks';

function MyComponent() {
  const {
    data,           // Current query result
    objects,        // All detected objects
    isLoading,      // Loading state
    error,          // Error message
    queryObject,    // Function to query by class
    getAllObjects,  // Function to fetch all objects
    reset,          // Reset state
  } = useObjectQuery();

  // Query specific object
  const handleQuery = () => {
    queryObject('mug');
  };

  // Fetch all objects
  useEffect(() => {
    getAllObjects();
  }, []);
}
```

### Return Values

#### `data: ObjectLocationResponse | null`
```typescript
{
  found: boolean;
  object?: {
    object_id: string;
    class: string;
    last_position: { x: number; y: number; z: number };
    last_seen_ts: string;
    zone_label?: string;
  };
  zone?: string;
  relative_direction?: string;
  distance_m?: number;
  message: string;
}
```

#### `objects: DetectedObject[]`
Array of all detected objects in the environment.

### JSON Output Format

When querying an object, the hook logs a JSON response:

```json
{
  "query": "mug",
  "timestamp": "2025-11-14T10:30:00.000Z",
  "response": {
    "found": true,
    "zone": "counter near sink",
    "relative_direction": "front-left",
    "distance_m": 0.8,
    "object": {
      "object_id": "obj_abc123",
      "class": "mug",
      "last_position": {
        "x": 1.2,
        "y": 0.5,
        "z": 0.3
      },
      "last_seen_ts": "2025-11-14T10:29:45.000Z",
      "zone_label": "counter"
    },
    "message": "Your mug was found on the counter near the sink"
  }
}
```

### Export Functionality

```typescript
import { downloadJSON } from '@/hooks';

// Export single object
downloadJSON(object, `object-${object.object_id}.json`);

// Export all objects
const exportData = {
  timestamp: new Date().toISOString(),
  totalObjects: objects.length,
  objects,
};
downloadJSON(exportData, 'all-objects.json');
```

---

## 2. useLLMChat Hook

### Purpose
Interact with the LLM for natural language queries about object locations. Supports tool calling for backend integration.

### Usage

```typescript
import { useLLMChat } from '@/hooks';

function ChatComponent() {
  const {
    messages,           // Chat history
    isLoading,          // Loading state
    error,              // Error message
    lastResponse,       // Latest LLM response
    sendMessage,        // Send chat message
    clearHistory,       // Clear chat history
    exportConversation, // Export as JSON
    toolCalls,          // All tool calls made
  } = useLLMChat();

  const handleSend = async () => {
    await sendMessage("Where did I leave the mug?");
  };
}
```

### Return Values

#### `messages: ChatMessage[]`
```typescript
{
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}
```

#### `lastResponse: LLMChatResponse | null`
```typescript
{
  response: string;
  toolCalls?: ToolCall[];
  objects?: DetectedObject[];
  timestamp: string;
}
```

#### `toolCalls: ToolCall[]`
```typescript
{
  name: string;
  parameters: Record<string, any>;
  result?: any;
}
```

### JSON Output Format

Each LLM interaction is logged as JSON:

```json
{
  "conversationId": "conv-1731580200000-abc123",
  "timestamp": "2025-11-14T10:30:00.000Z",
  "userMessage": "Where is my mug?",
  "assistantResponse": "Your mug is on the counter near the sink, directly in front of you.",
  "toolCalls": [
    {
      "name": "get_last_location",
      "parameters": {
        "class": "mug"
      },
      "result": {
        "found": true,
        "zone": "counter near sink",
        "relative_direction": "front-left",
        "distance_m": 0.8
      }
    }
  ],
  "objects": [
    {
      "object_id": "obj_abc123",
      "class": "mug",
      "last_position": { "x": 1.2, "y": 0.5, "z": 0.3 }
    }
  ]
}
```

### Export Full Conversation

```typescript
// Exports entire conversation with metadata
const handleExport = () => {
  exportConversation();
};

// Exported JSON format:
{
  "conversationId": "conv-1731580200000-abc123",
  "exportedAt": "2025-11-14T10:35:00.000Z",
  "messageCount": 6,
  "messages": [...],
  "toolCalls": [...]
}
```

---

## 3. useVoiceInterface Hook

### Purpose
Provide speech-to-text and text-to-speech capabilities for hands-free operation.

### Usage

```typescript
import { useVoiceInterface } from '@/hooks';

function VoiceComponent() {
  const {
    isListening,        // Currently recording
    transcript,         // Final transcript
    interimTranscript,  // Live interim results
    confidence,         // Recognition confidence
    isSpeaking,         // Currently speaking
    startListening,     // Start recording
    stopListening,      // Stop recording
    speak,              // Speak text
    stopSpeaking,       // Stop speaking
    error,              // Error message
    isSupported,        // Browser support
    voiceHistory,       // All interactions
    exportVoiceHistory, // Export as JSON
  } = useVoiceInterface();

  const handleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSpeak = async () => {
    await speak("Your mug is on the counter");
  };
}
```

### Return Values

#### `voiceHistory: VoiceInteraction[]`
```typescript
{
  type: 'recognition' | 'synthesis';
  text: string;
  timestamp: string;
  confidence?: number;  // Only for recognition
}
```

### JSON Output Format

#### Speech Recognition
```json
{
  "type": "recognition",
  "text": "Where is my mug",
  "timestamp": "2025-11-14T10:30:00.000Z",
  "confidence": 0.95
}
```

#### Speech Synthesis
```json
{
  "type": "synthesis",
  "text": "Your mug is on the counter near the sink",
  "timestamp": "2025-11-14T10:30:05.000Z"
}
```

### Export Voice History

```typescript
// Exports all voice interactions
const handleExport = () => {
  exportVoiceHistory();
};

// Exported JSON format:
{
  "exportedAt": "2025-11-14T10:35:00.000Z",
  "interactionCount": 12,
  "interactions": [
    {
      "type": "recognition",
      "text": "Where is my mug",
      "timestamp": "2025-11-14T10:30:00.000Z",
      "confidence": 0.95
    },
    {
      "type": "synthesis",
      "text": "Your mug is on the counter",
      "timestamp": "2025-11-14T10:30:05.000Z"
    }
  ]
}
```

### Browser Compatibility

The hook uses the Web Speech API:
- **Speech Recognition**: Chrome, Edge, Safari 
- **Speech Synthesis**: All modern browsers

Fallback behavior is included for unsupported browsers.

---

## 4. useSLAM Hook

### Purpose
Manage SLAM session state and camera tracking.

### Usage

```typescript
import { useSLAM } from '@/hooks';

function SLAMComponent() {
  const {
    session,        // Current session info
    currentPose,    // Camera pose
    isTracking,     // Tracking active
    startSession,   // Start SLAM
    stopSession,    // Stop SLAM
    refreshStatus,  // Refresh status
    isLoading,      // Loading state
    error,          // Error message
  } = useSLAM();

  useEffect(() => {
    startSession();
    return () => stopSession();
  }, []);
}
```

### Return Values

#### `session: SLAMSession | null`
```typescript
{
  sessionId: string;
  status: 'idle' | 'initializing' | 'tracking' | 'lost';
  startTime: string;
  keyframeCount: number;
  mapPointCount: number;
}
```

#### `currentPose: CameraPose | null`
```typescript
{
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  timestamp: string;
}
```

---

## Integration Examples

### Complete Query Flow

```typescript
function ObjectLocator() {
  const { queryObject, data } = useObjectQuery();
  const { speak } = useVoiceInterface();
  const { sendMessage } = useLLMChat();

  const handleQuery = async (objectClass: string) => {
    // 1. Query the object
    await queryObject(objectClass);
    
    // 2. If found, speak the result
    if (data?.found && data.message) {
      await speak(data.message);
    }
    
    // 3. Log to LLM for context
    await sendMessage(`User queried: ${objectClass}`);
  };
}
```

### Voice-Driven Chat

```typescript
function VoiceChat() {
  const { transcript, isListening, startListening, stopListening } = useVoiceInterface();
  const { sendMessage, lastResponse } = useLLMChat();
  const { speak } = useVoiceInterface();

  useEffect(() => {
    if (transcript && !isListening) {
      // Send transcript to LLM
      sendMessage(transcript);
    }
  }, [transcript, isListening]);

  useEffect(() => {
    if (lastResponse) {
      // Speak the response
      speak(lastResponse.response);
    }
  }, [lastResponse]);

  return (
    <button onClick={isListening ? stopListening : startListening}>
      {isListening ? 'Stop' : 'Start'} Voice Chat
    </button>
  );
}
```

---

## Best Practices

### 1. Error Handling
Always check error states and provide user feedback:

```typescript
const { error, data } = useObjectQuery();

if (error) {
  return <ErrorDisplay message={error} />;
}
```

### 2. Loading States
Show loading indicators during async operations:

```typescript
const { isLoading, queryObject } = useObjectQuery();

return (
  <button disabled={isLoading} onClick={() => queryObject('mug')}>
    {isLoading ? 'Searching...' : 'Find Object'}
  </button>
);
```

### 3. Data Export
Regularly export data for analysis and debugging:

```typescript
// Export on significant events
useEffect(() => {
  if (data?.found) {
    downloadJSON(data, `query-result-${Date.now()}.json`);
  }
}, [data]);
```

### 4. Cleanup
Clean up resources in useEffect:

```typescript
useEffect(() => {
  const { stopListening } = useVoiceInterface();
  return () => stopListening();
}, []);
```

---

## API Backend Requirements

These hooks expect specific backend endpoints. See `src/services/api.ts` for complete specifications:

### Object Detection
- `GET /api/objects/last_location?class={class}`
- `GET /api/objects`

### LLM
- `POST /api/llm/chat`
- `POST /api/llm/query`

### SLAM
- `POST /api/slam/start`
- `POST /api/slam/stop`
- `GET /api/slam/status`
- `GET /api/slam/pose`

### Voice
- `POST /api/voice/tts`

---

## TypeScript Types

All types are defined in `src/types/index.ts`. Key types include:

- `ObjectLocationResponse`
- `LLMChatResponse`
- `ChatMessage`
- `ToolCall`
- `DetectedObject`
- `SLAMSession`
- `CameraPose`
- `VoiceInteraction`

Import types as needed:

```typescript
import type { ObjectLocationResponse, DetectedObject } from '@/types';
```

---

## Testing

When testing hooks, ensure:

1. Mock API responses in `src/services/api.ts`
2. Test loading and error states
3. Verify JSON output format
4. Check accessibility features
5. Test voice API browser compatibility

---

## Troubleshooting

### Voice Not Working
- Check browser compatibility (Chrome recommended)
- Verify microphone permissions
- Check for HTTPS (required for speech recognition)

### LLM Not Responding
- Verify backend is running
- Check API proxy configuration in `vite.config.ts`
- Review network tab for failed requests

### Objects Not Loading
- Ensure SLAM session is started
- Check object detection backend is running
- Verify camera feed is streaming

---

## Future Enhancements

Potential improvements for the hooks:

1. **WebSocket Support**: Real-time object updates
2. **Offline Mode**: Cache responses for offline use
3. **Multi-language**: Support multiple languages for voice
4. **Custom TTS Voices**: Allow voice selection

---

For more information, see the main README.md or contact the development team.
