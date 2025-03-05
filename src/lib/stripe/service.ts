/**
 * Stripe Service
 * 
 * This file provides service functions for Stripe operations,
 * integrating with our organization framework.
 */

import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { 
  createCustomer, 
  createCheckoutSession, 
  createCustomerPortalSession,
  getActiveProductsWithPrices,
  PriceWithInterval
} from './utils';

/**
 * Get or create a Stripe customer for an organization
 */
export async function getOrCreateCustomerForOrganization(organizationId: string, email: string, name?: string) {
  // Check if the organization already has a Stripe customer ID
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .then(orgs => orgs[0]);

  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  // If the organization already has a customer ID, return it
  if (org.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  // Otherwise, create a new customer
  const customer = await createCustomer({
    email,
    name,
    organizationId,
  });

  return customer.id;
}

/**
 * Create a checkout session for an organization
 */
export async function createCheckoutSessionForOrganization(params: {
  organizationId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  email: string;
  name?: string;
  trialDays?: number;
}) {
  const { organizationId, priceId, successUrl, cancelUrl, email, name, trialDays } = params;

  // Get or create a customer for the organization
  const customerId = await getOrCreateCustomerForOrganization(organizationId, email, name);

  // Create a checkout session
  const session = await createCheckoutSession({
    priceId,
    customerId,
    successUrl,
    cancelUrl,
    metadata: { organizationId },
    trialDays,
  });

  return session;
}

/**
 * Create a customer portal session for an organization
 */
export async function createCustomerPortalSessionForOrganization(params: {
  organizationId: string;
  returnUrl: string;
}) {
  const { organizationId, returnUrl } = params;

  // Get the organization
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .then(orgs => orgs[0]);

  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  if (!org.stripeCustomerId) {
    throw new Error(`Organization does not have a Stripe customer ID: ${organizationId}`);
  }

  // Create a customer portal session
  const session = await createCustomerPortalSession({
    customerId: org.stripeCustomerId,
    returnUrl,
  });

  return session;
}

/**
 * Get subscription status for an organization
 */
export async function getSubscriptionStatusForOrganization(organizationId: string) {
  // Get the organization
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .then(orgs => orgs[0]);

  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  return {
    plan: org.plan || 'free',
    status: org.stripeSubscriptionStatus,
    currentPeriodEnd: org.subscriptionCurrentPeriodEnd,
    cancelAtPeriodEnd: org.cancelAtPeriodEnd || false,
  };
}

/**
 * Get all available pricing plans
 */
export async function getAvailablePlans(): Promise<PriceWithInterval[]> {
  return getActiveProductsWithPrices();
}

/**
 * Check if an organization is on a paid plan
 */
export function isOnPaidPlan(plan: string | null | undefined): boolean {
  if (!plan) return false;
  return plan !== 'free';
}

/**
 * Check if an organization has an active subscription
 */
export function hasActiveSubscription(status: string | null | undefined): boolean {
  if (!status) return false;
  return ['active', 'trialing'].includes(status);
}

/**
 * Get feature limits based on plan
 */
export function getPlanLimits(plan: string | null | undefined) {
  const planLimits: Record<string, any> = {
    free: {
      maxMembers: 3,
      maxIntegrations: 1,
      maxRequests: 100,
      aiFeatures: false,
      advancedAnalytics: false,
    },
    starter: {
      maxMembers: 10,
      maxIntegrations: 3,
      maxRequests: 1000,
      aiFeatures: true,
      advancedAnalytics: false,
    },
    pro: {
      maxMembers: 25,
      maxIntegrations: 10,
      maxRequests: 10000,
      aiFeatures: true,
      advancedAnalytics: true,
    },
    enterprise: {
      maxMembers: 100,
      maxIntegrations: 50,
      maxRequests: 100000,
      aiFeatures: true,
      advancedAnalytics: true,
    },
  };

  return planLimits[plan || 'free'] || planLimits.free;
} 