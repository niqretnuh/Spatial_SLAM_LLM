import React, { useState, useEffect, useRef } from 'react';
import { useVoiceInterface } from '@/hooks';
import { ChatMessage } from '@/types';
import './VoiceInterface.css';

// Mic Icon Component
const MicIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
    />
  </svg>
);

// Sound Icon Component
const SoundIcon = ({ className, isSpeaking }: { className?: string; isSpeaking?: boolean }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d={isSpeaking 
        ? "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
        : "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      }
    />
    {!isSpeaking && (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.536 8.464a5 5 0 010 7.072"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728"
        />
      </>
    )}
  </svg>
);

interface VoiceInterfaceProps {
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  selectedDomain?: string;
  videoContext?: {
    videoId: string;
    hasCV: boolean;
    hasInsights: boolean;
  };
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  messages = [],
  onSendMessage,
  isLoading = false,
  className = '',
  selectedDomain = '',
  videoContext,
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
    clearTranscript,
    error,
    isSupported,
  } = useVoiceInterface();

  const [inputText, setInputText] = useState('');
  const [lastSentTranscript, setLastSentTranscript] = useState('');
  const [lastAssistantMessageIndex, setLastAssistantMessageIndex] = useState(-1);
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Automatically speak new assistant messages ONLY for voice inputs
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && 
        lastMessage.role === 'assistant' && 
        messages.length - 1 !== lastAssistantMessageIndex &&
        !isLoading &&
        isVoiceInput) { // Only speak if the input was from voice
      setLastAssistantMessageIndex(messages.length - 1);
      // Small delay to ensure the message is fully rendered
      setTimeout(() => {
        speak(lastMessage.content);
      }, 500);
    }
  }, [messages, lastAssistantMessageIndex, isLoading, speak, isVoiceInput]);

  // Update input text when voice transcript is ready and auto-send
  useEffect(() => {
    if (transcript && !isListening && transcript.trim() !== '' && transcript !== lastSentTranscript) {
      setInputText(transcript);
      setLastSentTranscript(transcript);
      setIsVoiceInput(true); // Mark as voice input
      clearTranscript();
      
      // Auto-send voice input
      if (onSendMessage) {
        onSendMessage(transcript).then(() => {
          setInputText(''); // Clear input after sending
          setLastSentTranscript('');
        });
      }
    }
  }, [transcript, isListening, lastSentTranscript, clearTranscript, onSendMessage]);

  // Update input with interim results while listening
  useEffect(() => {
    if (isListening && interimTranscript) {
      setInputText(interimTranscript);
    }
  }, [isListening, interimTranscript]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || !onSendMessage) return;

    setIsVoiceInput(false); // Mark as typed input
    await onSendMessage(inputText);
    setInputText('');
    setLastSentTranscript('');
  };

  // Handle manual text changes (typed input)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setIsVoiceInput(false); // Mark as typed input when user types
  };

  // Handle suggestion button clicks
  const handleSuggestionClick = async (suggestionText: string) => {
    if (isLoading || !onSendMessage) return;
    
    setInputText(suggestionText);
    setIsVoiceInput(false); // Mark as typed input (clicked suggestion)
    
    // Send the suggestion immediately
    await onSendMessage(suggestionText);
    setInputText(''); // Clear input after sending
  };

  // Get domain-specific suggestions
  const getSuggestions = () => {
    switch (selectedDomain) {
      case 'accessibility':
        return [
          "Describe what you see in the video",
          "What accessibility issues do you notice?",
          "Can you help me navigate this space safely?",
          "Are there any obstacles I should be aware of?"
        ];
      case 'construction_safety':
        return [
          "Analyze the safety conditions on this construction site",
          "What safety violations do you see?",
          "Are workers wearing proper PPE?",
          "Identify any potential hazards in the area"
        ];
      case 'fall_prevention':
        return [
          "What fall risks do you identify in this environment?",
          "Are there proper safety railings and barriers?",
          "Check for slip and trip hazards",
          "Assess the stability of walking surfaces"
        ];
      default:
        return [
          "Analyze the video content",
          "What do you observe in this scene?",
          "Describe the key elements you see",
          "Provide insights about this video"
        ];
    }
  };

  const handleSpeakResponse = (text: string) => {
    speak(text);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className="voice-interface error">
        <p>Voice interface is not supported in your browser.</p>
      </div>
    );
  }

  return (
    <div className={`voice-interface ${className}`}>
      {/* Microphone Control */}
      <div className="microphone-section">
        <button
          className={`microphone-button ${
            isListening ? 'listening' : ''
          }`}
          onClick={toggleListening}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {!isListening && (
            <div className="mic-icon">
              <MicIcon className="w-8 h-8" />
            </div>
          )}
          {isListening && (
            <div className="waveform">
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
            </div>
          )}
        </button>
      </div>

      {/* Chat Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="suggestions">
              <p>Try asking...</p>
              <div className="suggestion-buttons">
                {getSuggestions().map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-button"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? '👤 You' : '🔍 Jarvis'}
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
                  <SoundIcon className="w-8 h-8" isSpeaking={isSpeaking} />
                </button>
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
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Input Form */}
      <form className="voice-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="voice-input"
          placeholder={isListening ? 'Listening...' : 'Speak or type your message...'}
          value={inputText}
          onChange={handleInputChange}
          disabled={isLoading}
          aria-label="Voice/text message input"
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

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
