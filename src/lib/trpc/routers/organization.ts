/**
 * Organization Router
 * 
 * This file defines the tRPC router for organization-related operations.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/lib/trpc/server";
import * as organizationService from "@/lib/organizations/service";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationMembers, users, organizations } from "@/lib/db/schema";
import * as stripeService from "@/lib/stripe/service";
import { getBaseUrl } from "@/lib/utils";

// Input validation schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  logo: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  billingEmail: z.string().email().optional().or(z.literal("")),
});

const updateOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Organization name is required").max(100).optional(),
  logo: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  billingEmail: z.string().email().optional().or(z.literal("")),
  plan: z.string().optional(),
});

const organizationIdSchema = z.object({
  id: z.string().uuid(),
});

const organizationSlugSchema = z.object({
  slug: z.string(),
});

const memberSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  role: z.enum(["member", "admin", "owner"]).optional(),
  invitedEmail: z.string().email().optional(),
});

const updateMemberSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["member", "admin", "owner"]),
});

const removeMemberSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
});

const setDefaultSchema = z.object({
  organizationId: z.string().uuid(),
});

// Add invitation-related schemas
const inviteIdSchema = z.object({
  inviteId: z.string(),
});

const inviteActionSchema = z.object({
  inviteId: z.string(),
  organizationId: z.string(),
});

// Add these schemas to the existing schemas
const createCheckoutSessionSchema = z.object({
  organizationId: z.string().uuid(),
  priceId: z.string(),
});

const createCustomerPortalSessionSchema = z.object({
  organizationId: z.string().uuid(),
});

// Add this helper function before the router export
/**
 * Ensure that a user has access to an organization
 */
async function ensureUserHasAccessToOrganization(userId: string, organizationId: string) {
  const membership = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId)
      )
    )
    .then(members => members[0]);

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this organization",
    });
  }

  return membership;
}

