/**
 * tRPC server configuration
 * This file sets up the tRPC server with context and procedures
 */
import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import type { Session } from 'next-auth';
import { auth } from '../auth';

/**
 * Context type for tRPC procedures
 */
export interface Context {
  session: Session | null;
}

/**
 * Create context for tRPC procedures
 */
export async function createContext(): Promise<Context> {
  const session = await auth();
  return {
    session,
  };
}

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a router
 */
export const router = t.router;

/**
 * Create a public procedure (no authentication required)
 */
export const publicProcedure = t.procedure;

/**
 * Create a protected procedure (authentication required)
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      // Add user information to context
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Create an admin procedure (admin role required)
 */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  
  return next({
    ctx: {
      ...ctx,
      // Add user information to context
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
}); 