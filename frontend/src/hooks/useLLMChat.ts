import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/services/api';
import {
  ChatMessage,
  LLMChatRequest,
  LLMChatResponse,
  ToolCall,
} from '@/types';
import { downloadJSON } from './useObjectQuery';

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
export function useLLMChat(): UseLLMChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<LLMChatResponse | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const conversationIdRef = useRef<string>(generateConversationId());

  const sendMessage = useCallback(async (message: string) => {
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
      };

      const response = await apiClient.sendChatMessage(request);

      if (response.success && response.data) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.data.response,
          timestamp: response.data.timestamp,
          toolCalls: response.data.toolCalls,
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        setLastResponse(response.data);
        
        if (response.data.toolCalls) {
          setToolCalls((prev) => [...prev, ...response.data.toolCalls!]);
        }

        // Create JSON log of the interaction
        const interactionLog = {
          conversationId: conversationIdRef.current,
          timestamp: new Date().toISOString(),
          userMessage: message,
          assistantResponse: response.data.response,
          toolCalls: response.data.toolCalls || [],
          objects: response.data.objects || [],
        };
        
        console.log('LLM Interaction (JSON):', JSON.stringify(interactionLog, null, 2));
      } else {
        setError(response.error || 'Failed to get LLM response');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

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
