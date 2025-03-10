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
import { generateCompletion } from '@/lib/ai/service';
import { useAiPreferences } from '@/hooks/useAiPreferences';
import { applyContextAwarePrompting } from '@/lib/ai/context-aware';
import { 
  getDefaultModel, 
  getMaxTokens, 
  getContextSettings,  
} from '@/lib/utils/ai-utils';

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
  const [streamingMessage, setStreamingMessage] = useState<string>('');

  // Get AI preferences from the hook
  const { preferences: aiPreferences } = useAiPreferences();

  const queryClient = useQueryClient();
  const addMessageMutation = useMutation(trpc.ai.addMessage.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.ai.getConversation.queryFilter({ id: conversationId }));
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  }));

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage]);

  const handleSendMessage = async (content: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Add user message to UI
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, userMessage]);
      
      // Save user message to database
      await addMessageMutation.mutateAsync({
        conversationId,
        role: 'user',
        content,
      });
      
      // Initialize streaming for AI response
      setStreamingMessage('');
      
      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        id: msg.id,
        createdAt: new Date(msg.createdAt)
      }));
      
      // Get context settings from AI preferences
      const contextSettings = getContextSettings(aiPreferences);
      
      // Apply context-aware prompting with enhanced context
      const contextAwareMessages = applyContextAwarePrompting({
        userPrompt: content,
        systemPrompt: 'You are a helpful AI assistant.',
        aiSettings: aiPreferences,
        contextData: {
          userConversationHistory: conversationHistory,
          contextSettings: contextSettings,
          // Add user data if available
          userData: {
            role: 'user', // This would come from user profile in a real app
            preferences: {
              responseStyle: 'concise', // Example preference
            }
          }
          // Organization data would be added here in a full implementation
        }
      });
      
      // Start generating the AI response with context-aware prompting
      const response = await generateCompletion(
        contextAwareMessages,
        {
          modelId: getDefaultModel(aiPreferences),
          maxTokens: getMaxTokens(aiPreferences)
        }
      );
      
      if (!response) {
        throw new Error('Failed to generate completion');
      }
      
      // Process the streaming response
      try {
        // Use the textStream from the response to handle streaming
        const { textStream } = response;
        
        // Process each chunk of the stream
        for await (const textPart of textStream) {
          setStreamingMessage(prev => prev + textPart);
        }
        
        // After streaming is complete, add the message to the UI and save to DB
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: streamingMessage,
          createdAt: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setStreamingMessage('');
        
        // Save assistant message to database
        await addMessageMutation.mutateAsync({
          conversationId,
          role: 'assistant',
          content: assistantMessage.content,
        });
      } catch (streamError) {
        console.error('Error processing stream:', streamError);
        throw new Error('Failed to process AI response stream');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
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
            
            {streamingMessage && (
              <ChatMessage
                role="assistant"
                content={streamingMessage}
                messageStatus="streaming"
              />
            )}
            
            {isProcessing && !streamingMessage && (
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