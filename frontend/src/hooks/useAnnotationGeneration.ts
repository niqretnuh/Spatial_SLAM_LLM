import { useState, useCallback } from 'react';
import { apiClient } from '@/services/api';
import { AnnotationResponse, SpatialObject } from '@/types';

interface UseAnnotationGenerationOptions {
  domain?: string;
}

interface UseAnnotationGenerationResult {
  // State
  annotations: AnnotationResponse | null;
  isGenerating: boolean;
  error: string | null;
  
  // Actions
  generateAnnotations: (videoFrames: SpatialObject[], domain: string) => Promise<AnnotationResponse | null>;
  clearAnnotations: () => void;
}

/**
 * Hook for generating JSON annotations from video frame data
 * Uses LLM to analyze spatial data and output structured JSON for slideshow display
 */
export function useAnnotationGeneration(options: UseAnnotationGenerationOptions = {}): UseAnnotationGenerationResult {
  const [annotations, setAnnotations] = useState<AnnotationResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnnotations = useCallback(async (
    videoFrames: SpatialObject[], 
    domain: string
  ): Promise<AnnotationResponse | null> => {
    if (!videoFrames || videoFrames.length === 0) {
      setError('No video frame data provided');
      return null;
    }

    console.log('Generating annotations for video frames:', videoFrames.length);
    console.log('Domain:', domain);
    setIsGenerating(true);
    setError(null);

    try {
      // Create a specialized prompt for JSON annotation generation
      const annotationPrompt = buildAnnotationPrompt(domain, videoFrames.length);

      const response = await apiClient.sendChatMessage({
        message: annotationPrompt,
        spatial_data: videoFrames,
        context: [],
      });

      if (response.success && response.data) {
        console.log('Raw LLM Response:', response.data);
        
        // Parse the LLM response into structured annotations
        const parsedAnnotations = parseAnnotationResponse(response.data.response, videoFrames);
        
        console.log('Parsed Annotations:', parsedAnnotations);
        setAnnotations(parsedAnnotations);
        return parsedAnnotations;
      } else {
        const errorMsg = response.error || 'Failed to generate annotations';
        console.error('Annotation generation error:', errorMsg);
        setError(errorMsg);
        return null;
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred';
      console.error('Unexpected error in generateAnnotations:', err);
      setError(errorMsg);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations(null);
    setError(null);
  }, []);

  return {
    annotations,
    isGenerating,
    error,
    generateAnnotations,
    clearAnnotations,
  };
}

/**
 * Build the specialized prompt for annotation generation based on domain
 */
function buildAnnotationPrompt(domain: string, frameCount: number): string {
  const domainPrompts: Record<string, string> = {
    construction_safety: `Analyze this workplace video data and generate OSHA safety compliance annotations in JSON format.

For each frame, identify:
1. Safety violations and hazards
2. OSHA regulation citations (e.g., 1926.1053(b)(5))
3. Risk severity (low, medium, high, critical)
4. Specific measurements and clearances
5. Recommended actions

Output MUST be valid JSON in this exact format:
{
  "domain": "Construction Safety",
  "total_frames": ${frameCount},
  "summary": {
    "total_violations": <number>,
    "critical_count": <number>,
    "high_count": <number>,
    "medium_count": <number>
  },
  "frames": [
    {
      "frame_number": <number>,
      "timestamp": <number>,
      "hazards": [
        {
          "object_id": "<id>",
          "object_label": "<label>",
          "violation": "<description>",
          "severity": "critical|high|medium|low",
          "osha_citation": "<regulation>",
          "measurements": {
            "clearance": <number>,
            "distance": <number>
          },
          "recommendation": "<action>"
        }
      ]
    }
  ]
}

Use the list_all_objects tool first, then analyze spatial relationships between objects.`,

    accessibility: `Analyze this environment video data and generate accessibility navigation annotations in JSON format.

For each frame, identify:
1. Navigation obstacles and hazards
2. Safe paths and clearances
3. Accessibility concerns (wheelchair access, visual impairments)
4. Distance measurements
5. Navigation recommendations

Output MUST be valid JSON in this exact format:
{
  "domain": "Accessibility Navigation",
  "total_frames": ${frameCount},
  "summary": {
    "obstacle_count": <number>,
    "safe_zones": <number>,
    "hazard_level": "safe|caution|danger"
  },
  "frames": [
    {
      "frame_number": <number>,
      "timestamp": <number>,
      "obstacles": [
        {
          "object_id": "<id>",
          "object_label": "<label>",
          "concern": "<description>",
          "severity": "high|medium|low",
          "measurements": {
            "distance": <number>,
            "clearance": <number>
          },
          "navigation_advice": "<guidance>"
        }
      ]
    }
  ]
}

Use the list_all_objects tool first, then analyze spatial relationships.`,

    custom: `Analyze this video data and generate detailed annotations in JSON format.

For each frame, identify relevant objects, their relationships, and any concerns or points of interest.

Output MUST be valid JSON in this exact format:
{
  "domain": "Custom Analysis",
  "total_frames": ${frameCount},
  "summary": {
    "object_count": <number>,
    "points_of_interest": <number>
  },
  "frames": [
    {
      "frame_number": <number>,
      "timestamp": <number>,
      "annotations": [
        {
          "object_id": "<id>",
          "object_label": "<label>",
          "observation": "<description>",
          "measurements": {
            "x": <number>,
            "y": <number>,
            "z": <number>
          },
          "note": "<additional info>"
        }
      ]
    }
  ]
}

Use the list_all_objects tool first to understand the scene.`
  };

  return domainPrompts[domain] || domainPrompts.custom;
}

/**
 * Parse LLM response and extract JSON annotations
 */
function parseAnnotationResponse(llmResponse: string, videoFrames: SpatialObject[]): AnnotationResponse {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = llmResponse.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonString = jsonMatch ? jsonMatch[1] : llmResponse;
    
    // Try to parse as JSON
    const parsed = JSON.parse(jsonString.trim());
    
    // Validate and return
    if (parsed && parsed.frames) {
      return parsed as AnnotationResponse;
    }
    
    throw new Error('Invalid annotation format');
  } catch (e) {
    console.error('Failed to parse JSON annotations, creating fallback:', e);
    
    // Create fallback annotations
    return createFallbackAnnotations(llmResponse, videoFrames);
  }
}

/**
 * Create fallback annotations if JSON parsing fails
 */
function createFallbackAnnotations(llmResponse: string, videoFrames: SpatialObject[]): AnnotationResponse {
  // Group frames by frame number
  const frameGroups: Record<number, SpatialObject[]> = {};
  videoFrames.forEach(obj => {
    const frameNum = Math.floor(obj.frame);
    if (!frameGroups[frameNum]) {
      frameGroups[frameNum] = [];
    }
    frameGroups[frameNum].push(obj);
  });

  const frames = Object.entries(frameGroups).map(([frameNum, objects]) => ({
    frame_number: parseInt(frameNum),
    timestamp: objects[0]?.frame || 0,
    annotations: objects.map(obj => ({
      object_id: `obj_${frameNum}_${obj.object_name}`,
      object_label: obj.object_name,
      observation: `${obj.object_name} detected at position (${obj.x.toFixed(2)}, ${obj.y.toFixed(2)}, ${obj.z.toFixed(2)})`,
      measurements: {
        x: obj.x,
        y: obj.y,
        z: obj.z
      },
      note: 'Auto-generated annotation'
    }))
  }));

  return {
    domain: 'General Analysis',
    total_frames: frames.length,
    summary: {
      object_count: videoFrames.length,
      analysis_complete: true,
      llm_response: llmResponse
    },
    frames
  };
}
