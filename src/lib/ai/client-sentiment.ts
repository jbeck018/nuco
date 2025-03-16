/**
 * Client-side Sentiment Analysis Utility
 * 
 * This file provides utilities for analyzing text sentiment using the server API.
 */

import { generateClientCompletion } from './client-service';
import { streamToString } from '@/lib/utils';
import { SentimentResult } from './sentiment';

/**
 * Custom streamToString function for our client service
 */
async function clientStreamToString(stream: any): Promise<string> {
  let result = '';
  for await (const chunk of stream) {
    result += chunk;
  }
  return result;
}

/**
 * Analyze text sentiment using AI via the server API
 * 
 * @param text The text to analyze
 * @param options Optional parameters for analysis
 * @returns A Promise resolving to a SentimentResult object
 */
export async function analyzeClientSentiment(
  text: string,
  options: {
    maxEmojis?: number;
    technicalContext?: boolean;
    platform?: string;
    topic?: string;
    modelId?: string;
  } = {}
): Promise<SentimentResult> {
  try {
    // Create a system prompt for sentiment analysis
    const systemPrompt = `
      You are a sentiment analysis assistant. Analyze the sentiment of the user's message and respond with a JSON object containing:
      - sentiment: The overall sentiment (positive, negative, neutral, question, technical, excited, agreement, gratitude)
      - score: A number from 0 to 1 representing the strength of the sentiment
      - suggestedEmojis: An array of up to ${options.maxEmojis || 3} emoji names that match the sentiment
      - confidence: A number from 0 to 1 representing your confidence in this analysis
      
      Technical context: ${options.technicalContext ? 'true' : 'false'}
      Platform: ${options.platform || 'business'}
      Topic: ${options.topic || 'general'}
      
      Respond ONLY with the JSON object and no other text.
    `;
    
    // Generate completion using our client service
    const response = await generateClientCompletion(
      [{ role: 'user', content: text }],
      {
        systemPrompt,
        modelId: options.modelId || 'gpt-3.5-turbo',
        temperature: 0.3,
      }
    );
    
    // Convert stream to string using our custom function
    let responseText = '';
    if (response && response.textStream) {
      responseText = await clientStreamToString(response.textStream);
    }
    
    // Parse the JSON response
    try {
      const result = JSON.parse(responseText);
      
      return {
        sentiment: result.sentiment || 'neutral',
        score: result.score || 0.5,
        suggestedEmojis: result.suggestedEmojis || ['thumbsup'],
        confidence: result.confidence || 0.5,
      };
    } catch (parseError) {
      console.error('Error parsing sentiment analysis response:', parseError);
      // Fall back to a default result
      return {
        sentiment: 'neutral',
        score: 0.5,
        suggestedEmojis: ['thumbsup'],
        confidence: 0.5,
      };
    }
  } catch (error) {
    console.error('Error analyzing sentiment with AI:', error);
    
    // Fall back to a default result
    return {
      sentiment: 'neutral',
      score: 0.5,
      suggestedEmojis: ['thumbsup'],
      confidence: 0.5,
    };
  }
} 