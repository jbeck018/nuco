import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import OpenAI from 'openai';

// Set runtime to edge for optimal performance
export const runtime = 'edge';

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const { messages, model = 'gpt-4o', temperature = 0.7 } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required and must be an array' },
        { status: 400 }
      );
    }

    // Create chat completion
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      stream: true,
    });

    // Return the stream directly as a Response
    // OpenAI's stream is already compatible with Web ReadableStream
    return new Response(response.toReadableStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 