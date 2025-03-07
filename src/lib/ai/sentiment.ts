/**
 * Sentiment Analysis Utility
 * 
 * This file provides utilities for analyzing text sentiment and determining
 * appropriate emoji reactions based on the content.
 */

import { AIServiceError, generateCompletion } from './service';
import { PromptTemplate } from './templates';
import { streamToString } from '@/lib/utils';

// Define sentiment categories and their associated emojis
export const sentimentEmojis = {
  positive: ['thumbsup', 'smile', 'heart', 'clap', 'tada', 'rocket', 'fire'],
  negative: ['thumbsdown', 'disappointed', 'confused', 'thinking_face', 'cry'],
  question: ['question', 'thinking_face', 'mag'],
  technical: ['computer', 'gear', 'bulb', 'wrench', 'robot_face'],
  excited: ['star_struck', 'boom', 'fire', 'raised_hands', 'sparkles'],
  agreement: ['white_check_mark', 'ok_hand', 'ballot_box_with_check', 'heavy_check_mark'],
  gratitude: ['pray', 'raised_hands', 'blush', 'slightly_smiling_face'],
};

// Define trigger words and their associated emojis
export const triggerEmojis: Record<string, string[]> = {
  'thank': ['pray', 'blush'],
  'thanks': ['pray', 'blush'],
  'awesome': ['star_struck', 'fire'],
  'great': ['thumbsup', 'clap'],
  'help': ['raising_hand', 'bulb'],
  'question': ['question', 'thinking_face'],
  'bug': ['bug', 'beetle'],
  'error': ['warning', 'x'],
  'fix': ['wrench', 'hammer'],
  'code': ['computer', 'technologist'],
  'feature': ['sparkles', 'star'],
  'idea': ['bulb', 'thought_balloon'],
  'problem': ['thinking_face', 'mag'],
  'solution': ['white_check_mark', 'bulb'],
  'congrats': ['tada', 'confetti_ball'],
  'congratulations': ['tada', 'confetti_ball'],
  'sorry': ['disappointed', 'pensive'],
  'wow': ['open_mouth', 'astonished'],
  'amazing': ['star_struck', 'sparkles'],
  'love': ['heart', 'heart_eyes'],
  'hate': ['angry', 'rage'],
  'yes': ['white_check_mark', 'thumbsup'],
  'no': ['no_entry_sign', 'thumbsdown'],
  'maybe': ['thinking_face', 'shrug'],
};

/**
 * Interface for sentiment analysis result
 */
export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'question';
  score: number;
  suggestedEmojis: string[];
  confidence: number;
}

// Sentiment analysis prompt template
const sentimentAnalysisTemplate: PromptTemplate = {
  id: 'sentiment-analysis',
  name: 'Sentiment Analysis',
  description: 'Analyze the sentiment of text and suggest appropriate emoji reactions',
  content: `Analyze the sentiment of the following text and respond with a JSON object containing:
  1. sentiment: "positive", "negative", "neutral", or "question"
  2. score: a number between 0 and 1 indicating the strength of the sentiment
  3. suggestedEmojis: an array of up to {{maxEmojis}} Slack emoji names (without colons) that would be appropriate reactions
  4. confidence: a number between 0 and 1 indicating your confidence in this analysis
  
  {{#if technicalContext}}Technical context: The text is from a {{platform}} conversation related to {{topic}}.{{else}}No additional context provided.{{/if}}
  
  Respond ONLY with valid JSON.`,
  variables: [
    {
      name: 'maxEmojis',
      description: 'Maximum number of emojis to suggest',
      defaultValue: '3',
      required: true,
      type: 'number'
    },
    {
      name: 'technicalContext',
      description: 'Whether technical context is provided',
      defaultValue: 'false',
      required: false,
      type: 'boolean'
    },
    {
      name: 'platform',
      description: 'Platform where the conversation is taking place',
      defaultValue: 'business',
      required: false,
      type: 'string'
    },
    {
      name: 'topic',
      description: 'Topic of conversation',
      defaultValue: 'general',
      required: false,
      type: 'string'
    }
  ],
  tags: ['sentiment', 'analysis', 'emoji'],
  isPublic: true,
  userId: 'system'
};

/**
 * Analyze text sentiment using simple rule-based approach
 * This is a fast, lightweight approach that doesn't require API calls
 * 
 * @param text The text to analyze
 * @returns A SentimentResult object with sentiment information
 */
