import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api';
import {
  ChatMessage,
  LLMChatRequest,
  LLMChatResponse,
  ToolCall,
} from '@/types';
import { downloadJSON } from './useObjectQuery';

interface UseLLMChatOptions {
  video_id?: string | null;
  context?: string[];
  userId?: string;
}

interface UseLLMChatResult {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  lastResponse: LLMChatResponse | null;
  
  // Actions
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => void;
  exportConversation: () => void;
  
  // Tool-related
  toolCalls: ToolCall[];
}

/**
 * Hook for LLM chat interface with tool calling support
 * Returns JSON responses for all interactions
 */
export function useLLMChat(options: UseLLMChatOptions = {}): UseLLMChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<LLMChatResponse | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const conversationIdRef = useRef<string>(generateConversationId());

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) {
      console.warn('Empty message, skipping');
      return;
    }

    console.log('Sending message to LLM:', message);
    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const request: LLMChatRequest = {
        message,
        context: messages.map((m) => m.content),
        userId: options.userId,
        video_id: options.video_id || undefined,
      };

      console.log('API Request:', request);
      const response = await apiClient.sendChatMessage(request);
      console.log('API Response:', response);

      if (response.success && response.data) {
        const responseData = response.data;
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: responseData.response,
          timestamp: responseData.timestamp,
          toolCalls: responseData.toolCalls,
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        setLastResponse(responseData);
        
        if (responseData.toolCalls && responseData.toolCalls.length > 0) {
          setToolCalls((prev) => [...prev, ...responseData.toolCalls!]);
        }

        // Create JSON log of the interaction
        const interactionLog = {
          conversationId: conversationIdRef.current,
          timestamp: new Date().toISOString(),
          userMessage: message,
          assistantResponse: responseData.response,
          toolCalls: responseData.toolCalls || [],
          objects: responseData.objects || [],
        };
        
        console.log('LLM Interaction (JSON):', JSON.stringify(interactionLog, null, 2));
      } else {
        const errorMsg = response.error || 'Failed to get LLM response';
        console.error('LLM Error:', errorMsg);
        setError(errorMsg);
        
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `I apologize, but I encountered an error: ${errorMsg}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred';
      console.error('Unexpected error in sendMessage:', err);
      setError(errorMsg);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please make sure the backend server is running.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, options.userId, options.video_id]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setToolCalls([]);
    setLastResponse(null);
    setError(null);
    conversationIdRef.current = generateConversationId();
  }, []);

  const exportConversation = useCallback(() => {
    const conversationData = {
      conversationId: conversationIdRef.current,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages,
      toolCalls,
    };
    
    downloadJSON(
      conversationData,
      `conversation-${conversationIdRef.current}-${Date.now()}.json`
    );
  }, [messages, toolCalls]);

  return {
    messages,
    isLoading,
    error,
    lastResponse,
    sendMessage,
    clearHistory,
    exportConversation,
    toolCalls,
  };
}

function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
