import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/services/api';
import { VoiceRecognitionResult } from '@/types';
import { downloadJSON } from './useObjectQuery';

interface UseVoiceInterfaceResult {
  // Speech Recognition
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  
  // Speech Synthesis
  isSpeaking: boolean;
  
  // Actions
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  clearTranscript: () => void;
  
  // State
  error: string | null;
  isSupported: boolean;
  
  // History
  voiceHistory: VoiceInteraction[];
  exportVoiceHistory: () => void;
}

interface VoiceInteraction {
  type: 'recognition' | 'synthesis';
  text: string;
  timestamp: string;
  confidence?: number;
}

/**
 * Hook for voice interface (STT and TTS)
 * Returns JSON logs of all voice interactions
 */
export function useVoiceInterface(): UseVoiceInterfaceResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceHistory, setVoiceHistory] = useState<VoiceInteraction[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if browser supports Web Speech API
  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  // Load voices when component mounts
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };

      // Load voices immediately if available
      loadVoices();
      
      // Listen for voice loading event
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        
        if (result.isFinal) {
          finalText += text;
          setConfidence(result[0].confidence);
          
          // Log recognition result
          const recognitionLog: VoiceInteraction = {
            type: 'recognition',
            text: text,
            timestamp: new Date().toISOString(),
            confidence: result[0].confidence,
          };
          
          setVoiceHistory((prev) => [...prev, recognitionLog]);
          console.log('Voice Recognition (JSON):', JSON.stringify(recognitionLog, null, 2));
        } else {
          interimText += text;
        }
      }

      if (finalText) {
        setTranscript(finalText.trim()); // Set to the final result only, don't accumulate
      }
      setInterimTranscript(interimText);
    };

    recognitionRef.current.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported');
      return;
    }

    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Helper function to get the best available voice
  const getBestVoice = useCallback(() => {
    if (!('speechSynthesis' in window)) return null;
    
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find Google UK English Male first
    const googleUKMale = voices.find(voice => 
      voice.name.includes('Google UK English Male') ||
      (voice.name.includes('Google') && voice.lang === 'en-GB' && voice.name.includes('Male'))
    );
    
    if (googleUKMale) {
      return googleUKMale;
    }
    
    // Fallback to any Google UK voice
    const googleUK = voices.find(voice => 
      voice.name.includes('Google') && voice.lang === 'en-GB'
    );
    
    if (googleUK) {
      return googleUK;
    }
    
    // Final fallback to any English voice
    return voices.find(voice => voice.lang.includes('en')) || voices[0] || null;
  }, []);

  // Enhanced speak function that always uses the best voice
  const speakWithBestVoice = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis not supported');
      return;
    }

    setIsSpeaking(true);
    
    synthesisRef.current = new SpeechSynthesisUtterance(text);
    synthesisRef.current.lang = 'en-US';
    synthesisRef.current.rate = 1.1; // Slightly slower for clarity
    synthesisRef.current.pitch = 1.0; // Slightly higher pitch for friendliness
    synthesisRef.current.volume = 1.0; // Slightly lower volume
    
    const bestVoice = getBestVoice();
    if (bestVoice) {
      synthesisRef.current.voice = bestVoice;
    }
    
    synthesisRef.current.onend = () => {
      setIsSpeaking(false);
    };
    
    synthesisRef.current.onerror = (event) => {
      setError(`Speech synthesis error: ${event.error}`);
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(synthesisRef.current);
    
    // Log synthesis
    const synthesisLog: VoiceInteraction = {
      type: 'synthesis',
      text: text,
      timestamp: new Date().toISOString(),
    };
    
    setVoiceHistory((prev) => [...prev, synthesisLog]);
    console.log('Voice Synthesis (JSON):', JSON.stringify(synthesisLog, null, 2));
  }, [getBestVoice]);

  const speak = useCallback(async (text: string) => {
    setError(null);
    
    try {
      // Try to use backend TTS first (higher quality)
      const response = await apiClient.synthesizeSpeech(text);
      
      if (response.success && response.data) {
        setIsSpeaking(true);
        
        const audioUrl = URL.createObjectURL(response.data);
        audioRef.current = new Audio(audioUrl);
        
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audioRef.current.onerror = () => {
          setError('Audio playback error');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          // Fallback to enhanced browser TTS
          speakWithBestVoice(text);
        };
        
        await audioRef.current.play();
        
        // Log synthesis
        const synthesisLog: VoiceInteraction = {
          type: 'synthesis',
          text: text,
          timestamp: new Date().toISOString(),
        };
        
        setVoiceHistory((prev) => [...prev, synthesisLog]);
        console.log('Voice Synthesis (JSON):', JSON.stringify(synthesisLog, null, 2));
      } else {
        // Fallback to enhanced browser TTS
        speakWithBestVoice(text);
      }
    } catch (err: any) {
      setError(err.message);
      // Fallback to enhanced browser TTS
      speakWithBestVoice(text);
    }
  }, [speakWithBestVoice]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  }, []);

  const exportVoiceHistory = useCallback(() => {
    const historyData = {
      exportedAt: new Date().toISOString(),
      interactionCount: voiceHistory.length,
      interactions: voiceHistory,
    };
    
    downloadJSON(
      historyData,
      `voice-history-${Date.now()}.json`
    );
  }, [voiceHistory]);

  return {
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
    voiceHistory,
    exportVoiceHistory,
  };
}
