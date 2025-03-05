/**
 * Stripe Utilities
 * 
 * This file provides utility functions for working with Stripe,
 * including creating customers, managing subscriptions, and handling checkout sessions.
 */

import { stripe } from './client';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Price data with interval
 */
export interface PriceWithInterval {
  id: string;
  name: string; 
  amount: number;
  currency: string;
  interval: 'month' | 'year' | 'one_time';
  description?: string;
  features?: string[];
}

/**
 * Create a Stripe customer for a user
 */
export async function createCustomer(params: {
  email: string;
  name?: string;
  organizationId?: string;
}) {
  const { email, name, organizationId } = params;

  try {
    // Create the customer in Stripe
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: organizationId ? { organizationId } : undefined,
    });

    // If we have an organization ID, update the organization with the customer ID
    if (organizationId) {
      await db
        .update(organizations)
        .set({ stripeCustomerId: customer.id })
        .where(eq(organizations.id, organizationId));
    }

    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw new Error('Failed to create Stripe customer');
  }
}

/**
 * Get a Stripe customer by ID
 */
export async function getCustomer(customerId: string) {
  try {
    return await stripe.customers.retrieve(customerId);
  } catch (error) {
    console.error('Error retrieving Stripe customer:', error);
    throw new Error('Failed to retrieve Stripe customer');
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(params: {
  priceId: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  trialDays?: number;
}) {
  const { priceId, customerId, successUrl, cancelUrl, metadata, trialDays } = params;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: trialDays
        ? {
            trial_period_days: trialDays,
          }
        : undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Create a customer portal session
 */
export async function createCustomerPortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  const { customerId, returnUrl } = params;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw new Error('Failed to create customer portal session');
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw new Error('Failed to retrieve subscription');
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    return await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  });

  return formatter.format(amount / 100);
}

/**
 * Get all active products with prices
 */
export async function getActiveProductsWithPrices(): Promise<PriceWithInterval[]> {
  try {
    // Get all active products
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    // Get all prices for these products
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });

    // Format the prices with interval
    return prices.data
      .filter((price) => price.type === 'recurring')
      .map((price) => {
        const product = products.data.find((p) => p.id === price.product);
        
        return {
          id: price.id,
          name: product?.name || 'Unknown Product',
          amount: price.unit_amount || 0,
          currency: price.currency,
          interval: price.recurring?.interval as 'month' | 'year',
          description: product?.description || undefined,
          features: product?.metadata?.features ? JSON.parse(product.metadata.features) : undefined,
        };
      });
  } catch (error) {
    console.error('Error fetching products and prices:', error);
    throw new Error('Failed to fetch products and prices');
  }
} 