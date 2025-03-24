import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AIServiceError } from '@/lib/ai/error';
import { errorHandler } from '@/lib/ai/utils';
import { AgentFactory } from '@/lib/ai/agents/factory';
import { Message } from '@/lib/ai/service';
import { AgentContext } from '@/lib/ai/agents/base';
import { AIService } from '@/lib/ai/service';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { updateTokenUsage } from '@/lib/ai/service';

// Set runtime to edge for optimal performance
export const runtime = 'edge';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { 
      messages, 
      model = 'gpt-4', 
      temperature = 0.7, 
      organizationId, 
      useCustomTokens,
      customTokens,
      systemPrompt,
      maxTokens
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required and must be an array' },
        { status: 400 }
      );
    }
    
    try {
      // Create agent factory
      const agentFactory = AgentFactory.getInstance({
        defaultModelId: model,
        defaultSystemPrompt: systemPrompt || 'You are a helpful AI assistant.',
        metadata: {
          organizationId,
        },
      });

      // Create a default agent
      const agent = await agentFactory.createAgent('default', {
        modelConfig: {
          id: model,
          name: model,
          provider: model.startsWith('gpt') ? 'openai' : 'anthropic',
          contextWindow: 128000,
          maxOutputTokens: maxTokens || 4096,
          temperature: temperature || 0.7,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
          costPer1kInput: 0.01,
          costPer1kOutput: 0.03,
        },
      });

      // Convert messages to the correct type
      const formattedMessages: Message[] = messages.map(msg => ({
        id: crypto.randomUUID(),
        role: msg.role,
        content: msg.content,
        createdAt: new Date(),
      }));

      // Create agent context
      const context: AgentContext = {
        messages: formattedMessages,
        state: {
          id: crypto.randomUUID(),
          status: 'running',
          lastUpdated: new Date(),
          metadata: {},
        },
        config: {
          id: crypto.randomUUID(),
          name: 'default',
          description: 'Default agent for handling chat messages',
          model: model,
          aiService: new AIService(),
        },
        metadata: {
          organizationId,
          useCustomTokens,
          customTokens,
          systemPrompt,
          tokenUsage: {
            promptTokens: 0,
            completionTokens: 0,
          },
        },
        executionId: crypto.randomUUID(),
      };

      // Execute the agent
      const result = await agent.execute(context);

      // Track token usage if organization ID is provided and not using custom tokens
      if (organizationId && !useCustomTokens && result.metadata?.tokenUsage) {
        const tokenUsage = result.metadata.tokenUsage as { promptTokens?: number; completionTokens?: number };
        const totalTokens = (tokenUsage.promptTokens || 0) + (tokenUsage.completionTokens || 0);
        
        // Update token usage in the background
        updateTokenUsage(organizationId, totalTokens)
          .catch(error => console.error('Error updating token usage:', error));
      }

      // Create the appropriate provider client based on the model ID
      const provider = model.startsWith('gpt') ? 'openai' : 'anthropic';
      const client = provider === 'openai' 
        ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
        : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      // Return streaming response with proper configuration
      const stream = streamText({
        model: client(model),
        messages: formattedMessages.map(msg => ({
          role: msg.role,
          content: typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
        })),
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 1000,
        topP: 1,
      });
      
      // Use the toDataStreamResponse method provided by the Vercel AI SDK
      return stream.toDataStreamResponse({
        getErrorMessage: errorHandler
      });
    } catch (aiError) {
      if (aiError instanceof AIServiceError) {
        // Handle specific AI service errors
        const status = aiError.status || 500;
        const errorType = aiError.type || 'unknown';
        
        return NextResponse.json(
          { 
            error: aiError.message,
            type: errorType,
            provider: aiError.provider
          },
          { status }
        );
      }
      
      // Re-throw other errors to be caught by the outer catch block
      throw aiError;
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 