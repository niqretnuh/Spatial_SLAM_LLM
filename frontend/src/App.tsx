import { useState, useCallback } from 'react';
import { VoiceInterface, ChatInterface, VideoInput, VideoPlayer } from './components';
import { useLLMChat } from './hooks';
import { apiClient } from './services/api';
import { CVPipelineResult, VideoInsightsResponse, VideoDetectedObject, LLMInsight } from './types';
import './App.css';

function App() {

  // Video processing state
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [cvData, setCvData] = useState<CVPipelineResult | null>(null);
  const [insights, setInsights] = useState<Record<string, LLMInsight[]> | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [processingStep, setProcessingStep] = useState<'upload' | 'cv' | 'insights' | 'complete'>('upload');
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  // LLM Chat integration with video context
  const { 
    messages, 
    isLoading: isChatLoading, 
    error: chatError, 
    sendMessage, 
    clearHistory 
  } = useLLMChat({ video_id: currentVideoId });

  // Handle video selection
  const handleVideoSelect = useCallback((file: File | Blob) => {
    setVideoBlob(file);
    
    // Create URL for video player
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    const newUrl = URL.createObjectURL(file);
    setVideoUrl(newUrl);
    
    // Reset processing state
    setCvData(null);
    setInsights(null);
    setCurrentVideoId(null);
    setProcessingStep('upload');
  }, [videoUrl]);

  // Handle domain selection
  const handleDomainSelect = useCallback((domain: string, customDesc?: string) => {
    setSelectedDomain(domain);
    if (customDesc) {
      setCustomDescription(customDesc);
    }
  }, []);

  // Process video with CV pipeline and generate insights
  const handleVideoProcess = useCallback(async (videoId: string) => {
    if (!videoBlob || !selectedDomain) return;

    setIsProcessingVideo(true);
    setCurrentVideoId(videoId);
    setProcessingStep('cv');

    try {
      // Step 1: Process video through CV pipeline
      const processResponse = await apiClient.processVideo({
        video: videoBlob,
        domain: selectedDomain,
        customDescription: selectedDomain === 'custom' ? customDescription : undefined,
      });

      if (!processResponse.success) {
        throw new Error(processResponse.error || 'Video processing failed');
      }

      const finalVideoId = processResponse.data?.video_id || videoId;
      setCurrentVideoId(finalVideoId);

      // Step 2: Get CV results
      const cvResponse = await apiClient.getCVResults(finalVideoId);
      if (cvResponse.success && cvResponse.data) {
        setCvData(cvResponse.data);
      }

      setProcessingStep('insights');

      // Step 3: Generate insights
      const insightsResponse = await apiClient.generateInsights({
        video_id: finalVideoId,
        domain: selectedDomain,
        customDescription: selectedDomain === 'custom' ? customDescription : undefined,
      });

      if (insightsResponse.success && insightsResponse.data) {
        setInsights(insightsResponse.data.insights);
      }

      setProcessingStep('complete');
    } catch (error) {
      console.error('Video processing error:', error);
      // For demo purposes, create mock data
      createMockData(videoId);
    } finally {
      setIsProcessingVideo(false);
    }
  }, [videoBlob, selectedDomain, customDescription]);

  // Create mock data for demonstration
  const createMockData = useCallback((videoId: string) => {
    const mockCvData: CVPipelineResult = {
      video_id: videoId,
      fps: 30,
      frames: [
        {
          time: 1.0,
          objects: [
            {
              id: 'obj_1',
              label: 'ladder',
              bbox: [100, 100, 200, 300],
              depth: 2.8,
              confidence: 0.92
            },
            {
              id: 'obj_2',
              label: 'person',
              bbox: [300, 150, 450, 400],
              depth: 1.5,
              confidence: 0.88
            }
          ]
        },
        {
          time: 2.0,
          objects: [
            {
              id: 'obj_3',
              label: 'safety_cone',
              bbox: [50, 350, 120, 450],
              depth: 3.2,
              confidence: 0.85
            }
          ]
        }
      ]
    };

    const mockInsights: Record<string, LLMInsight[]> = {
      'frame_1000': [
        {
          object_id: 'obj_1',
          insight: 'Ladder not properly secured at base. OSHA violation 1926.1053(b)(6).',
          severity: 'high'
        },
        {
          object_id: 'obj_2',
          insight: 'Person working without hard hat in construction zone.',
          severity: 'critical'
        }
      ],
      'frame_2000': [
        {
          object_id: 'obj_3',
          insight: 'Safety cone properly positioned to warn of hazard.',
          severity: 'low'
        }
      ]
    };

    setCvData(mockCvData);
    setInsights(mockInsights);
    setCurrentVideoId(videoId);
    setProcessingStep('complete');
  }, []);

  // Handle object click in video player
  const handleObjectClick = useCallback((object: VideoDetectedObject, insight?: LLMInsight) => {
    if (insight) {
      const message = `Tell me more about: ${insight.insight}`;
      sendMessage(message);
    }
  }, [sendMessage]);

  // Handle voice input
  const handleVoiceTranscript = useCallback(async (transcript: string) => {
    await sendMessage(transcript);
  }, [sendMessage]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">👁️ Third Eye Visual Intelligence</h1>
        <p className="app-subtitle">
          AI-powered video analysis for accessibility and safety insights
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
          <option value="">Select Analysis Domain</option>
          <option value="accessibility">🦽 Accessibility Assessment</option>
          <option value="construction_safety">🏗️ Construction Safety</option>
          <option value="fall_prevention">⚠️ Fall Prevention</option>
          <option value="custom">✨ Custom Analysis</option>
        </select>
      </div>

      {chatError && (
        <div className="global-error" role="alert">
          ⚠️ {chatError}
        </div>
      )}

      {/* Main Grid: Dynamic layout based on domain */}
      <div className={`main-grid ${selectedDomain === 'accessibility' ? 'accessibility-layout' : 'non-accessibility-layout'}`}>
        {/* Video Section */}
        <div className="video-section">
          <h2 className="section-title">📹 Video Analysis</h2>
          <div className="video-content">
            <div className="video-input-wrapper">
              <VideoInput 
                onVideoSelect={handleVideoSelect}
                onVideoProcess={handleVideoProcess}
              />
            </div>
            
            {/* Show video player when video is processed */}
            {videoUrl && cvData && (
              <div className="video-player-wrapper">
                <VideoPlayer
                  videoUrl={videoUrl}
                  cvData={cvData}
                  insights={insights}
                  onObjectClick={handleObjectClick}
                />
              </div>
            )}
          </div>
        </div>

        {/* Chat Section - Only show for non-accessibility domains */}
        {selectedDomain !== 'accessibility' && selectedDomain !== '' && (
          <div className="chat-section">
            <h2 className="section-title">💬 AI Assistant</h2>
            <ChatInterface 
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={isChatLoading}
              videoContext={currentVideoId ? {
                videoId: currentVideoId,
                hasCV: !!cvData,
                hasInsights: !!insights
              } : undefined}
            />
          </div>
        )}
        
        {/* Voice Section - Only show for accessibility domain */}
        {selectedDomain === 'accessibility' && (
          <div className="voice-section">
            <h2 className="section-title">🎤 Voice Interface</h2>
            <VoiceInterface
              onTranscriptComplete={handleVoiceTranscript}
              autoSend={true}
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
                <div className={`step ${processingStep === 'insights' || processingStep === 'complete' ? 'completed' : processingStep === 'insights' ? 'current' : ''}`}>
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
