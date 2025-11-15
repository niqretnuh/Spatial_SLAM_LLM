// Core object types
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface ObjectClass {
  id: string;
  name: 'mug' | 'pan' | 'knife' | 'fire' | 'cutting_board';
  confidence: number;
}

export interface DetectedObject {
  object_id: string;
  class: string;
  last_position: Position3D;
  last_seen_ts: string;
  zone_label?: string;
  relative_direction?: string;
  distance_m?: number;
}

// LLM Query types
export interface ObjectLocationQuery {
  class: string;
  userId?: string;
}

export interface ObjectLocationResponse {
  found: boolean;
  object?: DetectedObject;
  zone?: string;
  relative_direction?: string;
  distance_m?: number;
  message: string;
}

// LLM Chat types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
  result?: any;
}

export interface LLMChatRequest {
  message: string;
  context?: string[];
  userId?: string;
}

export interface LLMChatResponse {
  response: string;
  toolCalls?: ToolCall[];
  objects?: DetectedObject[];
  timestamp: string;
}

// Voice interface types
export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceSynthesisRequest {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

// SLAM types
export interface CameraPose {
  position: Position3D;
  rotation: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  timestamp: string;
}

export interface SLAMSession {
  sessionId: string;
  status: 'idle' | 'initializing' | 'tracking' | 'lost';
  startTime: string;
  keyframeCount: number;
  mapPointCount: number;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// WebSocket message types
export interface WSMessage {
  type: 'camera_pose' | 'object_detected' | 'slam_status' | 'llm_response';
  payload: any;
  timestamp: string;
}
