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
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
