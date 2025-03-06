/**
 * ContextAwareAI.tsx
 * 
 * A comprehensive AI component that leverages user preferences and provides
 * context-aware AI capabilities with proper type safety.
 */

import { useState, useCallback } from 'react';
import { useAiPreferences } from '@/hooks/useAiPreferences';
import { 
  getDefaultModel, 
  getMaxTokens, 
  getContextSettings,
  validateAndNormalizeAiSettings
} from '@/lib/utils/ai-utils';
import { applyContextAwarePrompting } from '@/lib/ai/context-aware';
import { generateCompletion } from '@/lib/ai/service';
import { streamToString } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date | string;
}

export interface ContextAwareAIProps {
  initialSystemPrompt?: string;
  placeholder?: string;
  userData?: {
    role?: string;
    preferences?: Record<string, unknown>;
    customData?: Record<string, unknown>;
  };
  organizationData?: {
    name: string;
    domain?: string;
    industry?: string;
    customData?: Record<string, unknown>;
  };
  onMessageSent?: (message: Message) => void;
  onResponseReceived?: (message: Message) => void;
}

export function ContextAwareAI({
  initialSystemPrompt = 'You are a helpful AI assistant.',
  placeholder = 'Ask me anything...',
  userData,
  organizationData,
  onMessageSent,
  onResponseReceived
}: ContextAwareAIProps) {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  // Get AI preferences with proper type safety
  const { preferences: aiPreferences } = useAiPreferences();
  
  // Safely get context settings
  const contextSettings = getContextSettings(aiPreferences);
  
  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim() || isProcessing) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      setResponse('');
      
      // Create user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
        createdAt: new Date(),
      };
      
      // Notify about sent message
      if (onMessageSent) {
        onMessageSent(userMessage);
      }
      
      // Apply context-aware prompting
      const contextAwareMessages = applyContextAwarePrompting({
        userPrompt: prompt,
        systemPrompt: initialSystemPrompt,
        aiSettings: validateAndNormalizeAiSettings(aiPreferences),
        contextData: {
          contextSettings,
          userData,
          organizationData
        }
      });
      
      // Generate completion with proper error handling
      const completionStream = await generateCompletion(
        contextAwareMessages,
        {
          modelId: getDefaultModel(aiPreferences),
          maxTokens: getMaxTokens(aiPreferences)
        }
      );
      
      if (!completionStream) {
        throw new Error('Failed to generate AI response');
      }
      
      // Process the streaming response
      await streamToString(completionStream, (chunk) => {
        setResponse(prev => prev + chunk);
      });
      
      // Create assistant message
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        createdAt: new Date(),
      };
      
      // Notify about received response
      if (onResponseReceived) {
        onResponseReceived(assistantMessage);
      }
      
      // Clear the prompt
      setPrompt('');
    } catch (err) {
      console.error('Error generating AI response:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate AI response',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    prompt, 
    isProcessing, 
    initialSystemPrompt, 
    aiPreferences, 
    contextSettings, 
    userData, 
    organizationData, 
    onMessageSent, 
    onResponseReceived, 
    toast,
    response
  ]);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Assistant</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        
        {response && (
          <div className="rounded-lg bg-muted p-4">
            <p className="whitespace-pre-wrap">{response}</p>
          </div>
        )}
        
        {isProcessing && !response && (
          <Skeleton className="h-24 w-full" />
        )}
        
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            className="min-h-24 resize-none"
            disabled={isProcessing}
          />
        </form>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          type="submit" 
          onClick={handleSubmit} 
          disabled={!prompt.trim() || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Send'}
          {!isProcessing && <Send className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
} 