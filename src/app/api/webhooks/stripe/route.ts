export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/client';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

// Maximum size for the webhook payload
export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

/**
 * POST handler for Stripe webhooks
 */ 
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return new NextResponse('Webhook secret is missing', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return new NextResponse(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`, { status: 400 });
  }

  try {
    // Handle the event based on its type
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeletion(event.data.object as Stripe.Subscription);
        break;
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return new NextResponse(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

/**
 * Handle subscription creation or update
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  // Find the organization with this customer ID
  const orgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId));

  if (orgs.length === 0) {
    console.error(`No organization found with Stripe customer ID: ${customerId}`);
    return;
  }

  const organization = orgs[0];

  // Update the organization with the subscription details
  await db
    .update(organizations)
    .set({
      stripePriceId: priceId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: status,
      subscriptionCurrentPeriodEnd: currentPeriodEnd,
      plan: getPlanFromPriceId(priceId),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organization.id));

  console.log(`Updated subscription for organization ${organization.id} to ${status}`);
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeletion(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find the organization with this customer ID
  const orgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId));

  if (orgs.length === 0) {
    console.error(`No organization found with Stripe customer ID: ${customerId}`);
    return;
  }

  const organization = orgs[0];

  // Update the organization to reflect the cancelled subscription
  await db
    .update(organizations)
    .set({
      stripeSubscriptionStatus: subscription.status,
      plan: 'free', // Revert to free plan
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organization.id));

  console.log(`Subscription cancelled for organization ${organization.id}`);
}

/**
 * Handle checkout session completion
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // If this is a new subscription, the subscription ID will be in the session
  if (session.subscription && session.customer) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await handleSubscriptionChange(subscription);
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (invoice.subscription && invoice.customer) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    await handleSubscriptionChange(subscription);
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (invoice.subscription && invoice.customer) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    
    // Find the organization with this customer ID
    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.stripeCustomerId, invoice.customer as string));

    if (orgs.length === 0) {
      console.error(`No organization found with Stripe customer ID: ${invoice.customer}`);
      return;
    }

    const organization = orgs[0];

    // Update the organization to reflect the payment failure
    await db
      .update(organizations)
      .set({
        stripeSubscriptionStatus: subscription.status,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organization.id));

    console.log(`Payment failed for organization ${organization.id}`);
  }
}

/**
 * Map price ID to plan name
 */
function getPlanFromPriceId(priceId: string | undefined): string {
  if (!priceId) return 'free';

  // This mapping should be configured based on your actual price IDs
  const priceToPlanMap: Record<string, string> = {
    // Example mappings - replace with your actual price IDs
    'price_1234': 'starter',
    'price_5678': 'pro',
    'price_9012': 'enterprise',
  };

  return priceToPlanMap[priceId] || 'free';
} 