export const organizationRouter = router({
  // Create a new organization
  create: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await organizationService.createOrganization({
          ...input,
          userId: ctx.session.user.id,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create organization",
          cause: error,
        });
      }
    }),

  // Get an organization by ID
  getById: protectedProcedure
    .input(organizationIdSchema)
    .query(async ({ ctx, input }) => {
      try {
        const organization = await organizationService.getOrganizationById(input.id);
        
        if (!organization) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Organization not found",
          });
        }
        
        // Check if the user is a member of this organization
        const isMember = await organizationService.isOrganizationMember({
          organizationId: input.id,
          userId: ctx.session.user.id,
        });
        
        if (!isMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this organization",
          });
        }
        
        return organization;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get organization",
          cause: error,
        });
      }
    }),

  // Get an organization by slug
  getBySlug: protectedProcedure
    .input(organizationSlugSchema)
    .query(async ({ ctx, input }) => {
      try {
        const organization = await organizationService.getOrganizationBySlug(input.slug);
        
        if (!organization) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Organization not found",
          });
        }
        
        // Check if the user is a member of this organization
        const isMember = await organizationService.isOrganizationMember({
          organizationId: organization.id,
          userId: ctx.session.user.id,
        });
        
        if (!isMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this organization",
          });
        }
        
        return organization;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get organization",
          cause: error,
        });
      }
    }),

  // Get all organizations for the current user
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return await organizationService.getUserOrganizations(ctx.session.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get organizations",
          cause: error,
        });
      }
    }),

  // Get all members of an organization
  getMembers: protectedProcedure
    .input(organizationIdSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Check if the user is a member of this organization
        const isMember = await organizationService.isOrganizationMember({
          organizationId: input.id,
          userId: ctx.session.user.id,
        });
        
        if (!isMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this organization",
          });
        }
        
        return await organizationService.getOrganizationMembers(input.id);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get organization members",
          cause: error,
        });
      }
    }),

  // Update an organization
  update: protectedProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if the user has admin rights
        const hasAdminRights = await organizationService.hasOrganizationRole({
          organizationId: input.id,
          userId: ctx.session.user.id,
          role: "admin",
        });
        
        if (!hasAdminRights) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this organization",
          });
        }
        
        // Convert null values to undefined to match the service function signature
        const sanitizedInput = {
          ...input,
          logo: input.logo === null ? undefined : input.logo,
          website: input.website === null ? undefined : input.website,
          billingEmail: input.billingEmail === null ? undefined : input.billingEmail,
        };
        
        return await organizationService.updateOrganization(sanitizedInput);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update organization",
          cause: error,
        });
      }
    }),

  // Delete an organization
  delete: protectedProcedure
    .input(organizationIdSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if the user is an owner
        const isOwner = await organizationService.hasOrganizationRole({
          organizationId: input.id,
          userId: ctx.session.user.id,
          role: "owner",
        });
        
        if (!isOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only owners can delete an organization",
          });
        }
        
        return await organizationService.deleteOrganization(input.id);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete organization",
          cause: error,
        });
      }
    }),

  // Add a member to an organization
  addMember: protectedProcedure
    .input(memberSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if the user has admin rights
        const hasAdminRights = await organizationService.hasOrganizationRole({
          organizationId: input.organizationId,
          userId: ctx.session.user.id,
          role: "admin",
        });
        
        if (!hasAdminRights) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to add members",
          });
        }
        
        // If userId is not provided, we need to ensure invitedEmail is
        if (!input.userId && !input.invitedEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either userId or invitedEmail must be provided",
          });
        }
        
        // Call the service with the required userId
        return await organizationService.addOrganizationMember({
          ...input,
          userId: input.userId || ctx.session.user.id, // Use current user as fallback
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add member",
          cause: error,
        });
      }
    }),

  // Update a member's role
  updateMember: protectedProcedure
    .input(updateMemberSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if the user is an owner
        const isOwner = await organizationService.hasOrganizationRole({
          organizationId: input.organizationId,
          userId: ctx.session.user.id,
          role: "owner",
        });
        
        if (!isOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only owners can update member roles",
          });
        }
        
        return await organizationService.updateOrganizationMember(input);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update member",
          cause: error,
        });
      }
    }),

  // Remove a member from an organization
  removeMember: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if the user is an admin (or removing themselves)
        const isAdmin = await organizationService.hasOrganizationRole({
          organizationId: input.organizationId,
          userId: ctx.session.user.id,
          role: "admin",
        });
        
        const isSelf = ctx.session.user.id === input.userId;
        
        if (!isAdmin && !isSelf) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to remove members",
          });
        }
        
        return await organizationService.removeOrganizationMember(input);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove member",
          cause: error,
        });
      }
    }),

  // Set default organization for the current user
  setDefault: protectedProcedure
    .input(setDefaultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await organizationService.setDefaultOrganization({
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set default organization",
          cause: error,
        });
      }
    }),

  // Get invitation details
  getInvite: protectedProcedure
    .input(inviteIdSchema)
    .query(async ({ input }) => {
      try {
        // Query the database for the invitation
        const member = await db.query.organizationMembers.findFirst({
          where: eq(organizationMembers.id, input.inviteId),
        });

        if (!member || member.inviteAccepted) {
          return null;
        }

        // Get the organization details
        const organization = await db.query.organizations.findFirst({
          where: eq(organizations.id, member.organizationId),
        });

        if (!organization) {
          return null;
        }

        // Get the inviter details if available
        let inviterName: string | undefined = undefined;
        if (member.userId) {
          const inviter = await db.query.users.findFirst({
            where: eq(users.id, member.userId),
          });
          inviterName = inviter?.name || undefined;
        }

        return {
          organizationId: member.organizationId,
          organizationName: organization.name,
          inviterName,
        };
      } catch (error) {
        console.error("Error getting invitation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get invitation",
          cause: error,
        });
      }
    }),

  // Accept an invitation
  acceptInvite: protectedProcedure
    .input(inviteActionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if the invitation exists and is valid
        const member = await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.id, input.inviteId),
            eq(organizationMembers.organizationId, input.organizationId)
          ),
        });

        if (!member) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation not found",
          });
        }

        if (member.inviteAccepted) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invitation already accepted",
          });
        }

        // Check if the invited email matches the current user's email
        if (member.invitedEmail !== ctx.session.user.email) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This invitation is not for you",
          });
        }

        // Accept the invitation
        await db
          .update(organizationMembers)
          .set({
            userId: ctx.session.user.id,
            inviteAccepted: true,
            updatedAt: new Date(),
          })
          .where(eq(organizationMembers.id, input.inviteId));

        // If the user doesn't have a default organization, set this one as default
        const user = await db.query.users.findFirst({
          where: eq(users.id, ctx.session.user.id),
        });

        if (user && !user.defaultOrganizationId) {
          await db
            .update(users)
            .set({
              defaultOrganizationId: input.organizationId,
              updatedAt: new Date(),
            })
            .where(eq(users.id, ctx.session.user.id));
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to accept invitation",
          cause: error,
        });
      }
    }),

  // Decline an invitation
  declineInvite: protectedProcedure
    .input(inviteActionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if the invitation exists and is valid
        const member = await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.id, input.inviteId),
            eq(organizationMembers.organizationId, input.organizationId)
          ),
        });

        if (!member) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation not found",
          });
        }

        if (member.inviteAccepted) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invitation already accepted",
          });
        }

        // Check if the invited email matches the current user's email
        if (member.invitedEmail !== ctx.session.user.email) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This invitation is not for you",
          });
        }

        // Delete the invitation
        await db
          .delete(organizationMembers)
          .where(eq(organizationMembers.id, input.inviteId));

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to decline invitation",
          cause: error,
        });
      }
    }),

  /**
   * Get subscription status for an organization
   */
  getSubscriptionStatus: protectedProcedure
    .input(organizationIdSchema)
    .query(async ({ ctx, input }) => {
      const { id } = input;
      
      // Check if user has access to the organization
      await ensureUserHasAccessToOrganization(ctx.session.user.id, id);
      
      return stripeService.getSubscriptionStatusForOrganization(id);
    }),
  
  /**
   * Get available pricing plans
   */
  getAvailablePlans: protectedProcedure
    .query(async () => {
      return stripeService.getAvailablePlans();
    }),
  
  /**
   * Create a checkout session for an organization
   */
  createCheckoutSession: protectedProcedure
    .input(createCheckoutSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, priceId } = input;
      
      // Check if user has access to the organization
      await ensureUserHasAccessToOrganization(ctx.session.user.id, organizationId);
      
      // Get the organization
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .then(orgs => orgs[0]);
      
      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }
      
      // Create a checkout session
      const baseUrl = getBaseUrl();
      const session = await stripeService.createCheckoutSessionForOrganization({
        organizationId,
        priceId,
        email: ctx.session.user.email || '',
        name: org.name,
        successUrl: `${baseUrl}/org/${org.slug}/settings?checkout=success`,
        cancelUrl: `${baseUrl}/org/${org.slug}/settings?checkout=cancelled`,
      });
      
      return { url: session.url };
    }),
  
  /**
   * Create a customer portal session for an organization
   */
  createCustomerPortalSession: protectedProcedure
    .input(createCustomerPortalSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = input;
      
      // Check if user has access to the organization
      await ensureUserHasAccessToOrganization(ctx.session.user.id, organizationId);
      
      // Get the organization
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .then(orgs => orgs[0]);
      
      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }
      
      // Create a customer portal session
      const baseUrl = getBaseUrl();
      const session = await stripeService.createCustomerPortalSessionForOrganization({
        organizationId,
        returnUrl: `${baseUrl}/org/${org.slug}/settings`,
      });
      
      return { url: session.url };
    }),
}); 