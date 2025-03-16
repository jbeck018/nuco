/**
 * Chat Interface Component
 * 
 * This component provides a complete chat interface with messages and input.
 * It handles message history, streaming responses, and scrolling behavior.
 * Now enhanced with context-aware prompting based on user preferences.
 */

"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uuidv4 } from '@/lib/utils/edge-crypto';
import { useToast } from '@/components/ui/use-toast';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useTRPC } from '@/lib/trpc/trpc';
import { useAiPreferences } from '@/hooks/useAiPreferences';
import { applyContextAwarePrompting } from '@/lib/ai/context-aware';
import { 
  getSelectedModel,
  getMaxTokens, 
  getContextSettings,  
} from '@/lib/utils/ai-utils';
import { ModelSelector } from '@/components/ai/ModelSelector';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useOrganization } from '@/lib/organizations/context';
import { extractTokenUsage } from '@/lib/ai/utils';
import { useCompletion } from '@ai-sdk/react';

import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ChatInterfaceProps {
  conversationId: string;
  initialMessages?: Message[];
  onNewConversation?: () => void;
}

export function ChatInterface({
  conversationId,
  initialMessages = [],
  onNewConversation,
}: ChatInterfaceProps) {
  const trpc = useTRPC();
  const { toast } = useToast();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  
  // Get AI preferences from the hook
  const { preferences: aiPreferences } = useAiPreferences();
  
  // Get organization settings for token management
  const { currentOrganization } = useOrganization();
  const { settings: orgSettings } = useOrganizationSettings(currentOrganization?.id || '');

  // Use the AI SDK's useCompletion hook for handling completions
  const { 
    completion: streamingMessage,
    complete,
    error,
  } = useCompletion({
    api: '/api/ai/completion',
    id: conversationId,
    body: {
      model: getSelectedModel(aiPreferences),
      temperature: 0.3,
      maxTokens: getMaxTokens(aiPreferences),
      organizationId: currentOrganization?.id,
      useCustomTokens: orgSettings?.aiSettings?.useCustomTokens || false,
      customTokens: orgSettings?.aiSettings?.customTokens,
      systemPrompt: 'You are a helpful AI assistant.'
    },
    onResponse: (response) => {
      // This is called when the API response starts streaming
      setIsProcessing(true);
      setStreamError(null);
    },
    onFinish: async (_prompt,completion) => {
      // This is called when the API response is complete
      setIsProcessing(false);
      
      // Extract token usage from the response metadata
      const tokenUsage = extractTokenUsage(completion);
      
      // Update token usage if available and not using custom tokens
      if (tokenUsage && currentOrganization?.id && !orgSettings?.aiSettings?.useCustomTokens) {
        updateTokenUsageMutation.mutate({
          organizationId: currentOrganization.id,
          promptTokens: tokenUsage.promptTokens,
          completionTokens: tokenUsage.completionTokens
        });
      }
      
      // After streaming is complete, add the message to the UI and save to DB
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: completion,
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to database
      await addMessageMutation.mutateAsync({
        conversationId,
        role: 'assistant',
        content: assistantMessage.content,
      });
    },
    onError: (error) => {
      console.error('Error in completion:', error);
      setStreamError('Failed to process AI response. Please try again.');
      setIsProcessing(false);
    }
  });

  // Effect to handle errors from the useCompletion hook
  useEffect(() => {
    if (error) {
      setStreamError(error.message || 'Failed to process AI response. Please try again.');
    }
  }, [error]);

  const queryClient = useQueryClient();
  const addMessageMutation = useMutation(trpc.ai.addMessage.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.ai.getConversation.queryFilter({ id: conversationId }));
    },
    onError: (error) => {
      // Format error message for better display
      let errorMessage = 'Failed to send message';
      
      // Check if it's a validation error (Zod)
      if (error.data?.zodError) {
        const fieldErrors = error.data.zodError.fieldErrors;
        if (fieldErrors && Object.keys(fieldErrors).length > 0) {
          // Format field errors into readable messages
          errorMessage = Object.entries(fieldErrors)
            .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
            .join('\n');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
      });
    },
  }));

  // Mutation for updating token usage
  const updateTokenUsageMutation = useMutation(trpc.ai.updateTokenUsage.mutationOptions({
    onError: (error) => {
      console.error('Failed to update token usage:', error);
    }
  }));

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage]);

  const handleSendMessage = async (content: string) => {
    if (isProcessing) return;
    
    // Validate content before proceeding
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length === 0) {
      toast({
        title: 'Error',
        description: 'Message cannot be empty',
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      setStreamError(null);
      
      // Add user message to UI
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: trimmedContent,
        createdAt: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, userMessage]);
      
      // Save user message to database
      await addMessageMutation.mutateAsync({
        conversationId,
        role: 'user',
        content: trimmedContent,
      });
      
      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      // Get context settings from AI preferences
      const contextSettings = getContextSettings(aiPreferences);
      
      // Apply context-aware prompting with enhanced context
      const enhancedPrompt = applyContextAwarePrompting({
        userPrompt: trimmedContent,
        systemPrompt: 'You are a helpful AI assistant.',
        aiSettings: aiPreferences,
        contextData: {
          userConversationHistory: conversationHistory.map(msg => ({
            ...msg,
            id: uuidv4(),
            createdAt: new Date()
          })),
          contextSettings: contextSettings,
          userData: {
            role: 'user',
            preferences: {
              responseStyle: 'concise',
            }
          }
        }
      });
      
      // Use the last message from the enhanced prompt (which contains the context-aware user message)
      const contextAwareMessage = enhancedPrompt[enhancedPrompt.length - 1].content;
      
      // Use the AI SDK's complete function to send the message
      await complete(contextAwareMessage, {
        body: {
          messages: enhancedPrompt.map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          })),
          model: getSelectedModel(aiPreferences),
          temperature: 0.7,
          maxTokens: getMaxTokens(aiPreferences),
          organizationId: currentOrganization?.id,
          useCustomTokens: orgSettings?.aiSettings?.useCustomTokens || false,
          customTokens: orgSettings?.aiSettings?.customTokens,
          systemPrompt: 'You are a helpful AI assistant.'
        }
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
      });
      setIsProcessing(false);
    }
  };

  const handleNewConversation = () => {
    if (onNewConversation) {
      onNewConversation();
    } else {
      router.push('/chat/new');
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4">
        <h2 className="text-xl font-semibold">Chat</h2>
        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <div className="hidden sm:block">
            <ModelSelector conversationId={conversationId} />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            New Chat
          </Button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto" id="chat-messages-container">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
            <div>
              <p>No messages yet.</p>
              <p>Start a conversation by typing a message below.</p>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={new Date(message.createdAt).toLocaleTimeString()}
              />
            ))}
            
            {streamingMessage && isProcessing && (
              <ChatMessage
                role="assistant"
                content={streamingMessage}
                messageStatus="streaming"
              />
            )}
            
            {streamError && (
              <div className="mx-auto my-2 max-w-3xl rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {streamError}
              </div>
            )}
            
            {isProcessing && !streamingMessage && !streamError && (
              <ChatMessage
                role="assistant"
                content=""
                messageStatus="thinking"
              />
            )}
            
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="sticky bottom-0 z-10 border-t bg-background p-4">
        <ChatInput
          onSend={handleSendMessage}
          isDisabled={isProcessing}
          placeholder="Type a message..."
        />
      </div>
    </div>
  );
} 