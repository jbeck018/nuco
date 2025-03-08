import { cache } from 'react';
import { db } from '@/lib/db';
import { organizations, organizationMembers } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';

/**
 * Get organization details
 * @param organizationId The organization ID
 * @returns Organization details
 */
export const getOrganizationDetails = cache(async (organizationId: string) => {
  if (!organizationId) {
    return {
      id: 'org_default',
      name: 'Unknown Organization',
      role: 'member',
      members: 0,
    };
  }

  try {
    // Get organization details
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    
    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }
    
    // Get member count
    const [memberCount] = await db
      .select({ count: count() })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));
    
    // Get user's role in the organization
    // Note: In a real implementation, you would get the current user's role
    // For now, we'll default to 'admin' for simplicity
    const role = 'admin';
    
    return {
      id: org.id,
      name: org.name,
      role,
      members: memberCount?.count || 0,
    };
  } catch (error) {
    console.error('Error fetching organization details:', error);
    return {
      id: organizationId || 'org_default',
      name: 'Unknown Organization',
      role: 'member',
      members: 0,
    };
  }
}); 