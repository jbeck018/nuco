"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ArrowLeft, Download, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyPlaceholder } from "@/components/dashboard/empty-placeholder";

interface MarketplaceExtension {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  isVerified: boolean;
  downloadCount: string;
  rating: string;
  iconUrl?: string;
}

// Mock data for the marketplace (in a real app, this would come from an API)
const mockMarketplaceExtensions: MarketplaceExtension[] = [
  {
    id: "slack-analytics",
    name: "Slack Analytics",
    description: "Advanced analytics for Slack integration with custom dashboards and reports.",
    version: "1.0.0",
    type: "slack",
    author: {
      name: "Nuco Team",
      email: "team@nuco.dev",
    },
    isVerified: true,
    downloadCount: "1.2k",
    rating: "4.8",
    iconUrl: "/icons/slack-analytics.svg",
  },
  {
    id: "salesforce-connector",
    name: "Salesforce Connector",
    description: "Enhanced Salesforce integration with custom object support and real-time sync.",
    version: "1.1.0",
    type: "salesforce",
    author: {
      name: "Nuco Team",
      email: "team@nuco.dev",
    },
    isVerified: true,
    downloadCount: "980",
    rating: "4.6",
    iconUrl: "/icons/salesforce-connector.svg",
  },
  {
    id: "chrome-assistant",
    name: "Chrome Assistant",
    description: "Browser extension that provides AI assistance while browsing the web.",
    version: "0.9.0",
    type: "chrome",
    author: {
      name: "Web Tools Inc.",
      email: "support@webtools.com",
    },
    isVerified: false,
    downloadCount: "450",
    rating: "4.2",
    iconUrl: "/icons/chrome-assistant.svg",
  },
  {
    id: "api-gateway",
    name: "API Gateway",
    description: "Create custom API endpoints for your Nuco instance with rate limiting and auth.",
    version: "1.2.0",
    type: "api",
    author: {
      name: "API Solutions",
      email: "info@apisolutions.io",
    },
    isVerified: true,
    downloadCount: "2.3k",
    rating: "4.9",
    iconUrl: "/icons/api-gateway.svg",
  },
  {
    id: "data-visualizer",
    name: "Data Visualizer",
    description: "Create beautiful charts and graphs from your integration data.",
    version: "1.0.2",
    type: "api",
    author: {
      name: "DataViz Pro",
      email: "support@datavizpro.com",
    },
    isVerified: false,
    downloadCount: "780",
    rating: "4.4",
    iconUrl: "/icons/data-visualizer.svg",
  },
];

export default function MarketplacePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>(mockMarketplaceExtensions);
  const [filteredExtensions, setFilteredExtensions] = useState<MarketplaceExtension[]>(mockMarketplaceExtensions);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, this would fetch from an API
    // fetchMarketplaceExtensions();
    setExtensions(mockMarketplaceExtensions);
    setFilteredExtensions(mockMarketplaceExtensions);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredExtensions(extensions);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = extensions.filter(
        (ext) =>
          ext.name.toLowerCase().includes(query) ||
          ext.description.toLowerCase().includes(query) ||
          ext.type.toLowerCase().includes(query) ||
          ext.author.name.toLowerCase().includes(query)
      );
      setFilteredExtensions(filtered);
    }
  }, [searchQuery, extensions]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const installExtension = async (extension: MarketplaceExtension) => {
    try {
      setInstalling(extension.id);
      
      // In a real app, this would be a real API call
      // Simulate API call with timeout
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Create a manifest from the marketplace extension
      const manifest = {
        name: extension.name,
        version: extension.version,
        description: extension.description,
        type: extension.type,
        author: extension.author,
        entryPoints: {
          main: "./src/index.js",
          settings: "./src/settings.js",
        },
        permissions: [],
        settings: {
          configurable: true,
          schema: {
            apiKey: {
              type: "string",
              description: "API Key for the service",
              required: false,
            },
            enableFeature: {
              type: "boolean",
              description: "Enable this feature",
              default: true,
            },
          },
        },
        hooks: [],
      };
      
      // Make the API call to install the extension
      const response = await fetch("/api/extensions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manifest,
          source: "marketplace",
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to install extension");
      }
      
      toast({
        title: "Extension installed",
        description: `${extension.name} has been successfully installed.`,
      });
      
      // Navigate to the extensions page
      router.push("/dashboard/extensions");
    } catch (err) {
      toast({
        title: "Installation failed",
        description: "Failed to install the extension. Please try again.",
        variant: "destructive",
      });
      console.error("Error installing extension:", err);
    } finally {
      setInstalling(null);
    }
  };

  const getExtensionTypeColor = (type: string) => {
    switch (type) {
      case "slack":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "chrome":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "salesforce":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300";
      case "api":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Extension Marketplace"
        text="Discover and install extensions to enhance your Nuco experience."
      >
        <Button variant="outline" onClick={() => router.push("/dashboard/extensions")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Extensions
        </Button>
      </DashboardHeader>
      
      <div className="grid gap-8">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            type="search"
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full"
          />
          <Button type="submit" size="icon" variant="ghost">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span className="ml-2">Loading extensions...</span>
          </div>
        ) : filteredExtensions.length === 0 ? (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="plugin" />
            <EmptyPlaceholder.Title>No extensions found</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              No extensions match your search criteria. Try a different search term.
            </EmptyPlaceholder.Description>
            <Button onClick={() => setSearchQuery("")}>Clear Search</Button>
          </EmptyPlaceholder>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredExtensions.map((extension) => (
              <Card key={extension.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {extension.name}
                        {extension.isVerified && (
                          <span className="ml-2 text-blue-500" title="Verified by Nuco">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        v{extension.version} by {extension.author.name}
                      </CardDescription>
                    </div>
                    <Badge className={getExtensionTypeColor(extension.type)}>
                      {extension.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {extension.description}
                  </p>
                  <div className="mt-4 flex items-center text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4 text-yellow-500 mr-1"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {extension.rating}
                    </div>
                    <div className="mx-2">•</div>
                    <div>{extension.downloadCount} downloads</div>
                  </div>
                </CardContent>
                <Separator />
                <CardFooter className="p-4">
                  <Button
                    className="w-full"
                    onClick={() => installExtension(extension)}
                    disabled={installing === extension.id}
                  >
                    {installing === extension.id ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Install
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
} 