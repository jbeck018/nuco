/**
 * Test Endpoint for Integration Updates
 * 
 * This endpoint allows simulating integration events for testing real-time updates.
 * It's only meant for development and testing purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { IntegrationEventStore } from '@/lib/integrations/event-store';

// Create an event store instance
const eventStore = new IntegrationEventStore();

/**
 * POST handler for test endpoint
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  try {
    const body = await req.json();
    const { integrationId, event, data } = body;
    
    if (!integrationId || !event) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check if integration exists
    const [integration] = await db.select().from(integrations).where(eq(integrations.id, integrationId));
    
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }
    
    // Process different event types
    switch (event) {
      case 'status-update':
        const status = data?.status || 'connected';
        await db.update(integrations)
          .set({
            isActive: status === 'connected',
            updatedAt: new Date()
          })
          .where(eq(integrations.id, integrationId));
        
        eventStore.publishEvent('status-update', {
          integrationId,
          status
        });
        break;
        
      case 'sync-completed':
        const now = new Date();
        await db.update(integrations)
          .set({
            lastSyncedAt: now,
            updatedAt: now
          })
          .where(eq(integrations.id, integrationId));
        
        eventStore.publishEvent('sync-completed', {
          integrationId,
          lastSynced: now.toISOString()
        });
        break;
        
      case 'sync-failed':
        await db.update(integrations)
          .set({
            updatedAt: new Date()
          })
          .where(eq(integrations.id, integrationId));
        
        eventStore.publishEvent('sync-failed', {
          integrationId,
          error: data?.error || 'Test error message'
        });
        break;
        
      case 'sync-progress':
        eventStore.publishEvent('sync-progress', {
          integrationId,
          progress: data?.progress || 50,
          message: data?.message || 'Syncing in progress...'
        });
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Test ${event} event published for integration ${integrationId}`
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 