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
      // For now, return mock data with dummy images
      // In the future, this would make a real API call: `/annotations/${videoId}`
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      const mockData: AnnotationResponse = {
        frames: [
          {
            frameNumber: 1,
            imagePath: '/src/dummy/frame1.png',
            objects: [
              {
                id: 'obj_1_1',
                label: 'ladder',
                bbox: [100, 120, 280, 420],
                distance: 2.8,
                dimensions: { length: 3.2, width: 0.6 },
                callout: 'Aluminum step ladder detected. Appears stable but positioned near electrical outlet - potential safety concern.'
              },
              {
                id: 'obj_1_2', 
                label: 'person',
                bbox: [320, 80, 480, 380],
                distance: 1.5,
                dimensions: { length: 1.8, width: 0.5 },
                callout: 'Worker in construction attire. No visible safety helmet - OSHA violation in construction zone.'
              },
              {
                id: 'obj_1_3',
                label: 'toolbox',
                bbox: [50, 350, 150, 420],
                distance: 3.1,
                dimensions: { length: 0.8, width: 0.4 },
                callout: 'Red metal toolbox properly secured. Contents appear organized and accessible.'
              }
            ]
          },
          {
            frameNumber: 2,
            imagePath: '/src/dummy/frame2.png',
            objects: [
              {
                id: 'obj_2_1',
                label: 'safety_cone',
                bbox: [80, 280, 140, 400],
                distance: 3.2,
                dimensions: { length: 0.7, width: 0.7 },
                callout: 'Orange safety cone positioned to mark hazard area. Proper placement for traffic control.'
              },
              {
                id: 'obj_2_2',
                label: 'excavator',
                bbox: [200, 100, 500, 350],
                distance: 8.5,
                dimensions: { length: 6.2, width: 2.8 },
                callout: 'Heavy machinery in operation. Ensure proper clearance and operator certification is current.'
              }
            ]
          },
          {
            frameNumber: 3,
            imagePath: '/src/dummy/frame3.png',
            objects: [
              {
                id: 'obj_3_1',
                label: 'hard_hat',
                bbox: [180, 60, 220, 100],
                distance: 2.1,
                dimensions: { length: 0.3, width: 0.3 },
                callout: 'Yellow hard hat detected. Properly worn and appears to meet safety standards.'
              },
              {
                id: 'obj_3_2',
                label: 'scaffolding',
                bbox: [100, 50, 400, 350],
                distance: 4.2,
                dimensions: { length: 8.0, width: 2.0 },
                callout: 'Multi-level scaffolding structure. Check stability connections and guard rail completeness.'
              },
              {
                id: 'obj_3_3',
                label: 'safety_vest',
                bbox: [250, 180, 320, 280],
                distance: 3.8,
                dimensions: { length: 0.6, width: 0.5 },
                callout: 'High-visibility safety vest worn correctly. Reflective strips clearly visible.'
              }
            ]
          },
          {
            frameNumber: 4,
            imagePath: '/src/dummy/frame4.png',
            objects: [
              {
                id: 'obj_4_1',
                label: 'power_tool',
                bbox: [150, 200, 250, 280],
                distance: 1.8,
                dimensions: { length: 0.4, width: 0.15 },
                callout: 'Electric drill in use. Cord management appears adequate, proper grip observed.'
              },
              {
                id: 'obj_4_2',
                label: 'warning_sign',
                bbox: [320, 120, 420, 220],
                distance: 5.5,
                dimensions: { length: 0.8, width: 0.6 },
                callout: 'Construction warning sign properly posted. Text legible from safe distance.'
              }
            ]
          }
        ],
        totalFrames: 4
      };

      return {
        success: true,
        data: mockData,
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
