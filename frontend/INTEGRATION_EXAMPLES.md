# Example Integration Scenarios

This document shows practical examples of how to use the LLM integration hooks together for common use cases.

## Scenario 1: Voice-Activated Object Search

Complete voice-driven workflow for finding objects.

```typescript
import React, { useEffect } from 'react';
import { useVoiceInterface, useLLMChat, useObjectQuery } from '@/hooks';

export function VoiceObjectSearch() {
  const voice = useVoiceInterface();
  const chat = useLLMChat();
  const objectQuery = useObjectQuery();

  // Step 1: Listen for voice input
  useEffect(() => {
    if (voice.transcript && !voice.isListening) {
      // Step 2: Send to LLM for processing
      chat.sendMessage(voice.transcript);
    }
  }, [voice.transcript, voice.isListening]);

  // Step 3: Process LLM response
  useEffect(() => {
    if (chat.lastResponse) {
      // Check if LLM made tool calls to find objects
      const objectToolCalls = chat.lastResponse.toolCalls?.filter(
        tc => tc.name === 'get_last_location'
      );

      if (objectToolCalls && objectToolCalls.length > 0) {
        // Step 4: Speak the result
        voice.speak(chat.lastResponse.response);
      }
    }
  }, [chat.lastResponse]);

  return (
    <div>
      <button onClick={voice.isListening ? voice.stopListening : voice.startListening}>
        {voice.isListening ? '🔴 Stop Listening' : '🎤 Ask About Objects'}
      </button>
      
      <div>
        {voice.transcript && <p>You said: {voice.transcript}</p>}
        {chat.isLoading && <p>Thinking...</p>}
        {voice.isSpeaking && <p>🔊 Speaking...</p>}
      </div>
    </div>
  );
}
```

## Scenario 2: Continuous Monitoring Dashboard

Real-time dashboard showing SLAM status and detected objects.

```typescript
import React, { useEffect, useState } from 'react';
import { useSLAM, useObjectQuery, downloadJSON } from '@/hooks';

export function MonitoringDashboard() {
  const slam = useSLAM();
  const objects = useObjectQuery();
  const [autoExport, setAutoExport] = useState(false);

  // Start SLAM on mount
  useEffect(() => {
    slam.startSession();
    return () => slam.stopSession();
  }, []);

  // Poll for objects every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (slam.isTracking) {
        objects.getAllObjects();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [slam.isTracking]);

  // Auto-export when new objects detected
  useEffect(() => {
    if (autoExport && objects.objects.length > 0) {
      const exportData = {
        timestamp: new Date().toISOString(),
        slamStatus: slam.session?.status,
        cameraPose: slam.currentPose,
        objects: objects.objects,
      };
      downloadJSON(exportData, `monitoring-${Date.now()}.json`);
    }
  }, [objects.objects.length, autoExport]);

  return (
    <div className="dashboard">
      <div className="slam-panel">
        <h2>SLAM Status</h2>
        <p>Status: {slam.session?.status || 'Not Started'}</p>
        <p>Keyframes: {slam.session?.keyframeCount || 0}</p>
        <p>Map Points: {slam.session?.mapPointCount || 0}</p>
        
        {slam.currentPose && (
          <div>
            <h3>Camera Position</h3>
            <p>X: {slam.currentPose.position.x.toFixed(2)}m</p>
            <p>Y: {slam.currentPose.position.y.toFixed(2)}m</p>
            <p>Z: {slam.currentPose.position.z.toFixed(2)}m</p>
          </div>
        )}
      </div>

      <div className="objects-panel">
        <h2>Detected Objects ({objects.objects.length})</h2>
        <label>
          <input
            type="checkbox"
            checked={autoExport}
            onChange={(e) => setAutoExport(e.target.checked)}
          />
          Auto-export updates
        </label>
        
        <ul>
          {objects.objects.map(obj => (
            <li key={obj.object_id}>
              {obj.class} - Zone: {obj.zone_label || 'Unknown'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

## Scenario 3: Guided Navigation System

Help users navigate to objects with voice guidance.

```typescript
import React, { useEffect, useState } from 'react';
import { useObjectQuery, useVoiceInterface, useSLAM } from '@/hooks';

