/**
 * Stripe Client
 * 
 * This file initializes the Stripe SDK with the API key from environment variables
 * and exports the client for use throughout the application.
 */

import Stripe from 'stripe';
import { getEnv } from '@/lib/env';

// Initialize Stripe with the API key from environment variables
const { STRIPE_SECRET_KEY } = getEnv();

if (!STRIPE_SECRET_KEY) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable');
}

// Create a new Stripe instance with the API key
export const stripe = new Stripe(STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia', // Specify the Stripe API version
  appInfo: {
    name: 'Nuco-App',
    version: '0.1.0',
  },
});

// Export the Stripe instance for use throughout the application
export default stripe; 