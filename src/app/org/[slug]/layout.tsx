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
  return (
    <OrganizationProvider initialOrganizationSlug={params.slug}>
      {children}
    </OrganizationProvider>
  );
} 