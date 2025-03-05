"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Define interface for integration data
interface Integration {
  id: string;
  type: string;
  userId: string;
  organizationId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  config: Record<string, unknown>;
}

export default function SlackIntegrationPage() {
  const { status } = useSession();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/integrations?type=slack");
      if (!response.ok) {
        throw new Error("Failed to fetch integrations");
      }
      const data = await response.json();
      setIntegrations(data);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load Slack integrations",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchIntegrations();
    }
  }, [fetchIntegrations, status]);

  const handleConnect = async () => {
    try {
      const response = await fetch("/api/slack/oauth/connect", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to initiate Slack connection");
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error connecting to Slack:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to Slack",
      });
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm("Are you sure you want to disconnect this Slack workspace?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to disconnect Slack");
      }
      
      toast({
        title: "Success",
        description: "Slack workspace disconnected successfully",
      });
      
      fetchIntegrations();
    } catch (error) {
      console.error("Error disconnecting Slack:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to disconnect Slack workspace",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Slack Integration</h1>
        <Button onClick={handleConnect}>
          Connect Slack Workspace
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>About Slack Integration</CardTitle>
            <CardDescription>
              Connect your Slack workspace to use the Nuco bot for AI chat and prompt templates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Features:</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Chat with AI directly from Slack using <code>/nuco chat</code> command</li>
                <li>Access and use your prompt templates with <code>/nuco templates</code></li>
                <li>Get help and information with <code>/nuco help</code></li>
              </ul>
              
              <h3 className="text-lg font-medium mt-4">Setup Instructions:</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Click the &quot;Connect Slack Workspace&quot; button above</li>
                <li>Authorize the Nuco app in Slack</li>
                <li>Once connected, invite the Nuco bot to your channels</li>
                <li>Start using the <code>/nuco</code> commands</li>
              </ol>
            </div>
          </CardContent>
          <CardFooter>
            <a 
              href="/docs/slack-integration.md" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-primary hover:underline"
            >
              View Documentation <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </CardFooter>
        </Card>
      </div>

      <h2 className="text-2xl font-bold mb-4">Connected Workspaces</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : integrations.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No connected workspaces</AlertTitle>
          <AlertDescription>
            You haven&apos;t connected any Slack workspaces yet. Click the &quot;Connect Slack Workspace&quot; button to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => {
            const config = integration.config as Record<string, string | number | boolean>;
            return (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{config.team_name || "Slack Workspace"}</CardTitle>
                    <Badge variant={integration.isActive ? "default" : "secondary"}>
                      {integration.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Connected on {new Date(integration.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Status:</span>
                      {integration.isActive ? (
                        <span className="flex items-center text-green-500">
                          <Check className="h-4 w-4 mr-1" /> Connected
                        </span>
                      ) : (
                        <span className="text-yellow-500">Inactive</span>
                      )}
                    </div>
                    {config.bot_user_id && (
                      <div>
                        <span className="font-medium mr-2">Bot User:</span>
                        <code>@{config.bot_user_id}</code>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(`https://${config.team_domain || "slack"}.slack.com`, "_blank")}
                  >
                    Open Workspace
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDisconnect(integration.id)}
                  >
                    Disconnect
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 