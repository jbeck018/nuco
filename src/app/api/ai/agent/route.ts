import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/service';
import { AIServiceError } from '@/lib/ai/error';
import { AgentFactory } from '@/lib/ai/agents/factory';
import { Message } from '@/lib/ai/service';
import { AgentContext, AgentState } from '@/lib/ai/agents/base';
import { AIService } from '@/lib/ai/service';
import { z } from 'zod';

// Set runtime to edge for optimal performance
export const runtime = 'edge';

// Define request schema
const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  organizationId: z.string().optional(),
  useCustomTokens: z.boolean().optional(),
  customTokens: z.record(z.string()).optional(),
  systemPrompt: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    // Create agent factory
    const agentFactory = AgentFactory.getInstance({
      defaultModelId: validatedData.model || 'gpt-4',
      defaultSystemPrompt: validatedData.systemPrompt || '',
      metadata: {
        userId: session.user.id,
        organizationId: validatedData.organizationId,
      },
    });

    // Get the last message to determine which agent to use
    const lastMessage = validatedData.messages[validatedData.messages.length - 1];
    
    // Create a default agent for now (we'll implement agent selection logic later)
    const agent = await agentFactory.createAgent('default', {
      modelConfig: {
        id: validatedData.model || 'gpt-4',
        name: validatedData.model || 'GPT-4',
        provider: 'openai',
        contextWindow: 128000,
        maxOutputTokens: validatedData.maxTokens || 4096,
        temperature: validatedData.temperature || 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        costPer1kInput: 0.01,
        costPer1kOutput: 0.03,
      },
    });

    // Convert messages to the correct type
    const messages: Message[] = validatedData.messages.map(msg => ({
      id: crypto.randomUUID(),
      role: msg.role,
      content: msg.content,
      createdAt: new Date(),
    }));

    // Create agent context
    const context: AgentContext = {
      messages,
      state: {
        id: crypto.randomUUID(),
        status: 'running',
        lastUpdated: new Date(),
        metadata: {},
      },
      config: {
        id: crypto.randomUUID(),
        name: 'default',
        description: 'Default agent for handling messages',
        model: validatedData.model || 'gpt-4',
        aiService: new AIService(),
      },
      metadata: {
        userId: session.user.id,
        organizationId: validatedData.organizationId,
      },
      executionId: crypto.randomUUID(),
    };

    // Execute the agent with the message
    const result = await agent.execute(context);

    // Generate completion using the agent's output
    const completion = await generateCompletion(
      messages,
      {
        modelId: validatedData.model || 'gpt-4',
        temperature: validatedData.temperature || 0.7,
        maxTokens: validatedData.maxTokens || 1000,
        organizationId: validatedData.organizationId,
        useCustomTokens: validatedData.useCustomTokens,
        customTokens: validatedData.customTokens,
        systemPrompt: validatedData.systemPrompt,
      }
    );

    // Return streaming response
    return completion.toDataStreamResponse();

  } catch (error) {
    console.error('Agent API error:', error);
    if (error instanceof AIServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          type: error.type,
          provider: error.code,
        },
        { status: 500 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 