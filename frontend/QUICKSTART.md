# Quick Start Guide - Spatial SLAM LLM Frontend

Get up and running with the Spatial SLAM LLM web application in minutes.

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm** or **yarn**: Package manager
- **Backend Server**: SLAM/LLM backend running (default: `http://localhost:8000`)

## Installation

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- React 18.2
- TypeScript 5.2
- Vite 5.0
- Axios for API calls
- All necessary development tools

### 3. Start Development Server

```bash
npm run dev
```

The application will start at **http://localhost:3000**

## First Run

### Step 1: Verify Backend Connection

Open your browser to `http://localhost:3000`. Check the header for SLAM status:

- ✅ **Green dot**: Backend connected, SLAM tracking
- ⚫ **Gray dot**: Not started or backend unavailable

### Step 2: Start SLAM Session

Click the **"▶️ Start SLAM"** button in the header to initialize tracking.

### Step 3: Test the Chat Interface

1. Click the **💬 Chat** tab
2. Type or ask: "Where did I leave the mug?"
3. The LLM will respond with object location

### Step 4: Try Voice Interface

1. Click the **🎤 Voice** tab
2. Click **"Press to Speak"**
3. Allow microphone access when prompted
4. Ask: "Where is my knife?"
5. Listen to the spoken response

### Step 5: View Objects

1. Click the **📦 Objects** tab
2. See all detected objects
3. Use the dropdown to query specific object locations

## Configuration

### Backend API URL

Edit `frontend/vite.config.ts` to change the backend URL:

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://your-backend-url:8000',  // Change this
      changeOrigin: true,
    },
  },
}
```

### Environment Variables

Create `.env` file (optional):

```bash
VITE_API_URL=http://localhost:8000
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React UI components
│   │   ├── ChatInterface.tsx
│   │   ├── VoiceInterface.tsx
│   │   └── ObjectVisualization.tsx
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useObjectQuery.ts      # Object location queries
│   │   ├── useLLMChat.ts          # LLM chat interface
│   │   ├── useVoiceInterface.ts   # Voice I/O
│   │   └── useSLAM.ts             # SLAM management
│   │
│   ├── services/           # API client
│   │   └── api.ts                 # Backend communication
│   │
│   ├── types/              # TypeScript definitions
│   │   └── index.ts
│   │
│   ├── App.tsx             # Main application
│   └── main.tsx            # Entry point
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Usage Examples

### Query an Object

```typescript
import { useObjectQuery } from '@/hooks';

function MyComponent() {
  const { queryObject, data } = useObjectQuery();

  const findMug = async () => {
    await queryObject('mug');
    console.log(data); // JSON response
  };

  return <button onClick={findMug}>Find Mug</button>;
}
```

### Chat with LLM

```typescript
import { useLLMChat } from '@/hooks';

function MyChat() {
  const { sendMessage, messages } = useLLMChat();

  return (
    <div>
      {messages.map(msg => (
        <div>{msg.content}</div>
      ))}
      <button onClick={() => sendMessage('Where is my pan?')}>
        Ask
      </button>
    </div>
  );
}
```

### Use Voice Interface

```typescript
import { useVoiceInterface } from '@/hooks';

function VoiceControl() {
  const { 
    startListening, 
    transcript, 
    speak 
  } = useVoiceInterface();

  return (
    <>
      <button onClick={startListening}>Start</button>
      <p>{transcript}</p>
      <button onClick={() => speak('Hello!')}>Speak</button>
    </>
  );
}
```

## Available Scripts

### Development

```bash
npm run dev          # Start dev server (http://localhost:3000)
```

### Production

```bash
npm run build        # Build for production
npm run preview      # Preview production build
```

### Code Quality

```bash
npm run lint         # Run ESLint
```

## Common Issues

### Port Already in Use

If port 3000 is taken, Vite will automatically try the next available port. Check the terminal output for the actual URL.

### Backend Connection Failed

1. Verify backend is running: `curl http://localhost:8000/health`
2. Check browser console for network errors
3. Verify proxy configuration in `vite.config.ts`

### Voice Not Working

1. **Chrome/Edge**: Best support for Web Speech API
2. **HTTPS Required**: Voice recognition requires secure context
3. **Permissions**: Allow microphone access when prompted
4. **Safari**: Limited speech recognition support

### TypeScript Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Chat | ✅ | ✅ | ✅ | ✅ |
| Objects | ✅ | ✅ | ✅ | ✅ |
| Voice Recognition | ✅ | ❌ | Limited | ✅ |
| Voice Synthesis | ✅ | ✅ | ✅ | ✅ |

**Recommended**: Chrome or Edge for full functionality

## Keyboard Shortcuts

- **Tab**: Navigate between elements
- **Enter**: Submit chat message
- **Escape**: Cancel voice recording
- **Space**: Toggle buttons (when focused)

## Accessibility

The application is designed for visually impaired users:

- ✅ Full keyboard navigation
- ✅ Screen reader support (ARIA labels)
- ✅ Voice control capability
- ✅ High contrast mode support
- ✅ Focus indicators
- ✅ Reduced motion support

## Export Data

All interactions can be exported as JSON:

### Chat History
Click **💾 Export** in chat header

### Voice History
Click **💾 Export History** in voice interface

### Object Data
Click **💾 Export All** in objects view

Exported files are saved to your Downloads folder.

## Next Steps

1. **Read Documentation**:
   - `HOOKS_DOCUMENTATION.md` - Detailed hook API reference
   - `INTEGRATION_EXAMPLES.md` - Advanced integration patterns
   - `README.md` - Complete feature overview

2. **Customize**:
   - Modify `src/App.css` for styling
   - Add custom object classes in `src/types/index.ts`
   - Extend hooks for additional functionality

3. **Deploy**:
   - Build: `npm run build`
   - Deploy `dist/` folder to your hosting service
   - Configure backend URL for production

## Getting Help

- **Check Console**: Browser DevTools → Console for errors
- **Review Network**: Check API calls in Network tab
- **Check Types**: TypeScript errors shown in IDE
- **Read Docs**: Full documentation in markdown files

## Development Tips

1. **Hot Module Replacement**: Changes auto-reload in browser
2. **TypeScript**: Strict mode enabled for type safety
3. **CSS Modules**: Component styles are scoped
4. **JSON Logging**: All hooks log JSON to console
5. **Error Boundaries**: Wrap components for error handling

## Production Build

```bash
# Build optimized bundle
npm run build

# Output in dist/ folder
# dist/
#   ├── assets/
#   ├── index.html
#   └── ...

# Test production build locally
npm run preview
```

## API Endpoints Reference

Your backend should implement these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/objects/last_location?class={class}` | Query object location |
| GET | `/api/objects` | Get all objects |
| POST | `/api/llm/chat` | Send chat message |
| POST | `/api/llm/query` | Query with tools |
| POST | `/api/slam/start` | Start SLAM |
| POST | `/api/slam/stop` | Stop SLAM |
| GET | `/api/slam/status` | SLAM status |
| GET | `/api/slam/pose` | Camera pose |
| POST | `/api/voice/tts` | Text-to-speech |

See `src/services/api.ts` for request/response formats.

---

**You're ready!** Start exploring the application and building amazing accessible experiences. 🚀