export function GuidedNavigation() {
  const objects = useObjectQuery();
  const voice = useVoiceInterface();
  const slam = useSLAM();
  const [targetObject, setTargetObject] = useState<string | null>(null);
  const [navigationActive, setNavigationActive] = useState(false);

  // Start navigation to an object
  const startNavigation = async (objectClass: string) => {
    setTargetObject(objectClass);
    setNavigationActive(true);
    
    // Query object location
    await objects.queryObject(objectClass);
    
    if (objects.data?.found && objects.data.object) {
      const obj = objects.data.object;
      const direction = objects.data.relative_direction || 'unknown direction';
      const distance = objects.data.distance_m || 0;
      
      // Speak initial guidance
      await voice.speak(
        `${objectClass} found. It is ${distance.toFixed(1)} meters away, ${direction}. I will guide you.`
      );
      
      // Start continuous guidance
      provideGuidance(obj, direction, distance);
    } else {
      await voice.speak(`Sorry, I could not find the ${objectClass}.`);
      setNavigationActive(false);
    }
  };

  // Provide continuous navigation updates
  const provideGuidance = (targetObj: any, direction: string, distance: number) => {
    const guidanceInterval = setInterval(async () => {
      if (!navigationActive) {
        clearInterval(guidanceInterval);
        return;
      }

      // Get current camera position
      if (slam.currentPose) {
        const currentPos = slam.currentPose.position;
        const targetPos = targetObj.last_position;
        
        // Calculate new distance
        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;
        const dz = targetPos.z - currentPos.z;
        const newDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (newDistance < 0.5) {
          await voice.speak(`You have arrived. The ${targetObj.class} should be right here.`);
          setNavigationActive(false);
          clearInterval(guidanceInterval);
        } else if (newDistance < 1.5) {
          await voice.speak(`You are close. About ${newDistance.toFixed(1)} meters away.`);
        } else {
          await voice.speak(`Continue ${direction}. ${newDistance.toFixed(1)} meters to go.`);
        }
      }
    }, 5000); // Update every 5 seconds
  };

  const stopNavigation = () => {
    setNavigationActive(false);
    setTargetObject(null);
    voice.speak('Navigation stopped.');
  };

  return (
    <div className="navigation">
      <h2>Guided Navigation</h2>
      
      {!navigationActive ? (
        <div>
          <p>What object would you like to find?</p>
          <button onClick={() => startNavigation('mug')}>Find Mug</button>
          <button onClick={() => startNavigation('knife')}>Find Knife</button>
          <button onClick={() => startNavigation('pan')}>Find Pan</button>
        </div>
      ) : (
        <div>
          <p>Navigating to: {targetObject}</p>
          <button onClick={stopNavigation}>Stop Navigation</button>
          {voice.isSpeaking && <p>🔊 Speaking guidance...</p>}
        </div>
      )}
    </div>
  );
}
```

## Scenario 4: Context-Aware LLM Assistant

LLM that understands spatial context and provides intelligent responses.

```typescript
import React, { useEffect } from 'react';
import { useLLMChat, useObjectQuery, useSLAM, useVoiceInterface } from '@/hooks';

