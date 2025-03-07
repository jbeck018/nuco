"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc/router";
import { useTRPCClient } from "@/lib/trpc/trpc";

// Define types for organization data
type RouterOutputs = inferRouterOutputs<AppRouter>;
type Organization = NonNullable<RouterOutputs["organization"]["getById"]>;
type OrganizationList = RouterOutputs["organization"]["getAll"];

interface OrganizationContextType {
  organizations: OrganizationList | undefined;
  currentOrganization: Organization | undefined;
  isLoading: boolean;
  error: Error | null;
  setCurrentOrganizationBySlug: (slug: string, options?: { noRedirect?: boolean }) => Promise<void>;
  setCurrentOrganizationById: (id: string, options?: { noRedirect?: boolean }) => Promise<void>;
  refreshOrganizations: () => Promise<OrganizationList>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function useOrganization() {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Use the context if available
  const context = useContext(OrganizationContext);
  
  // Provide a fallback when used outside of the OrganizationProvider
  if (context === undefined) {
    // Only warn in browser environment to avoid SSR warnings
    if (isBrowser) {
      console.warn("useOrganization was used outside of an OrganizationProvider. Using fallback values.");
    }
    
    return {
      organizations: [],
      currentOrganization: undefined,
      isLoading: false,
      error: null,
      setCurrentOrganizationBySlug: async (slug: string) => {
        if (isBrowser) {
          console.warn(`setCurrentOrganizationBySlug(${slug}) called outside of OrganizationProvider`);
        }
      },
      setCurrentOrganizationById: async (id: string) => {
        if (isBrowser) {
          console.warn(`setCurrentOrganizationById(${id}) called outside of OrganizationProvider`);
        }
      },
      refreshOrganizations: async () => {
        if (isBrowser) {
          console.warn("refreshOrganizations called outside of OrganizationProvider");
        }
        return [];
      }
    } as OrganizationContextType;
  }
  
  return context;
}

interface OrganizationProviderProps {
  children: React.ReactNode;
  initialOrganizationSlug?: string;
}

export function OrganizationProvider({
  children,
  initialOrganizationSlug,
}: OrganizationProviderProps) {
  const [organizations, setOrganizations] = useState<OrganizationList | undefined>(undefined);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const trpcClient = useTRPCClient();

  // Fetch all organizations for the current user
  const fetchOrganizations = useCallback(async (): Promise<OrganizationList> => {
    try {
      setIsLoading(true);
      
      // Use TRPC client instead of fetch
      const orgs = await trpcClient.organization.getAll.query();
      
      setOrganizations(orgs);
      return orgs;
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err instanceof Error ? err : new Error("Failed to fetch organizations"));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [trpcClient]);

  // Set the current organization by slug
  const setCurrentOrganizationBySlug = async (
    slug: string, 
    options?: { noRedirect?: boolean }
  ): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Use TRPC client instead of fetch
      const org = await trpcClient.organization.getBySlug.query({ slug });
      
      setCurrentOrganization(org);
      
      // Only redirect if not in the settings page and noRedirect is not set
      if (!options?.noRedirect && pathname && !pathname.includes('/settings/')) {
        router.push(`/org/${slug}`);
      }
    } catch (err) {
      console.error(`Error fetching organization by slug ${slug}:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to fetch organization with slug: ${slug}`));
    } finally {
      setIsLoading(false);
    }
  };

  // Set the current organization by ID
  const setCurrentOrganizationById = async (
    id: string,
    options?: { noRedirect?: boolean }
  ): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Use TRPC client instead of fetch
      const org = await trpcClient.organization.getById.query({ id });
      
      setCurrentOrganization(org);
      
      // Only redirect if not in the settings page and noRedirect is not set
      if (!options?.noRedirect && pathname && !pathname.includes('/settings/')) {
        router.push(`/org/${org.slug}`);
      }
    } catch (err) {
      console.error(`Error fetching organization by id ${id}:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to fetch organization with id: ${id}`));
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh organizations list
  const refreshOrganizations = async (): Promise<OrganizationList> => {
    const orgs = await fetchOrganizations();
    
    // If we have a current organization, refresh its data
    if (currentOrganization) {
      try {
        const refreshedOrg = await trpcClient.organization.getById.query({ id: currentOrganization.id });
        setCurrentOrganization(refreshedOrg);
      } catch (err) {
        // If the current organization no longer exists or user lost access, reset it
        console.error(`Error refreshing current organization:`, err);
        setCurrentOrganization(undefined);
      }
    }
    
    return orgs;
  };

  // Initial load of organizations
  useEffect(() => {
    // Skip initialization if already done
    if (isInitialized) return;
    
    const loadInitialData = async () => {
      try {
        const orgs = await fetchOrganizations();
        
        // If an initial organization slug is provided, load that organization
        if (initialOrganizationSlug && orgs.length > 0) {
          try {
            const org = await trpcClient.organization.getBySlug.query({ slug: initialOrganizationSlug });
            setCurrentOrganization(org);
          } catch (err) {
            console.error(`Error fetching initial organization:`, err);
            // If the specified organization doesn't exist or user doesn't have access,
            // fall back to the first organization in the list
            if (orgs.length > 0) {
              try {
                const firstOrg = await trpcClient.organization.getById.query({ id: orgs[0].id });
                setCurrentOrganization(firstOrg);
              } catch (firstOrgErr) {
                console.error(`Error fetching first organization:`, firstOrgErr);
              }
            }
          }
        } else if (orgs.length > 0) {
          // If no initial slug is provided, use the first organization
          try {
            const firstOrg = await trpcClient.organization.getById.query({ id: orgs[0].id });
            setCurrentOrganization(firstOrg);
          } catch (err) {
            console.error(`Error fetching first organization:`, err);
          }
        }
      } catch (err) {
        console.error(`Error loading initial data:`, err);
      } finally {
        setIsInitialized(true);
      }
    };
    
    loadInitialData();
  }, [initialOrganizationSlug, fetchOrganizations, isInitialized, trpcClient]);

  // Provide the organization context
  const contextValue: OrganizationContextType = {
    organizations,
    currentOrganization,
    isLoading,
    error,
    setCurrentOrganizationBySlug,
    setCurrentOrganizationById,
    refreshOrganizations,
  };

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
} 