import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Salesforce from "next-auth/providers/salesforce";
import HubSpot from "next-auth/providers/hubspot";
import { z } from "zod";
//
// Import types from next-auth to extend
import type { DefaultSession } from "next-auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { IntegrationType } from "@/lib/integrations";

// Extend the built-in types
declare module "next-auth" {
  /**
   * Extend the built-in User type
   * id is already defined in the base User type, so we only add role
   */
  interface User {
    role?: string;
    defaultOrganizationId?: string;
  }
  
  /**
   * Extend the built-in Session type
   */
  interface Session extends DefaultSession {
    user?: {
      id: string;
      role?: string;
      defaultOrganizationId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    accessToken?: string;
    provider?: string;
    defaultOrganizationId?: string;
  }
}

// Import local modules with relative path from current file
import { verifyPassword } from "./password";
import { getUserByEmail } from "./data";
import { getUserOrganizations, createOrganization } from "@/lib/organizations/service";

/**
 * Helper function to create or update an integration in the database
 */
async function createOrUpdateIntegration(userId: string, provider: IntegrationType, accessToken: string, organizationId?: string) {
  try {
    // Check if the integration already exists
    const existingIntegrations = await db.select().from(integrations).where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.type, provider)
      )
    );
    
    const config = { accessToken };
    
    if (existingIntegrations.length > 0) {
      // Update the existing integration
      await db.update(integrations)
        .set({
          config,
          isActive: true,
          updatedAt: new Date(),
          organizationId: organizationId || existingIntegrations[0].organizationId
        })
        .where(eq(integrations.id, existingIntegrations[0].id));
      
      return existingIntegrations[0].id;
    } else {
      // Create a new integration
      const [newIntegration] = await db.insert(integrations)
        .values({
          userId,
          type: provider,
          name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Integration`,
          config,
          isActive: true,
          organizationId
        })
        .returning();
      
      return newIntegration.id;
    }
  } catch (error) {
    console.error(`Error creating/updating ${provider} integration:`, error);
    return null;
  }
}

/**
 * NextAuth configuration
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/auth/login",
    // Use newUser instead of signUp as per NextAuth v5 API
    newUser: "/auth/signup",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
  callbacks: {
    authorized({ auth, request }) {
      // Check if the user is authenticated for protected routes
      const isLoggedIn = !!auth?.user;
      const isProtected = 
        request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/chat") ||
        request.nextUrl.pathname.startsWith("/integrations") ||
        request.nextUrl.pathname.startsWith("/org");
      
      if (isProtected && !isLoggedIn) {
        return false;
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      // Add user role to the token
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.defaultOrganizationId = user.defaultOrganizationId;
      }
      
      // Add OAuth access token to the token
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        
        // For OAuth sign-ins, check if the user has an organization
        // We'll now handle organization creation in the complete-signup page
        if (token.id) {
          try {
            const organizations = await getUserOrganizations(token.id as string);
            
            // If user has organizations but no default, set the first one as default
            if (organizations.length > 0 && !token.defaultOrganizationId) {
              token.defaultOrganizationId = organizations[0].id;
            }
            
            // Create or update the integration in the database for OAuth providers
            if (account.provider === 'salesforce' || account.provider === 'hubspot') {
              await createOrUpdateIntegration(
                token.id as string,
                account.provider as IntegrationType,
                account.access_token as string,
                token.defaultOrganizationId as string | undefined
              );
            }
          } catch (error) {
            console.error("Error handling organizations during OAuth sign-in:", error);
          }
        }
      }
      
      return token;
    },
    session({ session, token }) {
      // Add user role and ID to the session
      if (token && session.user) {
        session.user.role = token.role;
        session.user.id = token.id as string; // Cast to string since we know it exists
        session.user.defaultOrganizationId = token.defaultOrganizationId;
      }
      
      return session;
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Salesforce({
      clientId: process.env.SALESFORCE_CLIENT_ID!,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "openid id profile email address phone full",
        }
      },
      // issuer: process.env.SALESFORCE_URL,
    }),
    HubSpot({
      clientId: process.env.HUBSPOT_CLIENT_ID!,
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "hello@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        // Validate credentials
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(8) })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;
        
        // Get user from database
        const user = await getUserByEmail(email);
        if (!user || !user.password) {
          return null;
        }
        
        // Verify password
        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
          return null;
        }
        
        // Check if user has organizations
        const organizations = await getUserOrganizations(user.id);
        let defaultOrgId: string | undefined = user.defaultOrganizationId || undefined;
        
        // If user has no organizations, create one
        if (organizations.length === 0) {
          try {
            const orgName = `${user.name || 'User'}'s Organization`;
            
            const org = await createOrganization({
              name: orgName,
              userId: user.id,
              billingEmail: user.email,
            });
            
            if (org) {
              defaultOrgId = org.id;
            }
          } catch (error) {
            console.error("Error creating organization during sign-in:", error);
          }
        } else if (organizations.length > 0 && !defaultOrgId) {
          // If user has organizations but no default, set the first one as default
          defaultOrgId = organizations[0].id;
        }
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          defaultOrganizationId: defaultOrgId,
        };
      },
    }),
  ],
}; 