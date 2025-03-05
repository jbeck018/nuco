/**
 * Server-Sent Events (SSE) API Endpoint for Integration Updates
 *
 * This endpoint allows clients to subscribe to real-time integration updates via SSE.
 * Clients can filter updates by integration ID, user ID, or organization ID.
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IntegrationEventStore } from '@/lib/integrations/event-store';

// Create an instance of the event store
const eventStore = new IntegrationEventStore();

// Configure route handler options
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET handler for SSE endpoint
 */
export async function GET(req: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Get user ID from session
    const userId = session.user.id;
    
    // Parse query parameters
    const url = new URL(req.url);
    const integrationId = url.searchParams.get('integrationId');
    const organizationId = url.searchParams.get('organizationId');
    
    // Add user ID to the request query params for filtering
    const modifiedRequest = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body
    });
    
    const modifiedUrl = new URL(modifiedRequest.url);
    modifiedUrl.searchParams.set('userId', userId);
    modifiedRequest.url = modifiedUrl.toString();
    
    // Handle SSE connection
    return eventStore.handleSSEConnection(modifiedRequest);
  } catch (error) {
    console.error('Error setting up SSE connection:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 