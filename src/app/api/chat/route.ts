import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AIServiceError } from '@/lib/ai/error';
import { aiService } from '@/lib/ai/service';
import { z } from 'zod';

// Set runtime to edge for optimal performance
//export const runtime = 'edge';

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

    // Initialize AI service if not already initialized
    await aiService.initialize();

    // Generate completion using the AI service
    const result = await aiService.generateCompletion(
      validatedData.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      })), 
      {
        modelId: validatedData.model,
        temperature: validatedData.temperature,
        maxTokens: validatedData.maxTokens,
        organizationId: validatedData.organizationId,
        useCustomTokens: validatedData.useCustomTokens,
        customTokens: validatedData.customTokens,
        systemPrompt: validatedData.systemPrompt,
        metadata: {
          userId: session.user.id,
        },
      }
    );

    // Return streaming response
    return new Response(result.toDataStream(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    if (error instanceof AIServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          type: error.type,
          provider: error.code,
        },
        { status: error.status || 500 }
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