export function ContextAwareAssistant() {
  const llm = useLLMChat();
  const objects = useObjectQuery();
  const slam = useSLAM();
  const voice = useVoiceInterface();

  // Build context for LLM
  const buildContext = () => {
    const context = [];
    
    // Add SLAM status
    if (slam.session) {
      context.push(`SLAM Status: ${slam.session.status}`);
      context.push(`Keyframes: ${slam.session.keyframeCount}`);
    }
    
    // Add camera position
    if (slam.currentPose) {
      const pos = slam.currentPose.position;
      context.push(`Camera Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
    }
    
    // Add object information
    if (objects.objects.length > 0) {
      context.push(`Detected ${objects.objects.length} objects:`);
      objects.objects.forEach(obj => {
        context.push(`- ${obj.class} at zone: ${obj.zone_label || 'unknown'}`);
      });
    }
    
    return context.join('\n');
  };

  // Handle complex queries
  const handleComplexQuery = async (query: string) => {
    const context = buildContext();
    
    // Send query with full context
    await llm.sendMessage(`${query}\n\nContext:\n${context}`);
    
    // Export the interaction
    const interaction = {
      timestamp: new Date().toISOString(),
      query,
      context,
      response: llm.lastResponse,
      slamStatus: slam.session,
      detectedObjects: objects.objects,
    };
    
    console.log('Complex Query Result:', JSON.stringify(interaction, null, 2));
  };

  // Handle voice + LLM integration
  useEffect(() => {
    if (voice.transcript && !voice.isListening) {
      handleComplexQuery(voice.transcript);
    }
  }, [voice.transcript, voice.isListening]);

  // Speak LLM responses
  useEffect(() => {
    if (llm.lastResponse && !voice.isSpeaking) {
      voice.speak(llm.lastResponse.response);
    }
  }, [llm.lastResponse]);

  return (
    <div className="assistant">
      <h2>🤖 Context-Aware Assistant</h2>
      
      <div className="context-display">
        <h3>Current Context</h3>
        <pre>{buildContext()}</pre>
      </div>
      
      <div className="voice-control">
        <button 
          onClick={voice.isListening ? voice.stopListening : voice.startListening}
          disabled={voice.isSpeaking}
        >
          {voice.isListening ? '🔴 Listening...' : '🎤 Ask Question'}
        </button>
      </div>
      
      <div className="chat-display">
        {llm.messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <strong>{msg.role}:</strong> {msg.content}
            
            {msg.toolCalls && (
              <details>
                <summary>Tool Calls ({msg.toolCalls.length})</summary>
                <pre>{JSON.stringify(msg.toolCalls, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
      
      <div className="actions">
        <button onClick={() => llm.exportConversation()}>
          💾 Export Conversation
        </button>
        <button onClick={() => voice.exportVoiceHistory()}>
          💾 Export Voice History
        </button>
      </div>
    </div>
  );
}
```

## Scenario 5: Batch Object Analysis

Analyze multiple objects and generate reports.

```typescript
import React, { useState } from 'react';
import { useObjectQuery, useLLMChat, downloadJSON } from '@/hooks';

export function BatchObjectAnalysis() {
  const objects = useObjectQuery();
  const llm = useLLMChat();
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<any>(null);

  const analyzeKitchen = async () => {
    setAnalyzing(true);
    
    // Get all objects
    await objects.getAllObjects();
    
    if (objects.objects.length === 0) {
      setAnalyzing(false);
      return;
    }

    // Analyze each object
    const analyses = [];
    
    for (const obj of objects.objects) {
      // Query detailed location
      await objects.queryObject(obj.class);
      
      if (objects.data) {
        analyses.push({
          object: obj,
          locationData: objects.data,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Generate summary with LLM
    const summary = `I found ${objects.objects.length} objects. ` +
      `Objects by zone: ${getZoneSummary(objects.objects)}. ` +
      `Please provide safety recommendations.`;
    
    await llm.sendMessage(summary);

    // Create comprehensive report
    const fullReport = {
      analysisTime: new Date().toISOString(),
      totalObjects: objects.objects.length,
      objectAnalyses: analyses,
      zoneSummary: getZoneSummary(objects.objects),
      llmRecommendations: llm.lastResponse?.response,
      toolCalls: llm.toolCalls,
    };

    setReport(fullReport);
    setAnalyzing(false);

    // Auto-export report
    downloadJSON(fullReport, `kitchen-analysis-${Date.now()}.json`);
  };

  const getZoneSummary = (objs: any[]) => {
    const zones: Record<string, number> = {};
    objs.forEach(obj => {
      const zone = obj.zone_label || 'unknown';
      zones[zone] = (zones[zone] || 0) + 1;
    });
    return Object.entries(zones)
      .map(([zone, count]) => `${zone}: ${count}`)
      .join(', ');
  };

  return (
    <div className="batch-analysis">
      <h2>📊 Kitchen Analysis</h2>
      
      <button 
        onClick={analyzeKitchen} 
        disabled={analyzing}
      >
        {analyzing ? '⏳ Analyzing...' : '🔍 Analyze Kitchen'}
      </button>

      {report && (
        <div className="report">
          <h3>Analysis Report</h3>
          
          <div className="summary">
            <p>Total Objects: {report.totalObjects}</p>
            <p>Zones: {report.zoneSummary}</p>
          </div>

          <div className="recommendations">
            <h4>AI Recommendations</h4>
            <p>{report.llmRecommendations}</p>
          </div>

          <div className="detailed-objects">
            <h4>Detailed Object List</h4>
            {report.objectAnalyses.map((analysis: any, idx: number) => (
              <div key={idx} className="object-analysis">
                <h5>{analysis.object.class}</h5>
                <p>Zone: {analysis.locationData.zone}</p>
                <p>Direction: {analysis.locationData.relative_direction}</p>
                <p>Distance: {analysis.locationData.distance_m?.toFixed(2)}m</p>
              </div>
            ))}
          </div>

          <button onClick={() => downloadJSON(report, `report-${Date.now()}.json`)}>
            💾 Export Report
          </button>
        </div>
      )}
    </div>
  );
}
```

## JSON Output Examples

### Complete Voice-to-Response Flow

```json
{
  "sessionId": "session-1731580200000",
  "timestamp": "2025-11-14T10:30:00.000Z",
  "voiceInput": {
    "transcript": "Where is my mug",
    "confidence": 0.95,
    "timestamp": "2025-11-14T10:30:00.000Z"
  },
  "llmProcessing": {
    "conversationId": "conv-abc123",
    "userMessage": "Where is my mug",
    "assistantResponse": "Your mug is on the counter near the sink, about 0.8 meters in front of you",
    "toolCalls": [
      {
        "name": "get_last_location",
        "parameters": { "class": "mug" },
        "result": {
          "found": true,
          "zone": "counter near sink",
          "relative_direction": "front-left",
          "distance_m": 0.8
        }
      }
    ]
  },
  "voiceOutput": {
    "text": "Your mug is on the counter near the sink, about 0.8 meters in front of you",
    "timestamp": "2025-11-14T10:30:05.000Z"
  }
}
```

## Tips for Integration

1. **Always handle loading states** - Show user feedback during async operations
2. **Export frequently** - Use downloadJSON to save important interactions
3. **Combine hooks** - Use multiple hooks together for complex workflows
4. **Error recovery** - Implement fallbacks when APIs fail
5. **Accessibility first** - Ensure voice and visual interfaces work together
6. **Context awareness** - Pass relevant context to LLM for better responses
7. **Real-time updates** - Poll for changes when needed
8. **Cleanup resources** - Stop listeners and clear intervals on unmount

For more examples, see the component implementations in `src/components/`.
