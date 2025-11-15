import React, { useState } from 'react';
import { VoiceInterface, ChatInterface, ObjectVisualization } from './components';
import { useSLAM } from './hooks';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'objects' | 'voice'>('chat');
  const { session, isTracking, startSession, stopSession, isLoading, error } = useSLAM();

  const handleVoiceTranscript = async (transcript: string) => {
    // This will be handled by integrating with chat
    console.log('Voice transcript:', transcript);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🗺️ Spatial SLAM LLM</h1>
          <p className="header-subtitle">
            AI-powered object location assistant for visually impaired users
          </p>
        </div>
        
        <div className="slam-status">
          <div className={`status-indicator ${isTracking ? 'active' : 'inactive'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {session ? (session.status === 'tracking' ? 'Tracking' : session.status) : 'Not Started'}
            </span>
          </div>
          
          {session && (
            <div className="slam-info">
              <span>Keyframes: {session.keyframeCount}</span>
              <span>Map Points: {session.mapPointCount}</span>
            </div>
          )}

          <button
            className={`slam-button ${isTracking ? 'stop' : 'start'}`}
            onClick={isTracking ? stopSession : startSession}
            disabled={isLoading}
          >
            {isLoading ? '⏳' : isTracking ? '⏸️ Stop SLAM' : '▶️ Start SLAM'}
          </button>
        </div>
      </header>

      {error && (
        <div className="global-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      <nav className="app-navigation">
        <button
          className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
          aria-label="Chat interface"
        >
          💬 Chat
        </button>
        <button
          className={`nav-button ${activeTab === 'objects' ? 'active' : ''}`}
          onClick={() => setActiveTab('objects')}
          aria-label="Object visualization"
        >
          📦 Objects
        </button>
        <button
          className={`nav-button ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => setActiveTab('voice')}
          aria-label="Voice interface"
        >
          🎤 Voice
        </button>
      </nav>

      <main className="app-main">
        <div className="main-content">
          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'objects' && <ObjectVisualization />}
          {activeTab === 'voice' && (
            <VoiceInterface
              onTranscriptComplete={handleVoiceTranscript}
              autoSend={false}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Spatial SLAM LLM &copy; 2025 | Helping visually impaired users navigate their space
        </p>
        <div className="footer-links">
          <a href="#accessibility" aria-label="Accessibility information">
            ♿ Accessibility
          </a>
          <a href="#help" aria-label="Help documentation">
            ❓ Help
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