export function analyzeTextSentimentSimple(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  
  // Check for questions
  const isQuestion = lowerText.includes('?') || 
    lowerText.startsWith('what') || 
    lowerText.startsWith('how') || 
    lowerText.startsWith('why') || 
    lowerText.startsWith('when') || 
    lowerText.startsWith('where') || 
    lowerText.startsWith('who') || 
    lowerText.startsWith('which') || 
    lowerText.startsWith('can you') || 
    lowerText.startsWith('could you');
  
  if (isQuestion) {
    return {
      sentiment: 'question',
      score: 0.8,
      suggestedEmojis: sentimentEmojis.question,
      confidence: 0.7,
    };
  }
  
  // Check for trigger words
  const matchedTriggers: string[] = [];
  
  Object.keys(triggerEmojis).forEach(trigger => {
    if (lowerText.includes(trigger)) {
      matchedTriggers.push(trigger);
    }
  });
  
  if (matchedTriggers.length > 0) {
    // Get unique emojis from all matched triggers
    const allEmojis = matchedTriggers.flatMap(trigger => triggerEmojis[trigger]);
    const uniqueEmojis = [...new Set(allEmojis)];
    
    return {
      sentiment: 'positive', // Default to positive for trigger words
      score: 0.7,
      suggestedEmojis: uniqueEmojis.slice(0, 3), // Limit to 3 emojis
      confidence: 0.6,
    };
  }
  
  // Simple positive/negative word counting
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'happy', 'thanks', 'thank', 'appreciate', 'helpful', 'useful'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'disappointed', 'sorry', 'issue', 'problem', 'error', 'bug', 'wrong'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) {
    return {
      sentiment: 'positive',
      score: 0.5 + (positiveCount * 0.1),
      suggestedEmojis: sentimentEmojis.positive.slice(0, 3),
      confidence: 0.5,
    };
  } else if (negativeCount > positiveCount) {
    return {
      sentiment: 'negative',
      score: 0.5 + (negativeCount * 0.1),
      suggestedEmojis: sentimentEmojis.negative.slice(0, 3),
      confidence: 0.5,
    };
  }
  
  // Default to neutral
  return {
    sentiment: 'neutral',
    score: 0.5,
    suggestedEmojis: ['thumbsup'],
    confidence: 0.3,
  };
}

/**
 * Analyze text sentiment using AI
 * This is more accurate but requires an API call
 * 
 * @param text The text to analyze
 * @param options Optional parameters for analysis
 * @returns A Promise resolving to a SentimentResult object
 */
export async function analyzeTextSentimentAI(
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
    // Prepare template variables
    const templateVars = {
      maxEmojis: options.maxEmojis?.toString() || '3',
      technicalContext: options.technicalContext ? 'true' : 'false',
      platform: options.platform || 'business',
      topic: options.topic || 'general'
    };
    
    // Apply template with variables
    const systemPrompt = sentimentAnalysisTemplate.content.replace(/{{(\w+)}}/g, (_, key) => {
      return templateVars[key as keyof typeof templateVars] || '';
    });
    
    // Generate completion using our AI service
    const stream = await generateCompletion(
      [{ role: 'user', content: text }],
      {
        systemPrompt,
        modelId: options.modelId || 'gpt-3.5-turbo',
        temperature: 0.3,
      }
    );
    
    // Convert stream to string
    let responseText = '';
    await streamToString(stream, (chunk) => {
      responseText += chunk;
    });
    
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
      // Fall back to simple analysis if JSON parsing fails
      return analyzeTextSentimentSimple(text);
    }
  } catch (error) {
    console.error('Error analyzing sentiment with AI:', error);
    
    // Log more details if it's our custom error type
    if (error instanceof AIServiceError) {
      console.error(`AI service error (${error.provider}): ${error.type}`, {
        status: error.status,
        retryAfter: error.retryAfter
      });
    }
    
    // Fall back to simple analysis
    return analyzeTextSentimentSimple(text);
  }
}

/**
 * Get appropriate emoji reactions for a message
 * Uses a combination of rule-based and AI approaches based on message complexity
 * 
 * @param text The message text to analyze
 * @param options Options for analysis including AI usage and contextual info
 * @returns A Promise resolving to an array of emoji names
 */
export async function getMessageReactions(
  text: string, 
  options: {
    useAI?: boolean;
    maxEmojis?: number;
    technicalContext?: boolean;
    platform?: string;
    topic?: string;
    modelId?: string;
  } = {}
): Promise<string[]> {
  // For very short messages, use simple analysis
  if (text.length < 20 || !options.useAI) {
    const result = analyzeTextSentimentSimple(text);
    return result.suggestedEmojis.slice(0, options.maxEmojis || 3);
  }
  
  // For longer or more complex messages, use AI
  try {
    const result = await analyzeTextSentimentAI(text, options);
    return result.suggestedEmojis.slice(0, options.maxEmojis || 3);
  } catch (error) {
    console.error('Error getting message reactions:', error);
    // Fall back to simple analysis in case of error
    const result = analyzeTextSentimentSimple(text);
    return result.suggestedEmojis.slice(0, options.maxEmojis || 3);
  }
} 