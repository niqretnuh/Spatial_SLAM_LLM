import React from 'react';
import { useVoiceInterface } from '@/hooks';
import './VoiceInterface.css';

interface VoiceInterfaceProps {
  onTranscriptComplete?: (transcript: string) => void;
  autoSend?: boolean;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onTranscriptComplete,
  autoSend = false,
}) => {
  const {
    isListening,
    transcript,
    interimTranscript,
    confidence,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    error,
    isSupported,
    exportVoiceHistory,
  } = useVoiceInterface();

  React.useEffect(() => {
    if (transcript && !isListening && autoSend && onTranscriptComplete) {
      onTranscriptComplete(transcript);
    }
  }, [transcript, isListening, autoSend, onTranscriptComplete]);

  if (!isSupported) {
    return (
      <div className="voice-interface error">
        <p>Voice interface is not supported in your browser.</p>
      </div>
    );
  }

  return (
    <div className="voice-interface">
      <div className="voice-controls">
        <button
          className={`voice-button ${isListening ? 'listening' : ''}`}
          onClick={isListening ? stopListening : startListening}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? (
            <>
              <span className="icon">🎤</span>
              <span>Listening...</span>
            </>
          ) : (
            <>
              <span className="icon">🎤</span>
              <span>Press to Speak</span>
            </>
          )}
        </button>

        {isSpeaking && (
          <button
            className="voice-button stop-speaking"
            onClick={stopSpeaking}
            aria-label="Stop speaking"
          >
            <span className="icon">🔇</span>
            <span>Stop Speaking</span>
          </button>
        )}

        <button
          className="voice-button secondary"
          onClick={exportVoiceHistory}
          aria-label="Export voice history"
        >
          <span className="icon">💾</span>
          <span>Export History</span>
        </button>
      </div>

      <div className="voice-status">
        {isListening && (
          <div className="listening-indicator">
            <span className="pulse"></span>
            <span>Listening...</span>
          </div>
        )}

        {isSpeaking && (
          <div className="speaking-indicator">
            <span className="pulse"></span>
            <span>Speaking...</span>
          </div>
        )}
      </div>

      <div className="transcript-display">
        <div className="transcript-section">
          <label>Transcript:</label>
          <div className="transcript-content">
            {transcript || 'No speech detected yet...'}
          </div>
        </div>

        {interimTranscript && (
          <div className="interim-section">
            <label>Interim:</label>
            <div className="interim-content">{interimTranscript}</div>
          </div>
        )}

        {confidence > 0 && (
          <div className="confidence-section">
            <label>Confidence:</label>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${confidence * 100}%` }}
              ></div>
              <span className="confidence-text">{(confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
