import React, { useState, useRef, useCallback, useEffect } from 'react';
import './VideoInput.css';

interface VideoInputProps {
  onVideoSelect?: (file: File | Blob) => void;
  onVideoProcess?: (videoId: string) => void;
  onAnnotationResponse?: (annotationData: any) => void;
  className?: string;
}

export const VideoInput: React.FC<VideoInputProps> = ({
  onVideoSelect,
  onVideoProcess,
  onAnnotationResponse,
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [showLiveVideo, setShowLiveVideo] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Initialize webcam
  const initializeCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitializingCamera(true);
      
      // Stop existing stream if any
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true
      });
      
      setMediaStream(stream);
      setIsInitializingCamera(false);
      
      // Wait for next tick to ensure state is updated
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 0);
      
      return stream;
    } catch (err) {
      setIsInitializingCamera(false);
      setError('Camera access denied. Please allow camera permissions.');
      console.error('Camera initialization error:', err);
      return null;
    }
  }, []);

  // Toggle live video feed
  const toggleLiveVideo = useCallback(async () => {
    if (!showLiveVideo) {
      // Turn on live video
      setShowLiveVideo(true);
      if (!mediaStream) {
        await initializeCamera();
      }
    } else {
      // Turn off live video
      setShowLiveVideo(false);
      setIsInitializingCamera(false); // Reset initialization state when turning off
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [showLiveVideo, mediaStream, initializeCamera]); // Remove mediaStream dependency to prevent infinite re-renders

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Ensure live video is turned on for recording
      if (!showLiveVideo) {
        setShowLiveVideo(true);
      }
      
      // Ensure we have an active media stream
      let currentStream = mediaStream;
      
      // Check if the current stream is active, if not reinitialize
      if (!currentStream || !currentStream.active || currentStream.getTracks().every(track => track.readyState === 'ended')) {
        await initializeCamera();
        // Wait a bit for the stream to be set
        await new Promise(resolve => setTimeout(resolve, 500));
        currentStream = mediaStream;
      }
      
      // Double check we have a valid stream after initialization
      if (!currentStream || !currentStream.active) {
        setError('Camera not available. Please allow camera permissions and try again.');
        return;
      }

      chunksRef.current = [];
      setShowLivePreview(true);
      
      const mediaRecorder = new MediaRecorder(currentStream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        // Clean up previous preview URL to prevent memory leaks
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        const newPreviewUrl = URL.createObjectURL(blob);
        setPreviewUrl(newPreviewUrl);
        onVideoSelect?.(blob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Recording failed. Please try again.');
      console.error('Recording start error:', err);
    }
  }, [mediaStream, initializeCamera, onVideoSelect, previewUrl]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Handle file upload
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if there's an existing video
      if (recordedBlob || selectedFile) {
        const shouldReplace = window.confirm(
          'You have an existing video. Do you want to replace it with the new file?'
        );
        if (!shouldReplace) {
          event.target.value = ''; // Reset file input
          return;
        }
        // Clear existing video
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      }

      setError(null);
      setSelectedFile(file);
      setRecordedBlob(null);
      
      // Clean up previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onVideoSelect?.(file);
    }
  }, [onVideoSelect, previewUrl]);
  
  // Clear preview and return to live camera
  const clearPreview = useCallback(() => {
    setError(null);
    setSelectedFile(null);
    setRecordedBlob(null);
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    // Optionally turn on live video when clearing preview
    if (!showLiveVideo) {
      setShowLiveVideo(true);
      initializeCamera();
    }
  }, [previewUrl, showLiveVideo, initializeCamera]);

  // Process video
  const processVideo = useCallback(async () => {
    const videoToProcess = selectedFile || recordedBlob;
    if (!videoToProcess) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      // Simulate processing progress
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // Simulate API delay and processing
      await new Promise(resolve => setTimeout(resolve, 15000)); // 3 second delay
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      // Generate mock video ID
      const mockVideoId = `video_${Date.now()}`;
      
      // Call the main video process callback
      onVideoProcess?.(mockVideoId);
      
      // Call getAnnotationResponse (for now with mock data)
      const { apiClient } = await import('../services/api');
      const annotationResponse = await apiClient.getAnnotationResponse(mockVideoId);
      
      if (annotationResponse.success && annotationResponse.data) {
        onAnnotationResponse?.(annotationResponse.data);
      }
      
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
      
    } catch (err) {
      setIsProcessing(false);
      setError('Video processing failed. Please try again.');
      console.error('Video processing error:', err);
    }
  }, [selectedFile, recordedBlob, onVideoProcess, onAnnotationResponse]);

  // Update video ref when media stream changes
  useEffect(() => {
    if (mediaStream && videoRef.current && showLivePreview) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, showLivePreview]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [mediaStream, previewUrl]);

  return (
    <div className={`video-input ${className}`}>
      <div className="video-input-header">
        <h3>📹 Video Input</h3>
        <div className="input-actions">
          <button
            className="action-btn upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            aria-label="Upload video file"
          >
            📁 Upload
          </button>
          
          <button
            className="action-btn live-video-btn"
            onClick={toggleLiveVideo}
            disabled={isProcessing}
            aria-label={showLiveVideo ? 'Turn off live video' : 'Turn on live video'}
          >
            {showLiveVideo ? '📹 Turn Off Camera' : '📷 Turn On Camera'}
          </button>
          
          <button
            className={`action-btn record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || !showLiveVideo}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? '⏹️ Stop' : '🔴 Record'}
          </button>
          
          {/* Clear preview button */}
          {previewUrl && !isRecording && (
            <button
              className="action-btn clear-btn"
              onClick={clearPreview}
              disabled={isProcessing}
              aria-label="Clear preview and return to live camera"
            >
              🔄 New Recording
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/mov,video/avi,video/webm"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-label="Select video file"
      />

      <div className="video-container">
        {/* Live camera feed */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`live-video ${!showLiveVideo || previewUrl ? 'hidden' : ''}`}
          aria-label="Live camera feed"
        />

        {/* Preview of selected/recorded video */}
        {previewUrl && (
          <video
            src={previewUrl}
            controls
            className="preview-video"
            aria-label="Video preview"
          />
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            <span>Recording...</span>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="processing-overlay">
            <div className="processing-content">
              <div className="progress-circle">
                <div 
                  className="progress-fill"
                  style={{ '--progress': `${processingProgress}%` } as React.CSSProperties}
                ></div>
                <span className="progress-text">{processingProgress}%</span>
              </div>
              <p>Processing video...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="error-overlay">
            <p>❌ {error}</p>
          </div>
        )}

        {/* Empty state */}
        {!showLiveVideo && !previewUrl && !error && (
          <div className="empty-state">
            <p>🎥 Turn on camera to record or upload a video</p>
            <small>Supports MP4, MOV, AVI, WebM formats</small>
          </div>
        )}
        
        {/* Loading state - only show when actively initializing camera */}
        {isInitializingCamera && (
          <div className="empty-state">
            <p>📷 Initializing camera...</p>
          </div>
        )}
      </div>

      {/* Video info */}
      <div className="video-info">
        {selectedFile && (
          <div className="file-info">
            <span>📁 {selectedFile.name}</span>
            <span>({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        )}
        
        {recordedBlob && (
          <div className="file-info">
            <span>🎬 Recorded video</span>
            <span>({(recordedBlob.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        )}
      </div>

      {/* Process button */}
      {(selectedFile || recordedBlob) && !isProcessing && (
        <button
          className="process-btn"
          onClick={processVideo}
          disabled={isProcessing}
        >
          🚀 Process Video
        </button>
      )}
    </div>
  );
};