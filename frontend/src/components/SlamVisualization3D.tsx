import React, { useEffect, useRef, useState } from 'react';
import { useSlamVisualization } from '@/hooks';
import './SlamVisualization3D.css';

interface SlamVisualization3DProps {
  updateInterval?: number; // milliseconds, default 3000
}

export const SlamVisualization3D: React.FC<SlamVisualization3DProps> = ({ 
  updateInterval = 3000 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    imageUrl, 
    lastModified, 
    isLoading, 
    error,
    hasChanges,
    checkForUpdates 
  } = useSlamVisualization();

  const [renderStats, setRenderStats] = useState({
    totalChecks: 0,
    actualUpdates: 0,
    lastUpdateTime: null as string | null,
  });

  useEffect(() => {
    // Poll for updates every 3 seconds
    const interval = setInterval(async () => {
      const changed = await checkForUpdates();
      
      setRenderStats(prev => ({
        totalChecks: prev.totalChecks + 1,
        actualUpdates: changed ? prev.actualUpdates + 1 : prev.actualUpdates,
        lastUpdateTime: changed ? new Date().toISOString() : prev.lastUpdateTime,
      }));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [checkForUpdates, updateInterval]);

  useEffect(() => {
    // Render the image when it changes
    if (imageUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          // Scale canvas to image size
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the SLAM visualization
          ctx.drawImage(img, 0, 0);
        };
        img.src = imageUrl;
      }
    }
  }, [imageUrl]);

  return (
    <div className="slam-visualization-3d">
      <div className="viz-header">
        <h2>🗺️ 3D SLAM Map</h2>
        <div className="viz-stats">
          <span className="stat">
            Checks: {renderStats.totalChecks}
          </span>
          <span className="stat">
            Updates: {renderStats.actualUpdates}
          </span>
          <span className="stat">
            Efficiency: {renderStats.totalChecks > 0 
              ? Math.round((1 - renderStats.actualUpdates / renderStats.totalChecks) * 100) 
              : 0}% saved
          </span>
          {isLoading && <span className="loading-indicator">🔄</span>}
          {hasChanges && <span className="update-indicator">✨ Updated</span>}
        </div>
      </div>

      <div className="viz-container">
        {error ? (
          <div className="error-state">
            <p>❌ {error}</p>
            <button onClick={() => checkForUpdates()}>Retry</button>
          </div>
        ) : (
          <canvas 
            ref={canvasRef}
            className="slam-canvas"
            aria-label="3D SLAM map visualization"
          />
        )}

        {!imageUrl && !error && (
          <div className="empty-state">
            <p>🎯 Start SLAM session to see the 3D map</p>
            <small>The map will update automatically every {updateInterval / 1000} seconds</small>
          </div>
        )}
      </div>

      <div className="viz-info">
        {lastModified && (
          <small>Last updated: {new Date(lastModified).toLocaleString()}</small>
        )}
        {renderStats.lastUpdateTime && (
          <small> | Last change: {new Date(renderStats.lastUpdateTime).toLocaleTimeString()}</small>
        )}
      </div>
    </div>
  );
};
