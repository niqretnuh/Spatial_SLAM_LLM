import { useState, useCallback } from 'react';
import { VoiceInterface, VideoInput, AnnotationSlideshow } from './components';
import { useLLMChat } from './hooks';
import { AnnotationResponse } from './types';
import './App.css';

function App() {

  // Video processing state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [annotationData, setAnnotationData] = useState<AnnotationResponse | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('accessibility');
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [processingStep, setProcessingStep] = useState<'upload' | 'cv' | 'insights' | 'complete'>('upload');
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  // LLM Chat integration with video context
  const { 
    messages, 
    isLoading: isChatLoading, 
    error: chatError, 
    sendMessage
  } = useLLMChat({ video_id: currentVideoId });

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
    setAnnotationData(data);
    setIsProcessingVideo(false);
  }, []);

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
              onSendMessage={sendMessage}
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
