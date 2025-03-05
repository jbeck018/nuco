/**
 * tRPC router configuration
 * This file sets up the main tRPC router with all sub-routers
 */
import { router } from './server';
import { userRouter } from './routers/user';
import { integrationRouter } from './routers/integration';
import { aiRouter } from './routers/ai';
import { organizationRouter } from './routers/organization';
import { metadataRouter } from './routers/metadata';

/**
 * Main tRPC router
 * Combines all sub-routers into a single router
 */
export const appRouter = router({
  user: userRouter,
  integration: integrationRouter,
  ai: aiRouter,
  organization: organizationRouter,
  metadata: metadataRouter,
});

/**
 * Export type definition of the API
 * This is used for client-side type inference
 */
export type AppRouter = typeof appRouter; 