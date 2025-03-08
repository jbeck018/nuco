import { cache } from 'react';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { count, eq, and } from 'drizzle-orm';

/**
 * Get integration statistics for an organization
 * @param organizationId The organization ID
 * @returns Integration statistics
 */
export const getIntegrationStats = cache(async (organizationId: string) => {
    if (!organizationId) {
        return {
            total: 0,
            active: 0,
        };
    }
  try {
    // Get total integrations count
    const [totalResult] = await db
      .select({ count: count() })
      .from(integrations)
      .where(eq(integrations.organizationId, organizationId));
    
    // Get active integrations count
    const [activeResult] = await db
      .select({ count: count() })
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.isActive, true)
        )
      );
    
    return {
      total: totalResult?.count || 0,
      active: activeResult?.count || 0,
    };
  } catch (error) {
    console.error('Error fetching integration stats:', error);
    return {
      total: 0,
      active: 0,
    };
  }
}); 