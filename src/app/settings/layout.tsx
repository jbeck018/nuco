"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useOrganization } from "@/lib/organizations/context";
import { useUserOrganizations } from "@/hooks/useDashboard";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const { status } = useSession();
  const { organizations } = useUserOrganizations();
  const { currentOrganization, setCurrentOrganizationById } = useOrganization();
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(
    currentOrganization?.id
  );

  // Protect settings routes
  if (status === "unauthenticated") {
    redirect("/auth/login");
  }

  // Update selected org when current org changes
  useEffect(() => {
    if (currentOrganization?.id && currentOrganization.id !== selectedOrgId) {
      setSelectedOrgId(currentOrganization.id);
    }
  }, [currentOrganization, selectedOrgId]);

  // Custom organization change handler for settings
  const handleOrganizationChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    // Use the noRedirect option to prevent redirection
    setCurrentOrganizationById(orgId, { noRedirect: true });
  };

  const personalSettingsItems = [
    {
      title: "Profile",
      href: "/settings/profile",
      description: "Manage your personal information",
    },
  ];

  const orgSettingsItems = selectedOrgId ? [
    {
      title: "General",
      href: `/settings/organization/${selectedOrgId}/general`,
      description: "Manage organization details",
    },
    {
      title: "Members",
      href: `/settings/organization/${selectedOrgId}/members`,
      description: "Manage team members",
    },
    {
      title: "Billing",
      href: `/settings/organization/${selectedOrgId}/billing`,
      description: "Manage subscription and billing",
    },
    // {
    //   title: "Integrations",
    //   href: `/settings/organization/${selectedOrgId}/integrations`,
    //   description: "Manage connected services",
    // },
  ] : [];

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="md:w-72">
          <div className="sticky top-8">
            <div className="mb-6 px-4">
              <h2 className="text-xl font-bold">Settings</h2>
              <p className="text-sm text-muted-foreground">
                Manage your account and organizations
              </p>
            </div>

            <nav className="flex flex-col space-y-6 rounded-lg border bg-card shadow-sm">
              {/* Personal Settings Section */}
              <div className="p-4">
                <h3 className="mb-3 font-medium text-sm uppercase tracking-wider text-muted-foreground">Personal Settings</h3>
                <div className="flex flex-col -mx-2">
                  {personalSettingsItems.map((item) => {
                    const isActive = pathname === item.href;
                    
                    return (
                      <Button
                        key={item.href}
                        variant={isActive ? "default" : "ghost"}
                        className={cn(
                          "justify-start h-auto py-3 px-3 mb-1 rounded-md",
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        )}
                        asChild
                      >
                        <Link href={item.href}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{item.title}</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              {item.description}
                            </span>
                          </div>
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Organization Settings Section */}
              <div className="p-4">
                <h3 className="mb-3 font-medium text-sm uppercase tracking-wider text-muted-foreground">Organization Settings</h3>
                <div className="mb-4 bg-accent/50 p-3 rounded-md">
                  {organizations && organizations.length > 0 ? (
                    <Select
                      value={selectedOrgId}
                      onValueChange={(value) => handleOrganizationChange(value)}
                      disabled={!organizations.length}
                    >
                      <SelectTrigger className="w-full border-accent-foreground/20">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No organizations found
                    </p>
                  )}
                </div>

                {selectedOrgId && (
                  <div className="flex flex-col -mx-2">
                    {orgSettingsItems.map((item) => {
                      const isActive = pathname === item.href;
                      
                      return (
                        <Button
                          key={item.href}
                          variant={isActive ? "default" : "ghost"}
                          className={cn(
                            "justify-start h-auto py-3 px-3 mb-1 rounded-md",
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-accent"
                          )}
                          asChild
                          disabled={!selectedOrgId}
                        >
                          <Link href={item.href}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{item.title}</span>
                              <span className="text-xs text-muted-foreground mt-1">
                                {item.description}
                              </span>
                            </div>
                          </Link>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </aside>
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
} 