/**
 * Chat Interface Component
 * 
 * This component provides a complete chat interface with messages and input.
 * It handles message history, streaming responses, and scrolling behavior.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { generateCompletion } from '@/lib/ai/service';

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
  const { toast } = useToast();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  
  const utils = trpc.useUtils();
  const addMessageMutation = trpc.ai.addMessage.useMutation({
    onSuccess: () => {
      utils.ai.getConversation.invalidate({ id: conversationId });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      
      // Start streaming the AI response
      setStreamingMessage('');
      
      const response = await generateCompletion({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        systemPrompt: 'You are a helpful AI assistant.',
      });
      
      if (!response) {
        throw new Error('Failed to generate completion');
      }
      
      const reader = response.getReader();
      const decoder = new TextDecoder();
      
      let done = false;
      let accumulatedResponse = '';
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const chunkText = decoder.decode(value);
          accumulatedResponse += chunkText;
          setStreamingMessage(accumulatedResponse);
        }
      }
      
      // Save assistant message to database
      if (accumulatedResponse) {
        await addMessageMutation.mutateAsync({
          conversationId,
          role: 'assistant',
          content: accumulatedResponse,
        });
        
        // Add assistant message to UI
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: accumulatedResponse,
          createdAt: new Date().toISOString(),
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process message',
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
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
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
            <div>
              <p>No messages yet.</p>
              <p>Start a conversation by typing a message below.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}
            
            {streamingMessage && (
              <ChatMessage
                role="assistant"
                content={streamingMessage}
                isLoading={false}
              />
            )}
            
            {isProcessing && !streamingMessage && (
              <ChatMessage
                role="assistant"
                content=""
                isLoading={true}
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        isDisabled={isProcessing}
        placeholder="Type a message..."
      />
    </div>
  );
} 