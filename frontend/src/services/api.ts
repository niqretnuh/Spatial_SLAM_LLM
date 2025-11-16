import axios, { AxiosInstance } from 'axios';
import {
  ObjectLocationQuery,
  ObjectLocationResponse,
  LLMChatRequest,
  LLMChatResponse,
  DetectedObject,
  ApiResponse,
  VideoProcessingRequest,
  VideoProcessingResponse,
  VideoInsightsRequest,
  VideoInsightsResponse,
  CVPipelineResult,
  MultimodalChatRequest,
  AnnotationResponse,
} from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000/api') {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // Increased timeout for LLM responses
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // Object Location Queries
  async getObjectLocation(query: ObjectLocationQuery): Promise<ApiResponse<ObjectLocationResponse>> {
    try {
      const response = await this.client.get('/objects/last_location', {
        params: query,
      });
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getAllObjects(): Promise<ApiResponse<DetectedObject[]>> {
    try {
      const response = await this.client.get('/objects');
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // LLM Integration
  async sendChatMessage(request: LLMChatRequest): Promise<ApiResponse<LLMChatResponse>> {
    try {
      console.log('Sending chat message:', request);
      const response = await this.client.post('/llm/chat', request);
      console.log('Chat response:', response.data);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Chat API error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async sendMultimodalChatMessage(request: MultimodalChatRequest): Promise<ApiResponse<LLMChatResponse>> {
    try {
      console.log('Sending multimodal chat message:', request);
      
      // Create FormData for multipart/form-data
      const formData = new FormData();
      formData.append('message', request.message);
      
      if (request.spatial_data) {
        formData.append('spatial_data', JSON.stringify(request.spatial_data));
      }
      
      if (request.context) {
        formData.append('context', JSON.stringify(request.context));
      }
      
      if (request.userId) {
        formData.append('userId', request.userId);
      }
      
      if (request.video_id) {
        formData.append('video_id', request.video_id);
      }
      
      // Add up to 4 images
      if (request.images && request.images.length > 0) {
        request.images.slice(0, 4).forEach((image, index) => {
          formData.append(`image${index + 1}`, image);
        });
      }
      
      const response = await this.client.post('/llm/chat-multimodal', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Multimodal chat response:', response.data);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Multimodal chat API error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async queryWithTools(message: string): Promise<ApiResponse<LLMChatResponse>> {
    try {
      const response = await this.client.post('/llm/query', { message });
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Text-to-Speech
  async synthesizeSpeech(text: string): Promise<ApiResponse<Blob>> {
    try {
      const response = await this.client.post(
        '/voice/tts',
        { text },
        { responseType: 'blob' }
      );
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Video Processing APIs
  async processVideo(request: VideoProcessingRequest): Promise<ApiResponse<VideoProcessingResponse>> {
    try {
      const formData = new FormData();
      formData.append('video', request.video);
      
      if (request.domain) {
        formData.append('domain', request.domain);
      }
      
      if (request.customDescription) {
        formData.append('customDescription', request.customDescription);
      }

      const response = await this.client.post('/process-video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes for video processing
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getVideoProcessingStatus(videoId: string): Promise<ApiResponse<VideoProcessingResponse>> {
    try {
      const response = await this.client.get(`/process-video/${videoId}/status`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getCVResults(videoId: string): Promise<ApiResponse<CVPipelineResult>> {
    try {
      const response = await this.client.get(`/cv-results/${videoId}`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async generateInsights(request: VideoInsightsRequest): Promise<ApiResponse<VideoInsightsResponse>> {
    try {
      const response = await this.client.post('/generate-insights', request);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getVideoInsights(videoId: string): Promise<ApiResponse<VideoInsightsResponse>> {
    try {
      const response = await this.client.get(`/insights/${videoId}`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async queryVideoInsights(videoId: string, question: string): Promise<ApiResponse<LLMChatResponse>> {
    try {
      const response = await this.client.post('/query-insights', {
        video_id: videoId,
        question: question,
      });
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getProcessedVideo(videoId: string): Promise<ApiResponse<Blob>> {
    try {
      const response = await this.client.get(`/processed-video/${videoId}`, {
        responseType: 'blob',
      });
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Get annotation response with frame-by-frame object annotations
  async getAnnotationResponse(_videoId?: string): Promise<ApiResponse<AnnotationResponse>> {
    try {
      // First attempt: try to fetch a JSON export of the alumni spatial model.
      // If that is not available, attempt to fetch a .npy and parse it (best-effort).
      let model: any = null;

      // Try JSON first (convention: serve a JSON copy alongside the .npy for front-end consumption).
      try {
        const jsonRes = await fetch('/alumni_spatial_model.json');
        if (jsonRes.ok) {
          model = await jsonRes.json();
        }
      } catch (e) {
        // ignore and try npy
      }

      // Try .npy using npyjs (best-effort). Many .npy files contain pickled/python objects
      // which can't be parsed in JS. We attempt this step but fall back gracefully.
      if (!model) {
        try {
          // npyjs may not have types; ignore TS here
          // @ts-ignore
          const { default: NpyJS } = await import('npyjs');
          // @ts-ignore
          const npy = new NpyJS();
          const arr = await npy.load('/alumni_spatial_model.npy');

          // If the .npy contains a textual JSON dump (common if user exported that way), try parse.
          if (arr && arr.data) {
            try {
              const text = new TextDecoder().decode(new Uint8Array(arr.data.buffer));
              model = JSON.parse(text);
            } catch (e) {
              // not JSON-text; can't parse complex python objects here
              model = null;
            }
          }
        } catch (e) {
          // npy load failed; ignore and fall back to mock
          // console.warn('NPY load failed', e);
          model = null;
        }
      }

      // Helper: normalize object map structure
      const objectMap = model ? (model.object_map || model) : null;

      // Allowed frame names (images are 1-based: frame_000001.png to frame_000047.png)
      const allowedFrames: string[] = [];
      for (let i = 1; i <= 47; i++) {
        const name = `frame_${String(i).padStart(6, '0')}.png`;
        allowedFrames.push(name);
      }

      // Collect counts per frame
      const frameToObjects: Record<string, Array<any>> = {};
      allowedFrames.forEach(f => (frameToObjects[f] = []));

      if (objectMap && typeof objectMap === 'object') {
        for (const [key, val] of Object.entries(objectMap)) {
          const entry: any = val as any;

          // Try to determine which frame this object first appears in
          let frameName: string | null = null;
          if (entry.first_frame_path && typeof entry.first_frame_path === 'string') {
            const p: string = entry.first_frame_path;
            for (const candidate of allowedFrames) {
              if (p.includes(candidate) || p.endsWith(candidate)) {
                frameName = candidate;
                break;
              }
            }
          }
          if (!frameName && typeof entry.first_frame_idx === 'number') {
            // Data uses 0-based indexing, but images are 1-based (frame_000001.png to frame_000047.png)
            const idx = entry.first_frame_idx;
            const candidates = [
              `frame_${String(idx + 1).padStart(6, '0')}.png`,  // Convert 0-based to 1-based
              `frame_${String(idx).padStart(6, '0')}.png`,      // Try original in case data is already 1-based
            ];
            for (const candidate of candidates) {
              if (allowedFrames.includes(candidate)) {
                frameName = candidate;
                break;
              }
            }
          }

          if (frameName && frameToObjects[frameName]) {
            // Calculate Euclidean distance from origin (0,0,0) to object center
            const center = entry.center;
            let distance = 0;
            if (Array.isArray(center) && center.length >= 3) {
              const [x, y, z] = center;
              distance = Math.sqrt(x * x + y * y + z * z);
            }

            // Build a lightweight object entry, omitting `callout`
            const obj = {
              id: key,
              label: entry.label || entry['label'] || 'unknown',
              bbox: (Array.isArray(entry.first_bbox) ? entry.first_bbox : (entry.first_bbox ? Array.from(entry.first_bbox) : [0, 0, 0, 0])) as [number, number, number, number],
              distance: distance,
              dimensions: entry.size ? { length: entry.size[0] || 0, width: entry.size[1] || 0 } : { length: 0, width: 0 },
              callout: '',
            };
            frameToObjects[frameName].push(obj);
          }
        }
      }

      // Compute top-5 frames by object count to cover most objects
      const framesWithCounts = Object.entries(frameToObjects).map(([frame, objs]) => ({ frame, count: objs.length, objs }));
      framesWithCounts.sort((a, b) => b.count - a.count || a.frame.localeCompare(b.frame));
      const topFrames = framesWithCounts.filter(f => f.count > 0).slice(0, 5);

      // If no model or no frames found, fall back to a small mock (without `callout`)
      if (!topFrames || topFrames.length === 0) {
        // small mock without callout fields
        const mockLegacy = [
          {
            frameNumber: 1,
            imagePath: '/src/dummy/frame1.png',
            objects: [
              { id: 'obj_1_1', label: 'ladder', bbox: [100, 120, 280, 420] as [number, number, number, number], distance: 2.8, dimensions: { length: 3.2, width: 0.6 }, callout: '' },
              { id: 'obj_1_2', label: 'person', bbox: [320, 80, 480, 380] as [number, number, number, number], distance: 1.5, dimensions: { length: 1.8, width: 0.5 }, callout: '' },
              { id: 'obj_1_3', label: 'toolbox', bbox: [50, 350, 150, 420] as [number, number, number, number], distance: 3.1, dimensions: { length: 0.8, width: 0.4 }, callout: '' },
            ]
          },
          {
            frameNumber: 2,
            imagePath: '/src/dummy/frame2.png',
            objects: [
              { id: 'obj_2_1', label: 'safety_cone', bbox: [80, 280, 140, 400] as [number, number, number, number], distance: 3.2, dimensions: { length: 0.7, width: 0.7 }, callout: '' },
              { id: 'obj_2_2', label: 'excavator', bbox: [200, 100, 500, 350] as [number, number, number, number], distance: 8.5, dimensions: { length: 6.2, width: 2.8 }, callout: '' },
            ]
          },
          {
            frameNumber: 3,
            imagePath: '/src/dummy/frame3.png',
            objects: [
              { id: 'obj_3_1', label: 'hard_hat', bbox: [180, 60, 220, 100] as [number, number, number, number], distance: 2.1, dimensions: { length: 0.3, width: 0.3 }, callout: '' },
              { id: 'obj_3_2', label: 'scaffolding', bbox: [100, 50, 400, 350] as [number, number, number, number], distance: 4.2, dimensions: { length: 8.0, width: 2.0 }, callout: '' },
              { id: 'obj_3_3', label: 'safety_vest', bbox: [250, 180, 320, 280] as [number, number, number, number], distance: 3.8, dimensions: { length: 0.6, width: 0.5 }, callout: '' },
            ]
          },
          {
            frameNumber: 4,
            imagePath: '/src/dummy/frame4.png',
            objects: [
              { id: 'obj_4_1', label: 'power_tool', bbox: [150, 200, 250, 280] as [number, number, number, number], distance: 1.8, dimensions: { length: 0.4, width: 0.15 }, callout: '' },
              { id: 'obj_4_2', label: 'warning_sign', bbox: [320, 120, 420, 220] as [number, number, number, number], distance: 5.5, dimensions: { length: 0.8, width: 0.6 }, callout: '' },
            ]
          }
        ];

        const mockData: AnnotationResponse = {
          domain: 'construction_safety',
          total_frames: mockLegacy.length,
          summary: {},
          frames: [],
          legacyFrames: mockLegacy,
          totalFrames: mockLegacy.length,
        };

        return { success: true, data: mockData, timestamp: new Date().toISOString() };
      }

      // Map selected frames to legacyFrames structure; sort chronologically by frame number
      const selected = topFrames
        .map(f => {
          const match = f.frame.match(/frame_(\d+)\.png$/);
          const frameNumber = match ? parseInt(match[1], 10) : 0;
          return {
            frame: f.frame,
            frameNumber,
            objects: f.objs,
          };
        })
        .filter(f => f.frameNumber >= 1)
        .sort((a, b) => a.frameNumber - b.frameNumber);

      const legacyFrames = selected.map(s => ({
        frameNumber: s.frameNumber,
        imagePath: `/alumni_images/${s.frame}`,
        objects: s.objects,
      }));

      const responseData: AnnotationResponse = {
        domain: 'alumni_spatial_model',
        total_frames: legacyFrames.length,
        summary: {},
        frames: [],
        legacyFrames,
        totalFrames: legacyFrames.length,
      };

      return { success: true, data: responseData, timestamp: new Date().toISOString() };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
