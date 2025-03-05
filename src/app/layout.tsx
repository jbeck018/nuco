import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { MainNav } from "@/components/navigation/main-nav";
import { SessionProvider } from "next-auth/react";
import { TRPCProvider } from "@/lib/trpc/provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nuco - AI-Powered CRM Integration",
  description: "Connect your CRM with AI to enhance customer interactions and boost productivity.",
  keywords: ["AI", "business", "integrations", "Salesforce", "HubSpot", "Google", "Slack"],
  authors: [{ name: "Nuco Team" }],
  creator: "Nuco",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nuco-app.vercel.app",
    title: "Nuco - AI-Powered Business Integrations",
    description: "Nuco provides AI-powered integrations with various business tools including Salesforce, HubSpot, Google, and Slack.",
    siteName: "Nuco",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nuco - AI-Powered Business Integrations",
    description: "Nuco provides AI-powered integrations with various business tools including Salesforce, HubSpot, Google, and Slack.",
    creator: "@nuco",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <TRPCProvider>
              <div className="flex min-h-screen flex-col">
                <MainNav />
                <main className="flex-1">{children}</main>
                <footer className="border-t py-6">
                  <div className="container mx-auto px-4">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                      <p className="text-center text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Nuco. All rights reserved.
                      </p>
                      <div className="flex items-center space-x-4">
                        <a
                          href="#"
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Terms
                        </a>
                        <a
                          href="#"
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Privacy
                        </a>
                        <a
                          href="#"
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Contact
                        </a>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
              <Toaster />
            </TRPCProvider>
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
