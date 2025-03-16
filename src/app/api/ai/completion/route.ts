import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/service';
import { AIServiceError } from '@/lib/ai/error';
import { errorHandler } from '@/lib/ai/utils';

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
      modelId, 
      maxTokens, 
      temperature,
      systemPrompt,
      organizationId,
      useCustomTokens,
      customTokens
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required and must be an array' },
        { status: 400 }
      );
    }

    try {
      // Generate completion using the AI service
      const response = await generateCompletion(
        messages,
        {
          modelId,
          maxTokens,
          temperature,
          systemPrompt,
          organizationId,
          useCustomTokens,
          customTokens
        }
      );

      // Use the toDataStreamResponse method provided by the Vercel AI SDK
      return response.toDataStreamResponse({
        getErrorMessage: errorHandler
      });
    } catch (error) {
      console.error('AI service error:', error);
      
      // Handle specific AI service errors
      if (error instanceof AIServiceError) {
        return NextResponse.json(
          { 
            error: error.message,
            type: error.type,
            provider: error.provider
          },
          { status: error.status || 500 }
        );
      }
      
      // Handle generic errors
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 