/**
 * Client-side AI Service
 * 
 * This file provides a client-side interface for interacting with AI providers
 * through our server API endpoints. This ensures API keys are not exposed in the browser.
 */

/**
 * Client-side completion options
 */
export interface ClientCompletionOptions {
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  organizationId?: string;
  useCustomTokens?: boolean;
  customTokens?: {
    openai?: string;
    anthropic?: string;
    google?: string;
    custom?: string;
  };
}

/**
 * Client-side agent completion options
 */
export interface ClientAgentCompletionOptions extends ClientCompletionOptions {
  agentId: string;
}

/**
 * Generate a streaming completion from the AI service via server API
 * @param messages The messages to send to the API
 * @param options The options for the completion
 * @returns A streaming response from the API
 */
export async function generateClientCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: ClientCompletionOptions = {}
) {
  try {
    // Create the request payload
    const payload = {
      messages,
      ...options
    };

    // Create a fetch request to our API endpoint
    const response = await fetch('/api/ai/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }
    
    // Create a ReadableStream transformer to handle the SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    // Create a custom stream that will be used to accumulate text
    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(chunk);
          }
        } catch (error) {
          console.error('Error reading stream:', error);
          controller.error(error);
        }
      },
    });
    
    // Return an object with the text stream and methods to read it
    return {
      textStream: {
        [Symbol.asyncIterator]: async function* () {
          const streamReader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await streamReader.read();
              if (done) break;
              yield value;
            }
          } finally {
            streamReader.releaseLock();
          }
        }
      }
    };
  } catch (error) {
    console.error('Client AI service error:', error);
    throw error;
  }
}

// Export the same function with a different name for backward compatibility
export const generateClientAgentCompletion = generateClientCompletion; 