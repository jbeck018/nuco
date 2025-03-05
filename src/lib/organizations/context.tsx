"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc/router";

// Define types for organization data
type RouterOutputs = inferRouterOutputs<AppRouter>;
type Organization = NonNullable<RouterOutputs["organization"]["getById"]>;
type OrganizationList = RouterOutputs["organization"]["getAll"];

interface OrganizationContextType {
  organizations: OrganizationList | undefined;
  currentOrganization: Organization | undefined;
  isLoading: boolean;
  error: Error | null;
  setCurrentOrganizationBySlug: (slug: string) => Promise<void>;
  setCurrentOrganizationById: (id: string) => Promise<void>;
  refreshOrganizations: () => Promise<OrganizationList>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
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

  // Fetch all organizations for the current user
  const fetchOrganizations = async (): Promise<OrganizationList> => {
    try {
      setIsLoading(true);
      
      // Use fetch directly to avoid tRPC client issues
      const response = await fetch('/api/trpc/organization.getAll');
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      
      const result = await response.json();
      const orgs = result.result.data.json as OrganizationList;
      
      setOrganizations(orgs);
      return orgs;
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err instanceof Error ? err : new Error("Failed to fetch organizations"));
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Set the current organization by slug
  const setCurrentOrganizationBySlug = async (slug: string) => {
    try {
      setIsLoading(true);
      
      // Use fetch directly to avoid tRPC client issues
      const response = await fetch(`/api/trpc/organization.getBySlug?input=${encodeURIComponent(JSON.stringify({ slug }))}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch organization with slug: ${slug}`);
      }
      
      const result = await response.json();
      const org = result.result.data.json as Organization;
      
      setCurrentOrganization(org);
      router.push(`/org/${slug}`);
    } catch (err) {
      console.error(`Error fetching organization by slug ${slug}:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to fetch organization with slug: ${slug}`));
    } finally {
      setIsLoading(false);
    }
  };

  // Set the current organization by ID
  const setCurrentOrganizationById = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Use fetch directly to avoid tRPC client issues
      const response = await fetch(`/api/trpc/organization.getById?input=${encodeURIComponent(JSON.stringify({ id }))}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch organization with id: ${id}`);
      }
      
      const result = await response.json();
      const org = result.result.data.json as Organization;
      
      setCurrentOrganization(org);
      router.push(`/org/${org.slug}`);
    } catch (err) {
      console.error(`Error fetching organization by id ${id}:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to fetch organization with id: ${id}`));
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh organizations list
  const refreshOrganizations = async () => {
    const orgs = await fetchOrganizations();
    
    // If we have a current organization, refresh its data
    if (currentOrganization) {
      try {
        const response = await fetch(`/api/trpc/organization.getById?input=${encodeURIComponent(JSON.stringify({ id: currentOrganization.id }))}`);
        if (!response.ok) {
          throw new Error(`Failed to refresh organization with id: ${currentOrganization.id}`);
        }
        
        const result = await response.json();
        const refreshedOrg = result.result.data.json as Organization;
        
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
    const loadInitialData = async () => {
      const orgs = await fetchOrganizations();
      
      // If an initial organization slug is provided, load that organization
      if (initialOrganizationSlug && orgs.length > 0) {
        try {
          const response = await fetch(`/api/trpc/organization.getBySlug?input=${encodeURIComponent(JSON.stringify({ slug: initialOrganizationSlug }))}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch organization with slug: ${initialOrganizationSlug}`);
          }
          
          const result = await response.json();
          const org = result.result.data.json as Organization;
          
          setCurrentOrganization(org);
        } catch (err) {
          console.error(`Error fetching initial organization:`, err);
          // If the specified organization doesn't exist or user doesn't have access,
          // fall back to the first organization in the list
          if (orgs.length > 0) {
            try {
              const response = await fetch(`/api/trpc/organization.getById?input=${encodeURIComponent(JSON.stringify({ id: orgs[0].id }))}`);
              if (!response.ok) {
                throw new Error(`Failed to fetch organization with id: ${orgs[0].id}`);
              }
              
              const result = await response.json();
              const firstOrg = result.result.data.json as Organization;
              
              setCurrentOrganization(firstOrg);
            } catch (err) {
              console.error(`Error fetching fallback organization:`, err);
              // Ignore errors here, we'll just have no current organization
            }
          }
        }
      } else if (orgs.length > 0) {
        // If no initial slug is provided, use the first organization
        try {
          const response = await fetch(`/api/trpc/organization.getById?input=${encodeURIComponent(JSON.stringify({ id: orgs[0].id }))}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch organization with id: ${orgs[0].id}`);
          }
          
          const result = await response.json();
          const firstOrg = result.result.data.json as Organization;
          
          setCurrentOrganization(firstOrg);
        } catch (err) {
          console.error(`Error fetching first organization:`, err);
          // Ignore errors here, we'll just have no current organization
        }
      }
    };

    loadInitialData();
  }, [initialOrganizationSlug]);

  const value = {
    organizations,
    currentOrganization,
    isLoading,
    error,
    setCurrentOrganizationBySlug,
    setCurrentOrganizationById,
    refreshOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
} 