/**
 * Organization Service
 * 
 * This file provides functions for managing organizations and their members.
 */

import { db } from '@/lib/db';
import { organizations, organizationMembers, users, organizationRoleEnum } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { uuidv4 } from '@/lib/utils/edge-crypto';
import { slugify } from '@/lib/utils';

/**
 * Create a new organization
 */
export async function createOrganization({
  name,
  userId,
  logo,
  website,
  billingEmail,
}: {
  name: string;
  userId: string;
  logo?: string;
  website?: string;
  billingEmail?: string;
}) {
  // Generate a unique slug from the name
  const baseSlug = slugify(name);
  const slug = await generateUniqueSlug(baseSlug);

  // Create the organization
  const [organization] = await db.insert(organizations).values({
    id: uuidv4(),
    name,
    slug,
    logo,
    website,
    billingEmail,
    plan: 'free',
  }).returning();

  // Add the creator as an owner
  await db.insert(organizationMembers).values({
    id: uuidv4(),
    organizationId: organization.id,
    userId,
    role: 'owner',
    inviteAccepted: true,
  });

  // Set as default organization for the user if they don't have one
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user && !user.defaultOrganizationId) {
    await db.update(users)
      .set({ defaultOrganizationId: organization.id })
      .where(eq(users.id, userId));
  }

  return organization;
}

/**
 * Get an organization by ID
 */
export async function getOrganizationById(id: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, id),
    with: {
      members: {
        with: {
          user: true,
        },
      },
    },
  });
}

/**
 * Get an organization by slug
 */
export async function getOrganizationBySlug(slug: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    with: {
      members: {
        with: {
          user: true,
        },
      },
    },
  });
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(userId: string) {
  const memberships = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.userId, userId),
    with: {
      organization: true,
    },
  });

  return memberships.map(membership => ({
    ...membership.organization,
    role: membership.role,
  }));
}

/**
 * Update an organization
 */
export async function updateOrganization({
  id,
  name,
  logo,
  website,
  billingEmail,
  plan,
}: {
  id: string;
  name?: string;
  logo?: string;
  website?: string;
  billingEmail?: string;
  plan?: string;
}) {
  const updateData: Partial<typeof organizations.$inferInsert> = {};
  
  if (name) updateData.name = name;
  if (logo !== undefined) updateData.logo = logo;
  if (website !== undefined) updateData.website = website;
  if (billingEmail !== undefined) updateData.billingEmail = billingEmail;
  if (plan) updateData.plan = plan;
  
  const [updatedOrg] = await db.update(organizations)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, id))
    .returning();
    
  return updatedOrg;
}

/**
 * Delete an organization
 */
export async function deleteOrganization(id: string) {
  // This will cascade delete all members due to foreign key constraints
  await db.delete(organizations).where(eq(organizations.id, id));
  return true;
}

/**
 * Add a member to an organization
 */
export async function addOrganizationMember({
  organizationId,
  userId,
  role = 'member',
  invitedEmail,
}: {
  organizationId: string;
  userId: string;
  role?: 'member' | 'admin' | 'owner';
  invitedEmail?: string;
}) {
  const [member] = await db.insert(organizationMembers).values({
    id: uuidv4(),
    organizationId,
    userId,
    role: role as any,
    invitedEmail,
    inviteAccepted: !invitedEmail, // If no email, they're already a user
  }).returning();
  
  return member;
}

/**
 * Update a member's role in an organization
 */
export async function updateOrganizationMember({
  organizationId,
  userId,
  role,
}: {
  organizationId: string;
  userId: string;
  role: 'member' | 'admin' | 'owner';
}) {
  const [updatedMember] = await db.update(organizationMembers)
    .set({
      role: role as any,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    )
    .returning();
    
  return updatedMember;
}

/**
 * Remove a member from an organization
 */
export async function removeOrganizationMember({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  // Check if this is the last owner
  const owners = await db.query.organizationMembers.findMany({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.role, 'owner')
    ),
  });
  
  if (owners.length === 1 && owners[0].userId === userId) {
    throw new Error('Cannot remove the last owner of an organization');
  }
  
  await db.delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    );
    
  return true;
}

/**
 * Set a user's default organization
 */
export async function setDefaultOrganization({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  // Verify the user is a member of this organization
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, organizationId)
    ),
  });
  
  if (!membership) {
    throw new Error('User is not a member of this organization');
  }
  
  const [updatedUser] = await db.update(users)
    .set({ defaultOrganizationId: organizationId })
    .where(eq(users.id, userId))
    .returning();
    
  return updatedUser;
}

/**
 * Check if a user is a member of an organization
 */
export async function isOrganizationMember({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, userId)
    ),
  });
  
  return !!membership;
}

/**
 * Check if a user has a specific role in an organization
 */
export async function hasOrganizationRole({
  organizationId,
  userId,
  role,
}: {
  organizationId: string;
  userId: string;
  role: 'member' | 'admin' | 'owner';
}) {
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, userId)
    ),
  });
  
  if (!membership) return false;
  
  // Owners can do anything
  if (membership.role === 'owner') return true;
  
  // Admins can do member things
  if (membership.role === 'admin' && role === 'member') return true;
  
  return membership.role === role;
}

/**
 * Generate a unique slug for an organization
 */
async function generateUniqueSlug(baseSlug: string): Promise<string> {
  // Check if the slug is already in use
  const existingOrg = await db.query.organizations.findFirst({
    where: eq(organizations.slug, baseSlug),
  });
  
  if (!existingOrg) return baseSlug;
  
  // If it's in use, add a random suffix
  let counter = 1;
  let newSlug = `${baseSlug}-${counter}`;
  
  while (await db.query.organizations.findFirst({ where: eq(organizations.slug, newSlug) })) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }
  
  return newSlug;
}

/**
 * Get all members of an organization
 * @param organizationId - The ID of the organization
 * @returns An array of organization members with their user details
 */
export async function getOrganizationMembers(organizationId: string) {
  try {
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, organizationId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    
    return members;
  } catch (error) {
    console.error("Error getting organization members:", error);
    throw error;
  }
} 