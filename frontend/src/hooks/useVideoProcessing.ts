import { useState, useCallback } from 'react';
import { apiClient } from '@/services/api';
import { CVPipelineResult, VideoInsightsResponse } from '@/types';

interface UseVideoProcessingOptions {
  onProgress?: (step: 'upload' | 'cv' | 'insights' | 'complete') => void;
  onError?: (error: string) => void;
}

export const useVideoProcessing = (options: UseVideoProcessingOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'cv' | 'insights' | 'complete'>('upload');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  const resetProcessing = useCallback(() => {
    setIsProcessing(false);
    setCurrentStep('upload');
    setProgress(0);
    setError(null);
    setCurrentVideoId(null);
  }, []);

  const processVideo = useCallback(async (
    videoBlob: Blob | File,
    domain: string,
    customDescription?: string
  ): Promise<string | null> => {
    // Validate inputs
    if (!videoBlob) {
      const errorMsg = 'No video file provided';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    }

    if (!domain) {
      const errorMsg = 'Please select a domain for analysis';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    }

    setIsProcessing(true);
    setError(null);
    setCurrentStep('upload');
    setProgress(0);
    options.onProgress?.('upload');

    try {
      // Step 1: Upload and start processing
      const uploadResponse = await apiClient.processVideo({
        video: videoBlob,
        domain,
        customDescription,
      });

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error || 'Upload failed');
      }

      const videoId = uploadResponse.data?.video_id;
      if (!videoId) {
        throw new Error('No video ID returned');
      }

      setCurrentVideoId(videoId);
      setCurrentStep('cv');
      setProgress(30);
      options.onProgress?.('cv');

      // Step 2: Poll for CV processing completion
      let cvCompleted = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5s intervals

      while (!cvCompleted && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await apiClient.getVideoProcessingStatus(videoId);
        
        if (statusResponse.success && statusResponse.data) {
          const status = statusResponse.data.status;
          const progressValue = statusResponse.data.progress || 0;
          
          setProgress(30 + (progressValue * 0.4)); // CV takes 30-70% of progress
          
          if (status === 'completed') {
            cvCompleted = true;
          } else if (status === 'failed') {
            throw new Error('Video processing failed');
          }
        }
        
        attempts++;
      }

      if (!cvCompleted) {
        throw new Error('Processing timeout - please try again');
      }

      setCurrentStep('insights');
      setProgress(70);
      options.onProgress?.('insights');

      // Step 3: Generate insights
      const insightsResponse = await apiClient.generateInsights({
        video_id: videoId,
        domain,
        customDescription,
      });

      if (!insightsResponse.success) {
        // Insights generation failed, but CV processing succeeded
        console.warn('Insights generation failed:', insightsResponse.error);
      }

      setCurrentStep('complete');
      setProgress(100);
      options.onProgress?.('complete');

      return videoId;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMessage);
      setCurrentStep('upload');
      setProgress(0);
      options.onError?.(errorMessage);
      console.error('Video processing error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  const cancelProcessing = useCallback(() => {
    if (isProcessing) {
      setIsProcessing(false);
      setError('Processing cancelled by user');
      setCurrentStep('upload');
      setProgress(0);
    }
  }, [isProcessing]);

  const getCVResults = useCallback(async (videoId: string): Promise<CVPipelineResult | null> => {
    try {
      const response = await apiClient.getCVResults(videoId);
      return response.success ? response.data || null : null;
    } catch (err) {
      console.error('Failed to get CV results:', err);
      return null;
    }
  }, []);

  const getInsights = useCallback(async (videoId: string): Promise<VideoInsightsResponse | null> => {
    try {
      const response = await apiClient.getVideoInsights(videoId);
      return response.success ? response.data || null : null;
    } catch (err) {
      console.error('Failed to get insights:', err);
      return null;
    }
  }, []);

  const queryInsights = useCallback(async (videoId: string, question: string) => {
    try {
      const response = await apiClient.queryVideoInsights(videoId, question);
      return response.success ? response.data : null;
    } catch (err) {
      console.error('Failed to query insights:', err);
      return null;
    }
  }, []);

  return {
    isProcessing,
    currentStep,
    progress,
    error,
    currentVideoId,
    processVideo,
    getCVResults,
    getInsights,
    queryInsights,
    resetProcessing,
    cancelProcessing,
  };
};