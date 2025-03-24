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
    refreshToken?: string;
    provider?: string;
    defaultOrganizationId?: string;
    expiresAt?: number;
  }
}

// Import local modules with relative path from current file
import { verifyPassword } from "./password";
import { getUserByEmail } from "./data";
import { getUserOrganizations, createOrganization } from "@/lib/organizations/service";

/**
 * Helper function to create or update an integration in the database
 */
async function createOrUpdateIntegration(
  userId: string, 
  provider: IntegrationType, 
  accessToken: string, 
  organizationId?: string,
  refreshToken?: string,
  expiresAt?: number
) {
  try {
    // Check if the integration already exists
    const existingIntegrations = await db.select().from(integrations).where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.type, provider)
      )
    );
    
    const config = { 
      accessToken,
      refreshToken,
      expiresAt
    };
    
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
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : undefined;
        
        // For OAuth sign-ins, check if the user has an organization
        if (token.id) {
          try {
            const organizations = await getUserOrganizations(token.id as string);
            if (organizations.length > 0 && !token.defaultOrganizationId) {
              token.defaultOrganizationId = organizations[0].id;
            }
            
            // Create or update the integration in the database for OAuth providers
            if (account.provider === 'salesforce' || account.provider === 'hubspot') {
              await createOrUpdateIntegration(
                token.id as string,
                account.provider as IntegrationType,
                account.access_token as string,
                token.defaultOrganizationId as string | undefined,
                account.refresh_token as string | undefined,
                account.expires_at
              );
            }
          } catch (error) {
            console.error("Error handling organizations during OAuth sign-in:", error);
          }
        }
      }
      
      // Check if token needs refresh (including expired tokens)
      if (token.expiresAt && (Date.now() >= token.expiresAt - 5 * 60 * 1000 || Date.now() >= token.expiresAt)) {
        const startTime = Date.now();
        const refreshAttempt = {
          provider: token.provider,
          userId: token.id,
          timestamp: new Date().toISOString(),
          attemptNumber: 0,
          success: false,
          error: null as string | null,
          duration: 0,
          retryCount: 0,
        };

        try {
          let response;
          let retryCount = 0;
          const maxRetries = 3;
          const retryDelay = 1000; // 1 second

          while (retryCount < maxRetries) {
            refreshAttempt.attemptNumber++;
            refreshAttempt.retryCount = retryCount;
            
            try {
              if (token.provider === 'salesforce') {
                response = await fetch(`${process.env.SALESFORCE_URL}/services/oauth2/token`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: process.env.SALESFORCE_CLIENT_ID!,
                    client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
                    refresh_token: token.refreshToken as string,
                  }),
                });
              } else if (token.provider === 'hubspot') {
                response = await fetch('https://api.hubapi.com/oauth/v1/token', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: process.env.HUBSPOT_CLIENT_ID!,
                    client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
                    refresh_token: token.refreshToken as string,
                  }),
                });
              }

              if (!response) throw new Error('Invalid provider');

              const tokens = await response.json();

              if (!response.ok) {
                // Check if the error is due to an invalid refresh token
                if (tokens.error === 'invalid_grant' || tokens.error === 'invalid_token') {
                  refreshAttempt.error = `Invalid refresh token: ${tokens.error}`;
                  console.error('Token refresh monitoring:', {
                    ...refreshAttempt,
                    duration: Date.now() - startTime,
                  });
                  return { ...token, error: 'RefreshTokenExpired' };
                }
                throw tokens;
              }

              // Update token with new values
              token.accessToken = tokens.access_token;
              token.expiresAt = Date.now() + tokens.expires_in * 1000;

              // Update the integration in the database
              if (token.id && (token.provider === 'salesforce' || token.provider === 'hubspot')) {
                await createOrUpdateIntegration(
                  token.id,
                  token.provider as IntegrationType,
                  tokens.access_token,
                  token.defaultOrganizationId,
                  token.refreshToken,
                  Math.floor(Date.now() / 1000) + tokens.expires_in
                );
              }

              // Log successful refresh
              refreshAttempt.success = true;
              console.info('Token refresh monitoring:', {
                ...refreshAttempt,
                duration: Date.now() - startTime,
                newExpiry: new Date(token.expiresAt).toISOString(),
              });

              // Successfully refreshed, break the retry loop
              break;
            } catch (error) {
              retryCount++;
              refreshAttempt.error = error instanceof Error ? error.message : 'Unknown error';
              
              if (retryCount === maxRetries) {
                throw error;
              }
              
              // Log retry attempt
              console.warn('Token refresh monitoring - retry:', {
                ...refreshAttempt,
                duration: Date.now() - startTime,
              });
              
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
            }
          }
        } catch (error) {
          refreshAttempt.error = error instanceof Error ? error.message : 'Unknown error';
          console.error('Token refresh monitoring - final failure:', {
            ...refreshAttempt,
            duration: Date.now() - startTime,
          });
          // If we've exhausted all retries, mark the token as needing reauthorization
          return { ...token, error: 'RefreshAccessTokenError' };
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
          scope: "openid id profile email address phone full refresh_token",
        }
      },
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    HubSpot({
      clientId: process.env.HUBSPOT_CLIENT_ID!,
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "oauth contacts timeline crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write crm.objects.deals.read crm.objects.deals.write refresh_token",
        }
      },
      async profile(profile) {
        return {
          id: profile.id,
          name: profile.properties?.firstname ? `${profile.properties.firstname} ${profile.properties.lastname || ''}`.trim() : profile.email,
          email: profile.properties?.email || profile.email,
          image: profile.properties?.avatar,
        };
      },
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