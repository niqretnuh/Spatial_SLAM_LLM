import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api';

interface UseSlamVisualizationResult {
  imageUrl: string | null;
  lastModified: string | null;
  isLoading: boolean;
  error: string | null;
  hasChanges: boolean;
  checkForUpdates: () => Promise<boolean>;
  forceRefresh: () => Promise<void>;
}

/**
 * Hook for efficient SLAM 3D visualization updates
 * Uses conditional requests (ETag/Last-Modified) to minimize bandwidth
 * 
 * This approach is more efficient than:
 * 1. Fetching full image every time (wastes bandwidth)
 * 2. Computing diffs (wastes CPU on both client and server)
 * 
 * Instead, we leverage HTTP caching:
 * - Server sends ETag or Last-Modified header
 * - Client includes If-None-Match or If-Modified-Since in request
 * - Server returns 304 Not Modified if nothing changed (no image data sent)
 * - Server returns 200 OK with new image only if changed
 */
export function useSlamVisualization(): UseSlamVisualizationResult {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Store the ETag for conditional requests
  const etagRef = useRef<string | null>(null);
  const lastModifiedRef = useRef<string | null>(null);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setHasChanges(false);

    try {
      const response = await apiClient.getSlamVisualization({
        etag: etagRef.current,
        lastModified: lastModifiedRef.current,
      });

      if (response.success) {
        if (response.data?.modified === false) {
          // 304 Not Modified - no changes, no data transferred
          console.log('✅ SLAM map unchanged, skipped download');
          return false;
        } else if (response.data?.imageUrl) {
          // 200 OK - new image data
          console.log('✨ SLAM map updated, new data received');
          
          // Revoke old object URL to prevent memory leaks
          if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
          }
          
          setImageUrl(response.data.imageUrl);
          setLastModified(response.data.lastModified || new Date().toISOString());
          setHasChanges(true);
          
          // Store new ETag/Last-Modified for next request
          etagRef.current = response.data.etag || null;
          lastModifiedRef.current = response.data.lastModified || null;
          
          // Reset the "has changes" indicator after 2 seconds
          setTimeout(() => setHasChanges(false), 2000);
          
          return true;
        }
      } else {
        setError(response.error || 'Failed to fetch SLAM visualization');
      }
      
      return false;
    } catch (err: any) {
      console.error('Error checking SLAM visualization:', err);
      setError(err.message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl]);

  const forceRefresh = useCallback(async () => {
    // Clear cached ETag to force a full refresh
    etagRef.current = null;
    lastModifiedRef.current = null;
    await checkForUpdates();
  }, [checkForUpdates]);

  return {
    imageUrl,
    lastModified,
    isLoading,
    error,
    hasChanges,
    checkForUpdates,
    forceRefresh,
  };
}
