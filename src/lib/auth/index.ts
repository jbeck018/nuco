import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";
import { users } from "../db/schema/users";
import { accounts } from "../db/schema/accounts";
import { sessions } from "../db/schema/sessions";
import { verificationTokens } from "../db/schema/verification-tokens";
import { authenticators } from "../db/schema/authenticators";
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
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  }),
  session: { strategy: "jwt" },
  ...authConfig,
});

/**
 * Export auth-related utilities
 */
export * from "./data";
export * from "./password"; 