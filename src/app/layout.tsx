"use client";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { MainNav } from "@/components/navigation/main-nav";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { ClientProviders } from "@/components/providers/client-providers";

const inter = Inter({ subsets: ["latin"] });

// Define routes that use the organization context
const isDashboardRoute = (pathname: string) => 
  pathname.startsWith('/dashboard') || 
  pathname.startsWith('/chat') || 
  pathname.startsWith('/settings') || 
  pathname.startsWith('/integrations') ||
  pathname.startsWith('/org');

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.className} h-full`}>
        <ClientProviders>
          <AuthWrapper>
            <MainNav>
              {children}
            </MainNav>
          </AuthWrapper>
          <Toaster />
        </ClientProviders>
        <Analytics />
      </body>
    </html>
  );
}
