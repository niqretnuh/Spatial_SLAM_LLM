import { useState, useCallback } from 'react';
import { apiClient } from '@/services/api';
import {
  ObjectLocationQuery,
  ObjectLocationResponse,
  DetectedObject,
} from '@/types';

interface UseObjectQueryResult {
  // State
  data: ObjectLocationResponse | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  queryObject: (objectClass: string) => Promise<void>;
  getAllObjects: () => Promise<void>;
  reset: () => void;
  
  // Additional data
  objects: DetectedObject[];
}

/**
 * Hook for querying object locations in the SLAM system
 * Returns JSON responses that can be displayed or saved
 */
export function useObjectQuery(): UseObjectQueryResult {
  const [data, setData] = useState<ObjectLocationResponse | null>(null);
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryObject = useCallback(async (objectClass: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const query: ObjectLocationQuery = { class: objectClass };
      const response = await apiClient.getObjectLocation(query);

      if (response.success && response.data) {
        setData(response.data);
        
        // Save to JSON file (can be downloaded or stored)
        const jsonResult = {
          query: objectClass,
          timestamp: new Date().toISOString(),
          response: response.data,
        };
        
        console.log('Object Query Result (JSON):', JSON.stringify(jsonResult, null, 2));
        
        // Optionally trigger download
        // downloadJSON(jsonResult, `object-query-${objectClass}-${Date.now()}.json`);
      } else {
        setError(response.error || 'Failed to query object location');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAllObjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getAllObjects();

      if (response.success && response.data) {
        setObjects(response.data);
        
        // Save all objects to JSON
        const jsonResult = {
          timestamp: new Date().toISOString(),
          totalObjects: response.data.length,
          objects: response.data,
        };
        
        console.log('All Objects (JSON):', JSON.stringify(jsonResult, null, 2));
      } else {
        setError(response.error || 'Failed to fetch objects');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setObjects([]);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    queryObject,
    getAllObjects,
    reset,
    objects,
  };
}

// Utility function to download JSON
export function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
