import React, { useState } from 'react';
import { useLLMChat, useVoiceInterface } from '@/hooks';
import { ChatMessage } from '@/types';
import './ChatInterface.css';

interface VideoContext {
  videoId: string;
  hasCV: boolean;
  hasInsights: boolean;
}

interface ChatInterfaceProps {
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  videoContext?: VideoContext;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages: externalMessages,
  onSendMessage: externalSendMessage,
  isLoading: externalIsLoading,
  className = '',
  videoContext
}) => {
  const {
    messages: internalMessages,
    isLoading: internalIsLoading,
    error,
    sendMessage: internalSendMessage,
    clearHistory,
    exportConversation,
  } = useLLMChat();

  const { speak, isSpeaking } = useVoiceInterface();
  const [inputText, setInputText] = useState('');

  // Use external props if provided, otherwise use internal hook
  const messages = externalMessages || internalMessages;
  const isLoading = externalIsLoading ?? internalIsLoading;
  const sendMessage = externalSendMessage || internalSendMessage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    await sendMessage(inputText);
    setInputText('');
  };

  const handleSpeakResponse = (text: string) => {
    speak(text);
  };

  return (
    <div className={`chat-interface ${className}`}>
      <div className="chat-header">
        <h2>💬 AI Assistant</h2>
        <div className="chat-actions">
          {videoContext && (
            <div className="video-context-indicator">
              <span className="context-label">Video Analysis:</span>
              <span className={`context-status ${videoContext.hasCV ? 'active' : 'inactive'}`}>
                {videoContext.hasCV ? '✅ CV' : '⏳ CV'}
              </span>
              <span className={`context-status ${videoContext.hasInsights ? 'active' : 'inactive'}`}>
                {videoContext.hasInsights ? '✅ Insights' : '⏳ Insights'}
              </span>
            </div>
          )}
          <button
            className="action-button"
            onClick={exportConversation}
            aria-label="Export conversation"
          >
            💾 Export
          </button>
          <button
            className="action-button"
            onClick={clearHistory}
            aria-label="Clear chat history"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>👋 Hello! Ask me about object locations in your kitchen.</p>
            <div className="suggestions">
              <p>Try asking:</p>
              <ul>
                <li>"Where did I leave the mug?"</li>
                <li>"Can you find my knife?"</li>
                <li>"Where is the cutting board?"</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
                </span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-content">{message.content}</div>
              
              {message.role === 'assistant' && (
                <button
                  className="speak-button"
                  onClick={() => handleSpeakResponse(message.content)}
                  disabled={isSpeaking}
                  aria-label="Read message aloud"
                >
                  🔊 Speak
                </button>
              )}

              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="tool-calls">
                  <details>
                    <summary>🔧 Tool Calls ({message.toolCalls.length})</summary>
                    <div className="tool-calls-content">
                      {message.toolCalls.map((tool, toolIndex) => (
                        <div key={toolIndex} className="tool-call">
                          <strong>{tool.name}</strong>
                          <pre>{JSON.stringify(tool.parameters, null, 2)}</pre>
                          {tool.result && (
                            <div className="tool-result">
                              <strong>Result:</strong>
                              <pre>{JSON.stringify(tool.result, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="message assistant loading">
            <div className="message-header">
              <span className="message-role">🤖 Assistant</span>
            </div>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Ask about object locations..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          aria-label="Chat message input"
        />
        <button
          type="submit"
          className="send-button"
          disabled={isLoading || !inputText.trim()}
          aria-label="Send message"
        >
          {isLoading ? '⏳' : '➤'}
        </button>
      </form>
    </div>
  );
};
