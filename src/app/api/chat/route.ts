import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateCompletion } from '@/lib/ai/service';
import { AIServiceError } from '@/lib/ai/error';
import { errorHandler } from '@/lib/ai/utils';

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
      model = 'gpt-4o', 
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
    
    // Use the AI service to generate a completion
    try {
      const stream = await generateCompletion(messages, {
        modelId: model,
        temperature,
        organizationId,
        useCustomTokens,
        customTokens,
        systemPrompt,
        maxTokens,
        userId: session.user.id
      });
      
      // Use the toDataStreamResponse method provided by the Vercel AI SDK
      // This preserves the raw response format so the client can extract metadata
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