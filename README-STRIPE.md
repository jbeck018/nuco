# Stripe Integration for Nuco-App

This document provides instructions for setting up and testing the Stripe integration for Nuco-App.

## Setup

### 1. Create a Stripe Account

If you don't already have a Stripe account, sign up at [stripe.com](https://stripe.com). You can use Stripe's test mode for development.

### 2. Get API Keys

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** and **Secret key**
3. Add these to your `.env` file:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Set Up Webhook

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login to your Stripe account via the CLI:
   ```
   stripe login
   ```
3. Start the webhook forwarding:
   ```
   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
   ```
4. The CLI will output a webhook signing secret. Add this to your `.env` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 4. Create Products and Prices

1. Go to the [Stripe Dashboard Products page](https://dashboard.stripe.com/products)
2. Create products for your subscription tiers (e.g., Starter, Pro, Enterprise)
3. For each product:
   - Add a name and description
   - Set up pricing (monthly/yearly)
   - Add features as metadata (as a JSON array of strings)

Example metadata for a product:
```json
{
  "features": ["10 team members", "3 integrations", "1000 requests per month", "AI features"]
}
```

## Testing

### Test Subscription Flow

1. Start your application
2. Navigate to an organization's settings page
3. Go to the Billing tab
4. Select a plan and click Subscribe
5. You'll be redirected to Stripe Checkout
6. Use Stripe's test card numbers for testing:
   - Success: `4242 4242 4242 4242`
   - Requires Authentication: `4000 0025 0000 3155`
   - Declined: `4000 0000 0000 0002`

### Test Webhook Events

With the Stripe CLI running and forwarding webhooks, you can trigger test events:

```
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
```

## Implementation Details

### Database Schema

The organizations table has been extended with the following Stripe-related fields:

- `stripeCustomerId`: The Stripe customer ID
- `stripeSubscriptionId`: The Stripe subscription ID
- `stripeSubscriptionStatus`: The status of the subscription
- `stripePriceId`: The ID of the price the organization is subscribed to
- `subscriptionCurrentPeriodEnd`: When the current subscription period ends
- `cancelAtPeriodEnd`: Whether the subscription will cancel at the end of the period

### Components

- `OrganizationBilling`: Displays subscription information and available plans
- Stripe Checkout: Hosted by Stripe for secure payment processing
- Stripe Customer Portal: Allows customers to manage their subscription

### API Endpoints

- `POST /api/webhooks/stripe`: Handles Stripe webhook events
- `POST /api/trpc/organization.createCheckoutSession`: Creates a Stripe checkout session
- `POST /api/trpc/organization.createCustomerPortalSession`: Creates a Stripe customer portal session
- `GET /api/trpc/organization.getSubscriptionStatus`: Gets the current subscription status
- `GET /api/trpc/organization.getAvailablePlans`: Gets available pricing plans

## Troubleshooting

### Webhook Issues

- Ensure the Stripe CLI is running and forwarding webhooks
- Check that the webhook secret is correctly set in your `.env` file
- Look for webhook errors in your application logs

### Subscription Issues

- Check the Stripe Dashboard for the status of customers and subscriptions
- Verify that webhook events are being received and processed
- Check your application logs for any errors related to Stripe

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) 