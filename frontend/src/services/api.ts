import axios, { AxiosInstance } from 'axios';
import {
  ObjectLocationQuery,
  ObjectLocationResponse,
  LLMChatRequest,
  LLMChatResponse,
  DetectedObject,
  SLAMSession,
  CameraPose,
  ApiResponse,
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
      const response = await this.client.post('/llm/chat', request);
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

  // SLAM Session Management
  async startSLAMSession(): Promise<ApiResponse<SLAMSession>> {
    try {
      const response = await this.client.post('/slam/start');
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

  async stopSLAMSession(): Promise<ApiResponse<void>> {
    try {
      await this.client.post('/slam/stop');
      return {
        success: true,
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

  async getSLAMStatus(): Promise<ApiResponse<SLAMSession>> {
    try {
      const response = await this.client.get('/slam/status');
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

  async getCurrentPose(): Promise<ApiResponse<CameraPose>> {
    try {
      const response = await this.client.get('/slam/pose');
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

  // SLAM Visualization
  async getSlamVisualization(options?: {
    etag?: string | null;
    lastModified?: string | null;
  }): Promise<ApiResponse<{
    imageUrl?: string;
    etag?: string;
    lastModified?: string;
    modified?: boolean;
  }>> {
    try {
      const headers: Record<string, string> = {};
      
      // Add conditional request headers
      if (options?.etag) {
        headers['If-None-Match'] = options.etag;
      }
      if (options?.lastModified) {
        headers['If-Modified-Since'] = options.lastModified;
      }

      const response = await this.client.get('/slam/visualization', {
        headers,
        responseType: 'blob',
        validateStatus: (status) => status === 200 || status === 304,
      });

      // 304 Not Modified - no changes
      if (response.status === 304) {
        return {
          success: true,
          data: { modified: false },
          timestamp: new Date().toISOString(),
        };
      }

      // 200 OK - new image data
      const blob = response.data;
      const imageUrl = URL.createObjectURL(blob);
      const etag = response.headers['etag'] || null;
      const lastModified = response.headers['last-modified'] || null;

      return {
        success: true,
        data: {
          imageUrl,
          etag,
          lastModified,
          modified: true,
        },
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
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
