import React, { useState, useRef, useCallback, useEffect } from 'react';
import './VideoInput.css';

interface VideoInputProps {
  onVideoSelect?: (file: File | Blob) => void;
  onVideoProcess?: (videoId: string) => void;
  className?: string;
}

export const VideoInput: React.FC<VideoInputProps> = ({
  onVideoSelect,
  onVideoProcess,
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Initialize webcam
  const initializeCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true
      });
      
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
      console.error('Camera initialization error:', err);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!mediaStream) {
      await initializeCamera();
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(mediaStream, {
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
        setPreviewUrl(URL.createObjectURL(blob));
        onVideoSelect?.(blob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Recording failed. Please try again.');
      console.error('Recording start error:', err);
    }
  }, [mediaStream, initializeCamera, onVideoSelect]);

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
      setError(null);
      setSelectedFile(file);
      setRecordedBlob(null);
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onVideoSelect?.(file);
    }
  }, [onVideoSelect]);

  // Process video
  const processVideo = useCallback(async () => {
    const videoToProcess = selectedFile || recordedBlob;
    if (!videoToProcess) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('video', videoToProcess, 
        selectedFile ? selectedFile.name : 'recorded-video.webm'
      );

      // Simulate processing progress
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // Mock API call for video processing
      const response = await fetch('/api/process-video', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error('Video processing failed');
      }

      const result = await response.json();
      setProcessingProgress(100);
      
      setTimeout(() => {
        setIsProcessing(false);
        onVideoProcess?.(result.video_id);
      }, 1000);
      
    } catch (err) {
      setIsProcessing(false);
      setError('Video processing failed. Please try again.');
      console.error('Video processing error:', err);
    }
  }, [selectedFile, recordedBlob, onVideoProcess]);

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

  // Initialize camera on mount
  useEffect(() => {
    initializeCamera();
  }, [initializeCamera]);

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
            className={`action-btn record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? '⏹️ Stop' : '🔴 Record'}
          </button>
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
          className={`live-video ${!mediaStream ? 'hidden' : ''}`}
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
        {!mediaStream && !previewUrl && !error && (
          <div className="empty-state">
            <p>🎥 Upload a video or start recording</p>
            <small>Supports MP4, MOV, AVI, WebM formats</small>
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