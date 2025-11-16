import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnnotationResponse, AnnotatedObject } from '../types';
import './AnnotationSlideshow.css';

interface AnnotationSlideshowProps {
  annotationData: AnnotationResponse;
  onRestart?: () => void;
  className?: string;
  onFrameChange?: (frameIndex: number) => void;
}

interface TooltipData {
  object: AnnotatedObject;
  x: number;
  y: number;
  visible: boolean;
}

export const AnnotationSlideshow: React.FC<AnnotationSlideshowProps> = ({
  annotationData,
  onRestart,
  className = '',
  onFrameChange
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [hoveredObject, setHoveredObject] = useState<TooltipData | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Notify parent when frame changes
  useEffect(() => {
    if (onFrameChange) {
      onFrameChange(currentFrameIndex);
    }
  }, [currentFrameIndex, onFrameChange]);

  const currentFrame = annotationData.legacyFrames?.[currentFrameIndex] || {
    frameNumber: 1,
    imagePath: '',
    objects: []
  };
  
  // Color palette for bounding boxes
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal  
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#FFB347', // Orange
    '#87CEEB', // Sky Blue
    '#F7DC6F'  // Light Yellow
  ];

  // Handle image load to get dimensions for proper bbox scaling
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
      setImageLoaded(true);
    }
  }, []);

  const goToPrevFrame = useCallback(() => {
    const frameCount = annotationData.legacyFrames?.length || annotationData.totalFrames || 0;
    setCurrentFrameIndex(prev => 
      prev > 0 ? prev - 1 : frameCount - 1
    );
    setHoveredObject(null);
    setImageLoaded(false);
  }, [annotationData.legacyFrames?.length, annotationData.totalFrames]);

  // Navigate to next frame  
  const goToNextFrame = useCallback(() => {
    const frameCount = annotationData.legacyFrames?.length || annotationData.totalFrames || 0;
    setCurrentFrameIndex(prev => 
      prev < frameCount - 1 ? prev + 1 : 0
    );
    setHoveredObject(null);
    setImageLoaded(false);
  }, [annotationData.legacyFrames?.length, annotationData.totalFrames]);

  // Handle direct frame selection
  const selectFrame = useCallback((index: number) => {
    setCurrentFrameIndex(index);
    setHoveredObject(null);
    setImageLoaded(false);
  }, []);

  // Handle mouse enter on bounding box
  const handleObjectHover = useCallback((object: AnnotatedObject, event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setHoveredObject({
      object,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      visible: true
    });
  }, []);

  // Handle mouse leave on bounding box
  const handleObjectLeave = useCallback(() => {
    setHoveredObject(null);
  }, []);

  // Calculate scaled bounding box coordinates
  const getScaledBbox = useCallback((bbox: [number, number, number, number]) => {
    if (!imageRef.current || !imageLoaded) return bbox;
    
    const img = imageRef.current;
    const scaleX = img.clientWidth / imageDimensions.width;
    const scaleY = img.clientHeight / imageDimensions.height;
    
    return [
      bbox[0] * scaleX,
      bbox[1] * scaleY, 
      bbox[2] * scaleX,
      bbox[3] * scaleY
    ] as [number, number, number, number];
  }, [imageDimensions, imageLoaded]);

  // Reset when frame changes
  useEffect(() => {
    setHoveredObject(null);
  }, [currentFrameIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPrevFrame();
      } else if (event.key === 'ArrowRight') {
        goToNextFrame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevFrame, goToNextFrame]);

  return (
    <div className={`annotation-slideshow ${className}`}>
      <div className="slideshow-header">
        <h3>JarVision</h3>
        <div className="header-controls">
          <div className="frame-counter">
            Frame {currentFrameIndex + 1} of {annotationData.totalFrames || annotationData.total_frames || 0}
          </div>
          {onRestart && (
            <button 
              className="restart-btn"
              onClick={onRestart}
              aria-label="Start new analysis"
            >
              🔄 New Analysis
            </button>
          )}
        </div>
      </div>

      <div className="slideshow-container" ref={containerRef}>
        {/* Main 16:9 image display */}
        <div className="image-container">
          <img
            ref={imageRef}
            src={currentFrame.imagePath}
            alt={`Frame ${currentFrame.frameNumber}`}
            className="frame-image"
            onLoad={handleImageLoad}
          />
          
          {/* Bounding box overlays */}
          {imageLoaded && currentFrame.objects.map((object, index) => {
            const [x1, y1, x2, y2] = getScaledBbox(object.bbox);
            const color = colors[index % colors.length];
            
            return (
              <div
                key={object.id}
                className="bounding-box"
                style={{
                  left: x1,
                  top: y1,
                  width: x2 - x1,
                  height: y2 - y1,
                  borderColor: color,
                  backgroundColor: `${color}15` // 15% opacity
                }}
                onMouseEnter={(e) => handleObjectHover(object, e)}
                onMouseLeave={handleObjectLeave}
              >
                <div className="object-label" style={{ backgroundColor: color }}>
                  {object.label}
                </div>
              </div>
            );
          })}

          {/* Tooltip for object details */}
          {hoveredObject && (
            <div 
              className="object-tooltip"
              style={{
                left: hoveredObject.x + 10,
                top: hoveredObject.y - 10,
                transform: hoveredObject.x > window.innerWidth / 2 ? 'translateX(-100%)' : 'none'
              }}
            >
              <div className="tooltip-header">
                <strong>{hoveredObject.object.label}</strong>
                <span className="distance-badge">
                  {hoveredObject.object.distance.toFixed(1)}m away
                </span>
              </div>
              <div className="tooltip-dimensions">
                📏 {hoveredObject.object.dimensions.length.toFixed(1)}m × {hoveredObject.object.dimensions.width.toFixed(1)}m
              </div>
              <div className="tooltip-callout">
                💬 {hoveredObject.object.callout}
              </div>
            </div>
          )}
        </div>

        {/* Navigation controls right below the 16:9 container */}
        <div className="slideshow-controls">
          <button 
            className="nav-btn prev-btn"
            onClick={goToPrevFrame}
            aria-label="Previous frame"
          >
            ⬅️ Previous
          </button>
          
          <div className="frame-dots">
            {(annotationData.legacyFrames || Array(annotationData.totalFrames || 0).fill(null)).map((_, index) => (
              <button
                key={index}
                className={`frame-dot ${index === currentFrameIndex ? 'active' : ''}`}
                onClick={() => selectFrame(index)}
                aria-label={`Go to frame ${index + 1}`}
              />
            ))}
          </div>
          
          <button 
            className="nav-btn next-btn"
            onClick={goToNextFrame}
            aria-label="Next frame"
          >
            Next ➡️
          </button>
        </div>

        {/* Object summary below controls */}
        <div className="objects-sidebar">
          <h4>🔍 Detected Objects ({currentFrame.objects.length})</h4>
          <div className="objects-list">
            {currentFrame.objects.map((object, index) => {
              const color = colors[index % colors.length];
              return (
                <div 
                  key={object.id} 
                  className="object-summary"
                  style={{ borderLeftColor: color }}
                >
                  <div className="object-info">
                    <span className="object-name">{object.label}</span>
                    <span className="object-distance">
                      {object.distance !== null ? `${object.distance.toFixed(1)}m` : 'N/A'}
                    </span>
                  </div>
                  <div className="object-details">
                    📐 {object.dimensions && object.dimensions.length !== null && object.dimensions.width !== null
                      ? `${object.dimensions.length.toFixed(1)}m × ${object.dimensions.width.toFixed(1)}m`
                      : 'Dimensions N/A'}
                  </div>
                  <div className="object-callout-preview">
                    {object.callout.length > 80 
                      ? `${object.callout.substring(0, 80)}...` 
                      : object.callout}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts info */}
      <div className="shortcuts-info">
        <small>
          💡 Use ← → arrow keys to navigate frames • Hover over boxes for details
        </small>
      </div>
    </div>
  );
};

export default AnnotationSlideshow;