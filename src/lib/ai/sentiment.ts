/**
 * Sentiment Analysis Utility
 * 
 * This file provides utilities for analyzing text sentiment and determining
 * appropriate emoji reactions based on the content.
 */

import { OpenAI } from 'openai';

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Analyze text sentiment using OpenAI
 * This is more accurate but requires an API call
 * 
 * @param text The text to analyze
 * @returns A Promise resolving to a SentimentResult object
 */
export async function analyzeTextSentimentAI(text: string): Promise<SentimentResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Analyze the sentiment of the following text and respond with a JSON object containing:
          1. sentiment: "positive", "negative", "neutral", or "question"
          2. score: a number between 0 and 1 indicating the strength of the sentiment
          3. suggestedEmojis: an array of up to 3 Slack emoji names (without colons) that would be appropriate reactions
          4. confidence: a number between 0 and 1 indicating your confidence in this analysis`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      sentiment: result.sentiment || 'neutral',
      score: result.score || 0.5,
      suggestedEmojis: result.suggestedEmojis || ['thumbsup'],
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error('Error analyzing sentiment with AI:', error);
    
    // Fall back to simple analysis
    return analyzeTextSentimentSimple(text);
  }
}

/**
 * Get appropriate emoji reactions for a message
 * Uses a combination of rule-based and AI approaches based on message complexity
 * 
 * @param text The message text to analyze
 * @param useAI Whether to use AI for analysis (defaults to false for performance)
 * @returns A Promise resolving to an array of emoji names
 */
export async function getMessageReactions(text: string, useAI = false): Promise<string[]> {
  // For very short messages, use simple analysis
  if (text.length < 20 || !useAI) {
    const result = analyzeTextSentimentSimple(text);
    return result.suggestedEmojis;
  }
  
  // For longer or more complex messages, use AI
  const result = await analyzeTextSentimentAI(text);
  return result.suggestedEmojis;
} 