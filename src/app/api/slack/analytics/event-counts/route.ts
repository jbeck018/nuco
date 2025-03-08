export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createSlackAnalyticsService } from '@/lib/slack/analytics-service';

/**
 * GET handler for Slack event counts by type
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const integrationId = searchParams.get('integrationId');
    const period = searchParams.get('period') || 'month';
    
    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }
    
    // Get the integration from the database
    const integration = await db.query.integrations.findFirst({
      where: eq(integrations.id, integrationId),
    });
    
    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }
    
    // Check if the user has access to this integration
    if (integration.userId !== session.user.id && 
        integration.organizationId !== session.user.defaultOrganizationId) {
      return NextResponse.json(
        { error: 'Unauthorized to access this integration' },
        { status: 403 }
      );
    }
    
    // Create analytics service
    const analyticsService = createSlackAnalyticsService();
    
    // Get event counts by type
    const eventCounts = await analyticsService.getEventCountsByType(
      integrationId,
      period as 'day' | 'week' | 'month' | 'year' | 'all'
    );
    
    return NextResponse.json(eventCounts);
  } catch (error) {
    console.error('Error getting Slack event counts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 