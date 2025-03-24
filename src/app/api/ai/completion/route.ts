import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

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

    // Return deprecation notice
    return NextResponse.json(
      { 
        error: 'This endpoint is deprecated. Please use /api/ai/agent instead.',
        migration: {
          oldEndpoint: '/api/ai/completion',
          newEndpoint: '/api/ai/agent',
          changes: [
            'The completion endpoint has been replaced with the agent endpoint',
            'The agent endpoint provides enhanced capabilities through the agent system',
            'The request format remains the same, just change the endpoint URL',
          ],
        },
      },
      { status: 410 }
    );
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 