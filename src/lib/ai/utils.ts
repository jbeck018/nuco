/**
 * AI Service Utilities
 * 
 * This file provides utility functions for the AI service.
 */

/**
 * Format messages for the API
 * @param messages The messages to format
 * @param systemPrompt An optional system prompt to prepend
 * @returns Formatted messages for the API
 */
export function formatMessages(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  systemPrompt?: string
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const formattedMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  
  // Add system prompt if provided
  if (systemPrompt) {
    formattedMessages.push({
      role: 'system',
      content: systemPrompt,
    });
  }
  
  // Add the rest of the messages
  formattedMessages.push(...messages);
  
  return formattedMessages;
} 

export function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

/**
 * Clean the LLM response by removing metadata and formatting markers
 * @param response The raw response from the LLM
 * @returns Cleaned markdown text
 */
export function cleanLLMResponse(response: string): string {
  // If the response is empty, return empty string
  if (!response) return '';
  
  try {
    // Check if the response is in the Vercel AI SDK data stream format
    // This format uses JSON objects with specific fields
    if (response.includes('"text":"') || response.includes('"content":')) {
      let cleanedText = '';
      
      // Split by lines to handle multiple data chunks
      const lines = response.split('\n');
      
      for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;
        
        // Try to parse each line as JSON
        try {
          // Some lines might start with "data: " (Server-Sent Events format)
          const jsonStr = line.startsWith('data: ') ? line.slice(5) : line;
          const data = JSON.parse(jsonStr);
          
          // Extract text content based on the format
          if (data.text !== undefined) {
            // OpenAI format
            cleanedText += data.text;
          } else if (data.delta?.content !== undefined) {
            // Some providers use delta.content
            cleanedText += data.delta.content;
          } else if (data.content !== undefined) {
            // Some providers use content directly
            cleanedText += data.content;
          } else if (data.choices && data.choices[0]?.delta?.content) {
            // Raw OpenAI format
            cleanedText += data.choices[0].delta.content;
          }
        } catch (e) {
          // If it's not valid JSON, check for other formats
          // This is a fallback for non-standard formats
        }
      }
      
      if (cleanedText) {
        return cleanedText;
      }
    }
    
    // Handle the OpenAI-specific format with prefixes like f:, 0:, e:
    if (response.includes('0:"')) {
      let fullText = '';
      
      // Process the response line by line
      const lines = response.split('\n');
      
      for (const line of lines) {
        // Skip metadata lines
        if (line.startsWith('f:') || line.startsWith('e:') || line.startsWith('d:')) {
          continue;
        }
        
        // Extract content from lines with 0:" prefix
        if (line.includes('0:"')) {
          // Use regex to extract all content from 0:" patterns in this line
          const matches = line.match(/0:"([^"]*)"/g);
          
          if (matches) {
            for (const match of matches) {
              // Extract the content between quotes (remove the 0:" prefix and trailing ")
              const content = match.substring(3, match.length - 1);
              fullText += content;
            }
          }
        }
      }
      
      return fullText;
    }
    
    // If no special format is detected, return the original response
    return response;
  } catch (error) {
    console.error('Error cleaning LLM response:', error);
    // Return the original response if parsing fails
    return response;
  }
}

/**
 * Extract token usage information from LLM response metadata
 * @param response The raw response from the LLM
 * @returns Token usage object or null if not found
 */
export function extractTokenUsage(response: string): { promptTokens: number; completionTokens: number } | null {
  try {
    // First try to extract usage from OpenAI format with e: prefix
    const openaiUsageMatch = response.match(/e:\{"finishReason":"[^"]+","usage":\{"promptTokens":(\d+),"completionTokens":(\d+)\}/);
    
    if (openaiUsageMatch && openaiUsageMatch.length >= 3) {
      return {
        promptTokens: parseInt(openaiUsageMatch[1], 10),
        completionTokens: parseInt(openaiUsageMatch[2], 10)
      };
    }
    
    // Try to extract from standard JSON format (Vercel AI SDK data stream)
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        // Handle SSE format
        const jsonStr = line.startsWith('data: ') ? line.slice(5) : line;
        const data = JSON.parse(jsonStr);
        
        // Check for usage data in various formats
        if (data.usage && data.usage.prompt_tokens && data.usage.completion_tokens) {
          return {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens
          };
        } else if (data.usage && data.usage.promptTokens && data.usage.completionTokens) {
          return {
            promptTokens: data.usage.promptTokens,
            completionTokens: data.usage.completionTokens
          };
        } else if (data.usage && data.usage.input_tokens && data.usage.output_tokens) {
          // Anthropic format
          return {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens
          };
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
    
    // If we couldn't find usage data, return null
    return null;
  } catch (error) {
    console.error('Error extracting token usage:', error);
    return null;
  }
}