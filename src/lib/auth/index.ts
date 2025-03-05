import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";

/**
 * NextAuth handler with Drizzle adapter
 * This provides authentication functionality for the application
 */
export const { 
  handlers, 
  auth, 
  signIn, 
  signOut,
} = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
});

/**
 * Export auth-related utilities
 */
export * from "./data";
export * from "./password"; 