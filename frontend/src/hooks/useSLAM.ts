import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api';
import { SLAMSession, CameraPose } from '@/types';

interface UseSLAMResult {
  // Session state
  session: SLAMSession | null;
  currentPose: CameraPose | null;
  isTracking: boolean;
  
  // Actions
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  
  // State
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for SLAM session management
 */
export function useSLAM(): UseSLAMResult {
  const [session, setSession] = useState<SLAMSession | null>(null);
  const [currentPose, setCurrentPose] = useState<CameraPose | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isTracking = session?.status === 'tracking';

  const refreshStatus = useCallback(async () => {
    try {
      const response = await apiClient.getSLAMStatus();
      if (response.success && response.data) {
        setSession(response.data);
      }
      
      const poseResponse = await apiClient.getCurrentPose();
      if (poseResponse.success && poseResponse.data) {
        setCurrentPose(poseResponse.data);
      }
    } catch (err: any) {
      console.error('Failed to refresh SLAM status:', err);
    }
  }, []);

  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.startSLAMSession();
      
      if (response.success && response.data) {
        setSession(response.data);
        
        // Start polling for updates
        pollIntervalRef.current = setInterval(refreshStatus, 1000);
      } else {
        setError(response.error || 'Failed to start SLAM session');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  const stopSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      const response = await apiClient.stopSLAMSession();
      
      if (response.success) {
        setSession(null);
        setCurrentPose(null);
      } else {
        setError(response.error || 'Failed to stop SLAM session');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    session,
    currentPose,
    isTracking,
    startSession,
    stopSession,
    refreshStatus,
    isLoading,
    error,
  };
}
