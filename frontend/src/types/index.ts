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

// Video Processing Types
export interface VideoDetectedObject {
  id: string;
  label: string;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  depth: number;
  confidence?: number;
}

export interface VideoFrameData {
  time: number;
  objects: VideoDetectedObject[];
}

export interface CVPipelineResult {
  video_id: string;
  fps: number;
  frames: VideoFrameData[];
}

export interface LLMInsight {
  object_id: string;
  insight: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface VideoProcessingRequest {
  video: File | Blob;
  domain?: string;
  customDescription?: string;
}

export interface VideoProcessingResponse {
  video_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
}

export interface VideoInsightsRequest {
  video_id: string;
  domain: string;
  customDescription?: string;
}

export interface VideoInsightsResponse {
  video_id: string;
  insights: Record<string, LLMInsight[]>; // frame_key -> insights
  domain: string;
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
  video_id?: string; // For video-specific queries
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

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// WebSocket message types
export interface WSMessage {
  type: 'object_detected' | 'llm_response';
  payload: any;
  timestamp: string;
}
