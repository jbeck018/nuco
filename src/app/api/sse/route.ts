import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// Set dynamic to force-dynamic to ensure the route is not cached
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Create a new ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(
          `data: ${JSON.stringify({ type: 'connection', status: 'connected' })}\n\n`
        );

        // Set up interval to send heartbeat messages
        const intervalId = setInterval(() => {
          controller.enqueue(
            `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`
          );
        }, 30000); // Send heartbeat every 30 seconds

        // Clean up interval when the connection is closed
        req.signal.addEventListener('abort', () => {
          clearInterval(intervalId);
          controller.close();
        });
      },
    });

    // Return the stream as a response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('SSE API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 