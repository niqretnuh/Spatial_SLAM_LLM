import { useState, useCallback, useMemo } from 'react';
import { VoiceInterface, VideoInput, AnnotationSlideshow } from './components';
import { useLLMChat } from './hooks';
import { AnnotationResponse, SpatialObject } from './types';
import './App.css';

function App() {

  // Video processing state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [annotationData, setAnnotationData] = useState<AnnotationResponse | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('accessibility');
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [processingStep, setProcessingStep] = useState<'upload' | 'cv' | 'insights' | 'complete'>('upload');
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);

  // Convert annotation data to spatial data for CURRENT FRAME ONLY
  const spatialData = useMemo<SpatialObject[]>(() => {
    if (!annotationData?.legacyFrames) return [];
    
    const currentFrame = annotationData.legacyFrames[currentFrameIndex];
    if (!currentFrame) return [];
    
    const spatial: SpatialObject[] = [];
    
    // Extract objects from current frame only
    currentFrame.objects.forEach((obj) => {
      // Calculate approximate 3D position from bbox center and distance
      const bboxCenterX = (obj.bbox[0] + obj.bbox[2]) / 2;
      const bboxCenterY = (obj.bbox[1] + obj.bbox[3]) / 2;
      
      // Normalize coordinates (rough approximation for now)
      const normalizedX = (bboxCenterX - 320) / 320;
      const normalizedY = (bboxCenterY - 240) / 240;
      
      // Create object name with distance and dimensions embedded
      const objectName = `${obj.label} [dist: ${obj.distance.toFixed(2)}m, size: ${obj.dimensions.length.toFixed(2)}x${obj.dimensions.width.toFixed(2)}m]`;
      
      spatial.push({
        frame: currentFrame.frameNumber,
        object_name: objectName,
        x: normalizedX * obj.distance,
        y: normalizedY * obj.distance,
        z: obj.distance, // Distance from camera/viewer
      });
    });
    
    console.log(`Converted ${spatial.length} objects from current frame ${currentFrame.frameNumber} to spatial data`);
    return spatial;
  }, [annotationData, currentFrameIndex]);

  // Extract CURRENT frame image path only
  const currentFrameImagePath = useMemo<string | null>(() => {
    if (!annotationData?.legacyFrames) return null;
    
    const currentFrame = annotationData.legacyFrames[currentFrameIndex];
    return currentFrame ? currentFrame.imagePath : null;
  }, [annotationData, currentFrameIndex]);

  // LLM Chat integration with video context and spatial data
  const { 
    messages, 
    isLoading: isChatLoading, 
    error: chatError, 
    sendMessage
  } = useLLMChat({ 
    video_id: currentVideoId,
    spatial_data: spatialData.length > 0 ? spatialData : undefined,
  });

  // Handle video selection
  const handleVideoSelect = useCallback((file: File | Blob) => {
    // Create URL for video player
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    const newUrl = URL.createObjectURL(file);
    setVideoUrl(newUrl);
    
    // Reset processing state
    setAnnotationData(null);
    setCurrentVideoId(null);
    setProcessingStep('upload');
  }, [videoUrl]);

  // Handle domain selection
  const handleDomainSelect = useCallback((domain: string, _customDesc?: string) => {
    setSelectedDomain(domain);
  }, []);

  // Handle video processing
  const handleVideoProcess = useCallback((videoId: string) => {
    setCurrentVideoId(videoId);
    setIsProcessingVideo(true);
    setProcessingStep('complete');
    // Processing is handled in VideoInput component
  }, []);

  // Handle annotation response
  const handleAnnotationResponse = useCallback((data: AnnotationResponse) => {
    console.log('Annotation data received:', data);
    console.log(`Total frames: ${data.legacyFrames?.length || 0}`);
    setAnnotationData(data);
    setCurrentFrameIndex(0); // Reset to first frame
    setIsProcessingVideo(false);
  }, []);

  // Handle frame change from slideshow
  const handleFrameChange = useCallback((frameIndex: number) => {
    console.log(`📍 Frame changed to: ${frameIndex + 1}`);
    setCurrentFrameIndex(frameIndex);
  }, []);

  // Helper function to compress image
  const compressImage = async (blob: Blob, filename: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        // Create canvas with reduced dimensions (divide by ~2.83 to get ~8x compression)
        const canvas = document.createElement('canvas');
        const scaleFactor = 1 / 2.83; // This gives approximately 8x reduction in file size
        canvas.width = Math.floor(img.width * scaleFactor);
        canvas.height = Math.floor(img.height * scaleFactor);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw resized image with good quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob with JPEG compression (quality 0.85)
        canvas.toBlob(
          (compressedBlob) => {
            if (!compressedBlob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            const compressedFile = new File(
              [compressedBlob],
              filename.replace(/\.(png|jpg|jpeg)$/i, '.jpg'),
              { type: 'image/jpeg' }
            );
            
            resolve(compressedFile);
          },
          'image/jpeg',
          0.85
        );
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for compression'));
      };
      
      img.src = url;
    });
  };

  // Wrapper to send message with CURRENT frame image only
  const handleSendMessage = useCallback(async (message: string) => {
    const currentFrame = annotationData?.legacyFrames?.[currentFrameIndex];
    
    console.log('═══════════════════════════════════════════');
    console.log('📤 PREPARING DATA TO SEND TO CLAUDE');
    console.log('═══════════════════════════════════════════');
    console.log('💬 User Message:', message);
    console.log(`🖼️  Current Frame: ${currentFrameIndex + 1}/${annotationData?.legacyFrames?.length || 0}`);
    console.log('');
    
    const imageFiles: File[] = [];
    
    // Fetch and convert CURRENT frame image only
    if (currentFrameImagePath) {
      try {
        console.log(`🖼️  Fetching current frame image for visual context:`);
        console.log(`   Frame ${currentFrame?.frameNumber}: ${currentFrameImagePath}`);
        console.log('');
        
        const response = await fetch(currentFrameImagePath);
        if (!response.ok) {
          console.warn(`   ⚠️  Failed to fetch: ${currentFrameImagePath} (${response.status})`);
        } else {
          const blob = await response.blob();
          const filename = currentFrameImagePath.split('/').pop() || 'frame.png';
          const originalSize = blob.size;
          
          console.log(`📦 Original size: ${(originalSize / 1024).toFixed(1)}KB`);
          console.log(`🗜️  Compressing image (8x reduction)...`);
          
          // Compress the image
          const compressedFile = await compressImage(blob, filename);
          const compressionRatio = originalSize / compressedFile.size;
          
          imageFiles.push(compressedFile);
          console.log(`✅ Compressed to: ${(compressedFile.size / 1024).toFixed(1)}KB (${compressionRatio.toFixed(1)}x smaller)`);
        }
      } catch (err) {
        console.error('❌ Error fetching/compressing image:', err);
      }
    } else {
      console.log('ℹ️  No frame image available (annotation data not loaded)');
    }
    
    console.log('');
    console.log('📊 Spatial Data Being Sent (Current Frame Only):');
    if (spatialData && spatialData.length > 0) {
      console.log(`   Frame ${currentFrame?.frameNumber}: ${spatialData.length} objects`);
      console.log('');
      console.log('   All objects in current frame:');
      spatialData.forEach((obj, idx) => {
        console.log(`   ${idx + 1}. ${obj.object_name}`);
        console.log(`      Position: (x=${obj.x.toFixed(2)}, y=${obj.y.toFixed(2)}, z=${obj.z.toFixed(2)}m)`);
      });
    } else {
      console.log('   ℹ️  No spatial data available');
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('🚀 SENDING TO CLAUDE...');
    console.log('═══════════════════════════════════════════');
    
    // Send message with current frame image if available
    await sendMessage(message, imageFiles.length > 0 ? imageFiles : undefined);
  }, [sendMessage, currentFrameImagePath, spatialData, annotationData, currentFrameIndex]);

  // Handle restart analysis
  const handleRestartAnalysis = useCallback(() => {
    setAnnotationData(null);
    setCurrentVideoId(null);
    setIsProcessingVideo(false);
    setProcessingStep('upload');
    // Clear video URL to allow new video selection
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
  }, [videoUrl]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">👁️ JARVIS</h1>
        <p className="app-subtitle">
          AI-Powered Video Analysis smarter than your own eye.
        </p>
      </header>

      {/* Domain Selection Dropdown at Center Top */}
      <div className="domain-dropdown-container">
        <select 
          className="domain-dropdown"
          value={selectedDomain}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'custom') {
              const customDesc = prompt('Please describe your custom analysis domain:');
              if (customDesc) {
                handleDomainSelect(value, customDesc);
              }
            } else {
              handleDomainSelect(value);
            }
          }}
        >
          <option value="">Select Domain</option>
          <option value="accessibility">🦽 Accessibility Navigation</option>
          <option value="construction_safety">🏗️ Construction Safety</option>
          <option value="custom">✨ Custom Analysis</option>
        </select>
      </div>

      {chatError && (
        <div className="global-error" role="alert">
          ⚠️ {chatError}
        </div>
      )}

      {/* Main Grid: Dynamic layout based on domain */}
      <div className={`main-grid ${selectedDomain === 'accessibility' ? 'accessibility-layout' : selectedDomain === 'construction_safety' ? 'construction-safety-layout' : selectedDomain === 'fall_prevention' ? 'fall-prevention-layout' : 'non-accessibility-layout'}`}>
        {/* Video Section */}
        <div className="video-section">
          <h2 className="section-title">📹 Video Analysis</h2>
          <div className="video-content">
            {/* Show video input when not processed, annotation slideshow when processed */}
            {!annotationData ? (
              <div className="video-input-wrapper">
                <VideoInput 
                  onVideoSelect={handleVideoSelect}
                  onVideoProcess={handleVideoProcess}
                  onAnnotationResponse={handleAnnotationResponse}
                />
              </div>
            ) : (
              <div className="annotation-slideshow-wrapper">
                <AnnotationSlideshow 
                  annotationData={annotationData}
                  onRestart={handleRestartAnalysis}
                  onFrameChange={handleFrameChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* AI Assistant Section - Show for all domains */}
        {selectedDomain !== '' && (
          <div className="voice-section">
            <h2 className="section-title">
              {selectedDomain === 'accessibility' ? 'JARVIS' : 'JARVIS'}
            </h2>
            <VoiceInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
              selectedDomain={selectedDomain}
              videoContext={currentVideoId ? {
                videoId: currentVideoId,
                hasCV: false,
                hasInsights: false
              } : undefined}
            />
          </div>
        )}
      </div>

        {/* Processing status overlay */}
        {isProcessingVideo && (
          <div className="processing-overlay">
            <div className="processing-content">
              <h3>🔄 Processing Video</h3>
              <div className="processing-steps">
                <div className={`step ${processingStep === 'cv' || processingStep === 'insights' || processingStep === 'complete' ? 'completed' : 'current'}`}>
                  <span className="step-icon">🎯</span>
                  <span>Computer Vision Analysis</span>
                </div>
                <div className={`step ${processingStep === 'insights' || processingStep === 'complete' ? 'completed' : 'current'}`}>
                  <span className="step-icon">🧠</span>
                  <span>AI Insight Generation</span>
                </div>
                <div className={`step ${processingStep === 'complete' ? 'completed' : ''}`}>
                  <span className="step-icon">✨</span>
                  <span>Ready for Analysis</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

export default App;
