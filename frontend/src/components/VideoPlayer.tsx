import React, { useRef, useEffect, useState, useCallback } from 'react';
import './VideoPlayer.css';

interface DetectedObject {
  id: string;
  label: string;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  depth: number;
  confidence?: number;
}

interface FrameData {
  time: number;
  objects: DetectedObject[];
}

interface LLMInsight {
  object_id: string;
  insight: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface VideoPlayerProps {
  videoUrl: string;
  cvData: {
    video_id: string;
    fps: number;
    frames: FrameData[];
  } | null;
  insights: Record<string, LLMInsight[]> | null;
  onObjectClick?: (object: DetectedObject, insight?: LLMInsight) => void;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  cvData,
  insights,
  onObjectClick,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentFrame, setCurrentFrame] = useState<FrameData | null>(null);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(true);

  // Find the frame closest to current time
  const findCurrentFrame = useCallback((time: number): FrameData | null => {
    if (!cvData || !cvData.frames.length) return null;
    
    let closest = cvData.frames[0];
    let minDiff = Math.abs(closest.time - time);
    
    for (const frame of cvData.frames) {
      const diff = Math.abs(frame.time - time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = frame;
      }
    }
    
    return minDiff < 0.1 ? closest : null; // Only return if within 100ms
  }, [cvData]);

  // Draw overlays on canvas
  const drawOverlays = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !currentFrame) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size to match video
    const videoRect = video.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (containerRect) {
      canvas.width = videoRect.width;
      canvas.height = videoRect.height;
    }
    
    // Calculate scale factors
    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;
    
    currentFrame.objects.forEach((obj) => {
      const [x1, y1, x2, y2] = obj.bbox;
      const scaledX1 = x1 * scaleX;
      const scaledY1 = y1 * scaleY;
      const scaledX2 = x2 * scaleX;
      const scaledY2 = y2 * scaleY;
      const width = scaledX2 - scaledX1;
      const height = scaledY2 - scaledY1;
      
      // Get insight for this object
      const frameKey = `frame_${Math.round(currentFrame.time * 1000)}`;
      const objectInsight = insights?.[frameKey]?.find(i => i.object_id === obj.id);
      
      // Set colors based on severity
      let borderColor = '#00ff00';
      let backgroundColor = 'rgba(0, 255, 0, 0.1)';
      
      if (objectInsight?.severity) {
        switch (objectInsight.severity) {
          case 'critical':
            borderColor = '#ff0000';
            backgroundColor = 'rgba(255, 0, 0, 0.2)';
            break;
          case 'high':
            borderColor = '#ff8800';
            backgroundColor = 'rgba(255, 136, 0, 0.2)';
            break;
          case 'medium':
            borderColor = '#ffff00';
            backgroundColor = 'rgba(255, 255, 0, 0.2)';
            break;
          case 'low':
            borderColor = '#00ff00';
            backgroundColor = 'rgba(0, 255, 0, 0.1)';
            break;
        }
      }
      
      // Highlight selected object
      if (selectedObject === obj.id) {
        borderColor = '#0080ff';
        backgroundColor = 'rgba(0, 128, 255, 0.3)';
      }
      
      // Draw bounding box
      ctx.strokeStyle = borderColor;
      ctx.fillStyle = backgroundColor;
      ctx.lineWidth = 2;
      ctx.fillRect(scaledX1, scaledY1, width, height);
      ctx.strokeRect(scaledX1, scaledY1, width, height);
      
      // Draw label and depth
      const labelText = `${obj.label} (${obj.depth.toFixed(1)}m)`;
      const fontSize = Math.max(12, Math.min(16, width / 8));
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = borderColor;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      
      // Background for text
      const textMetrics = ctx.measureText(labelText);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      const textX = scaledX1;
      const textY = scaledY1 - 5;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(textX, textY - textHeight, textWidth + 10, textHeight + 5);
      
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, textX + 5, textY);
      
      // Draw insight indicator if available
      if (objectInsight && showInsights) {
        const iconSize = 20;
        const iconX = scaledX2 - iconSize - 5;
        const iconY = scaledY1 + 5;
        
        ctx.fillStyle = borderColor;
        ctx.fillRect(iconX, iconY, iconSize, iconSize);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('!', iconX + iconSize/2, iconY + iconSize/2 + 4);
        ctx.textAlign = 'start';
      }
    });
  }, [currentFrame, selectedObject, insights, showInsights]);

  // Handle canvas click
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentFrame || !canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Calculate scale factors
    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;
    
    // Find clicked object
    for (const obj of currentFrame.objects) {
      const [x1, y1, x2, y2] = obj.bbox;
      const scaledX1 = x1 * scaleX;
      const scaledY1 = y1 * scaleY;
      const scaledX2 = x2 * scaleX;
      const scaledY2 = y2 * scaleY;
      
      if (clickX >= scaledX1 && clickX <= scaledX2 && 
          clickY >= scaledY1 && clickY <= scaledY2) {
        
        setSelectedObject(obj.id);
        
        // Find insight for this object
        const frameKey = `frame_${Math.round(currentFrame.time * 1000)}`;
        const objectInsight = insights?.[frameKey]?.find(i => i.object_id === obj.id);
        
        onObjectClick?.(obj, objectInsight);
        break;
      }
    }
  }, [currentFrame, insights, onObjectClick]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      const time = video.currentTime;
      setCurrentTime(time);
      setCurrentFrame(findCurrentFrame(time));
    }
  }, [findCurrentFrame]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
      setCurrentFrame(findCurrentFrame(time));
    }
  }, [findCurrentFrame]);

  // Draw overlays on frame change
  useEffect(() => {
    drawOverlays();
  }, [drawOverlays]);

  // Format time for display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`video-player ${className}`}>
      <div className="video-player-header">
        <h3>🎬 Annotated Video Playback</h3>
        <div className="player-controls">
          <button
            className="control-btn"
            onClick={() => setShowInsights(!showInsights)}
            aria-label={showInsights ? 'Hide insights' : 'Show insights'}
          >
            {showInsights ? '👁️ Hide' : '👁️‍🗨️ Show'} Insights
          </button>
          
          {selectedObject && (
            <button
              className="control-btn"
              onClick={() => setSelectedObject(null)}
              aria-label="Clear selection"
            >
              ❌ Clear Selection
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="video-container">
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onLoadedMetadata={handleLoadedMetadata}
          className="main-video"
          preload="metadata"
        />
        
        <canvas
          ref={canvasRef}
          className="overlay-canvas"
          onClick={handleCanvasClick}
          aria-label="Video overlay with object annotations"
        />
      </div>

      {/* Custom controls */}
      <div className="video-controls">
        <button
          className="play-pause-btn"
          onClick={() => {
            const video = videoRef.current;
            if (video) {
              isPlaying ? video.pause() : video.play();
            }
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        
        <input
          type="range"
          className="timeline"
          min={0}
          max={duration}
          value={currentTime}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
          aria-label="Video timeline"
        />
        
        <div className="frame-info">
          {currentFrame && (
            <span>{currentFrame.objects.length} objects detected</span>
          )}
        </div>
      </div>

      {/* Object stats */}
      {cvData && (
        <div className="video-stats">
          <div className="stat-item">
            <span className="stat-label">Total Frames:</span>
            <span className="stat-value">{cvData.frames.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">FPS:</span>
            <span className="stat-value">{cvData.fps}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Duration:</span>
            <span className="stat-value">{formatTime(duration)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Objects in Frame:</span>
            <span className="stat-value">
              {currentFrame ? currentFrame.objects.length : 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};