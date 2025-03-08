import { ReactNode } from "react";
import { OrganizationProvider } from "@/lib/organizations/context";

interface OrganizationLayoutProps {
  children: ReactNode;
  params: Promise<{
    slug: string;
  }>;
}

export default async function OrganizationLayout(props: OrganizationLayoutProps) {
  const params = await props.params;
  // Convert params.slug to a string to avoid the async params error
  const slugString = String(params.slug);
  
  return (
    <OrganizationProvider initialOrganizationSlug={slugString}>
      {props.children}
    </OrganizationProvider>
  );
} 