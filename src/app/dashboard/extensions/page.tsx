"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Download, Settings, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/dashboard/empty-placeholder";

interface Extension {
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
  isActive: boolean;
  isSystem: boolean;
  installationSource: string;
}

// Mock data for extensions (in a real app, this would come from an API)
const mockExtensions: Extension[] = [
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
    isActive: true,
    isSystem: false,
    installationSource: "marketplace",
  },
  {
    id: "core-extensions",
    name: "Core Extensions",
    description: "Core extensions for the Nuco platform.",
    version: "1.0.0",
    type: "api",
    author: {
      name: "Nuco Team",
      email: "team@nuco.dev",
    },
    isActive: true,
    isSystem: true,
    installationSource: "system",
  }
];

export default function ExtensionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [extensions, setExtensions] = useState<Extension[]>(mockExtensions);
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // In a real app, this would fetch from an API
  useEffect(() => {
    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      setExtensions(mockExtensions);
      setLoading(false);
    }, 500);
  }, []);

  const toggleExtension = async (id: string, isActive: boolean) => {
    try {
      // In a real app, this would be a real API call
      // Simulate API call with timeout
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Update the local state
      setExtensions(extensions.map(ext => 
        ext.id === id ? { ...ext, isActive: !isActive } : ext
      ));
      
      toast({
        title: `Extension ${isActive ? "disabled" : "enabled"}`,
        description: `Successfully ${isActive ? "disabled" : "enabled"} the extension.`,
      });
    } catch (err) {
      toast({
        title: "Action failed",
        description: `Failed to ${isActive ? "disable" : "enable"} the extension. Please try again.`,
        variant: "destructive",
      });
      console.error(`Error ${isActive ? "disabling" : "enabling"} extension:`, err);
    }
  };

  const uninstallExtension = async (id: string) => {
    if (!confirm("Are you sure you want to uninstall this extension? This action cannot be undone.")) {
      return;
    }
    
    try {
      // In a real app, this would be a real API call
      // Simulate API call with timeout
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Remove from local state
      setExtensions(extensions.filter(ext => ext.id !== id));
      
      toast({
        title: "Extension uninstalled",
        description: "The extension has been successfully uninstalled.",
      });
    } catch (err) {
      toast({
        title: "Uninstall failed",
        description: "Failed to uninstall the extension. Please try again.",
        variant: "destructive",
      });
      console.error("Error uninstalling extension:", err);
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
    <>
      <DashboardHeader
        heading="Extensions"
        text="Manage your installed extensions and discover new ones from the marketplace."
      >
        <Button onClick={() => router.push("/dashboard/extensions/marketplace")}>
          <Download className="mr-2 h-4 w-4" />
          Marketplace
        </Button>
      </DashboardHeader>
      
      <div className="grid gap-8">
        <Tabs defaultValue="installed" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="installed">Installed</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          
          <TabsContent value="installed" className="mt-6">
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
            ) : extensions.filter(ext => !ext.isSystem).length === 0 ? (
              <EmptyPlaceholder>
                <EmptyPlaceholder.Icon name="plugin" />
                <EmptyPlaceholder.Title>No extensions installed</EmptyPlaceholder.Title>
                <EmptyPlaceholder.Description>
                  You haven&apos;t installed any extensions yet. Visit the marketplace to discover extensions.
                </EmptyPlaceholder.Description>
                <Button onClick={() => router.push("/dashboard/extensions/marketplace")}>
                  Browse Marketplace
                </Button>
              </EmptyPlaceholder>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {extensions
                  .filter(ext => !ext.isSystem)
                  .map(extension => (
                    <Card key={extension.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{extension.name}</CardTitle>
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
                          {extension.description || "No description provided."}
                        </p>
                      </CardContent>
                      <CardFooter className="flex items-center justify-between p-4">
                        <div className="flex items-center">
                          <Switch
                            checked={extension.isActive}
                            onCheckedChange={() => toggleExtension(extension.id, extension.isActive)}
                            id={`toggle-${extension.id}`}
                          />
                          <label
                            htmlFor={`toggle-${extension.id}`}
                            className="ml-2 text-sm font-medium"
                          >
                            {extension.isActive ? "Enabled" : "Disabled"}
                          </label>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push(`/dashboard/extensions/${extension.id}/settings`)}
                          >
                            <Settings className="h-4 w-4" />
                            <span className="sr-only">Settings</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => uninstallExtension(extension.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Uninstall</span>
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="system" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="ml-2">Loading system extensions...</span>
              </div>
            ) : extensions.filter(ext => ext.isSystem).length === 0 ? (
              <EmptyPlaceholder>
                <EmptyPlaceholder.Icon name="plugin" />
                <EmptyPlaceholder.Title>No system extensions</EmptyPlaceholder.Title>
                <EmptyPlaceholder.Description>
                  There are no system extensions installed.
                </EmptyPlaceholder.Description>
              </EmptyPlaceholder>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {extensions
                  .filter(ext => ext.isSystem)
                  .map(extension => (
                    <Card key={extension.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{extension.name}</CardTitle>
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
                          {extension.description || "No description provided."}
                        </p>
                      </CardContent>
                      <CardFooter className="flex items-center justify-between p-4">
                        <div className="flex items-center">
                          <Switch
                            checked={extension.isActive}
                            onCheckedChange={() => toggleExtension(extension.id, extension.isActive)}
                            id={`toggle-${extension.id}`}
                          />
                          <label
                            htmlFor={`toggle-${extension.id}`}
                            className="ml-2 text-sm font-medium"
                          >
                            {extension.isActive ? "Enabled" : "Disabled"}
                          </label>
                        </div>
                        <div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push(`/dashboard/extensions/${extension.id}/settings`)}
                          >
                            <Settings className="h-4 w-4" />
                            <span className="sr-only">Settings</span>
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
} 