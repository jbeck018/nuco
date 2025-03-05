/**
 * User router
 * This file contains all user-related tRPC procedures
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../server';
import { getUserByEmail, getUserById, createUser, updateUserProfile } from '@/lib/auth/data';
// import { hashPassword } from '@/lib/auth/password';
import { TRPCError } from '@trpc/server';

/**
 * User router with all user-related procedures
 */
export const userRouter = router({
  /**
   * Get the current user's profile
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await getUserById(userId);
    
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }
    
    // Don't return sensitive information
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
    };
  }),
  
  /**
   * Update the current user's profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const updatedUser = await updateUserProfile(userId, input);
      
      if (!updatedUser) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }
      
      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
      };
    }),
  
  /**
   * Register a new user (public)
   */
  register: publicProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const { name, email, password } = input;
      
      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists',
        });
      }
      
      // Create the user
      const user = await createUser({
        name,
        email,
        password,
      });
      
      if (!user) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        });
      }
      
      return {
        success: true,
        message: 'User registered successfully',
      };
    }),
  
  /**
   * Get all users (admin only)
   */
  getAll: adminProcedure.query(async () => {
    // This would be implemented with a database query to get all users
    // For now, we'll return a placeholder
    return [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
      },
      {
        id: '2',
        name: 'Regular User',
        email: 'user@example.com',
        role: 'user',
      },
    ];
  }),
}); 