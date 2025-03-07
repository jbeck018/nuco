import { ReactNode } from "react";
import { OrganizationProvider } from "@/lib/organizations/context";

interface OrganizationLayoutProps {
  children: ReactNode;
  params: {
    slug: string;
  };
}

export default function OrganizationLayout({
  children,
  params,
}: OrganizationLayoutProps) {
  // Convert params.slug to a string to avoid the async params error
  const slugString = String(params.slug);
  
  return (
    <OrganizationProvider initialOrganizationSlug={slugString}>
      {children}
    </OrganizationProvider>
  );
} 