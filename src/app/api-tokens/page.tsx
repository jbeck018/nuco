"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Key, Plus, Trash2, Copy, Check, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface ApiToken {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export default function ApiTokensPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTokenName, setNewTokenName] = useState("");
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch API tokens
  useEffect(() => {
    const fetchTokens = async () => {
      if (!session?.user?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch("/api/user/api-tokens");
        
        if (!response.ok) {
          throw new Error("Failed to fetch API tokens");
        }
        
        const data = await response.json();
        setTokens(data);
      } catch (err) {
        console.error("Error fetching API tokens:", err);
        setError("Failed to load API tokens. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTokens();
  }, [session?.user?.id]);

  // Create a new API token
  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API token",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsCreatingToken(true);
      
      const response = await fetch("/api/user/api-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newTokenName }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create API token");
      }
      
      const data = await response.json();
      
      // Store the newly created token to display to the user
      setNewlyCreatedToken(data.token);
      
      // Add the new token to the list
      setTokens((prev) => [...prev, data]);
      
      // Reset the form
      setNewTokenName("");
      
      toast({
        title: "Success",
        description: "API token created successfully",
      });
    } catch (err) {
      console.error("Error creating API token:", err);
      toast({
        title: "Error",
        description: "Failed to create API token. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingToken(false);
    }
  };

  // Delete an API token
  const handleDeleteToken = async (tokenId: string) => {
    try {
      const response = await fetch(`/api/user/api-tokens/${tokenId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete API token");
      }
      
      // Remove the deleted token from the list
      setTokens((prev) => prev.filter((token) => token.id !== tokenId));
      
      toast({
        title: "Success",
        description: "API token deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting API token:", err);
      toast({
        title: "Error",
        description: "Failed to delete API token. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Copy token to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    
    setTimeout(() => {
      setCopySuccess(false);
    }, 2000);
    
    toast({
      title: "Copied!",
      description: "API token copied to clipboard",
    });
  };

  return (
    <div className="container max-w-5xl py-8">
      <PageHeader
        heading="API Tokens"
        subheading="Create and manage API tokens for programmatic access to the API"
      />
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="mt-8 space-y-6">
        {/* Create new token card */}
        <Card>
          <CardHeader>
            <CardTitle>Create New API Token</CardTitle>
            <CardDescription>
              Generate a new API token for programmatic access to the API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="token-name">Token Name</Label>
                <Input
                  id="token-name"
                  placeholder="Enter a name for your token"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => {
                  handleCreateToken();
                  setIsDialogOpen(true);
                }}
                disabled={isCreatingToken || !newTokenName.trim()}
              >
                {isCreatingToken ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Token
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Token display dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Your New API Token</DialogTitle>
              <DialogDescription>
                This token will only be shown once. Please copy it now and store it securely.
              </DialogDescription>
            </DialogHeader>
            
            {newlyCreatedToken && (
              <div className="mt-4">
                <div className="relative">
                  <Input
                    value={newlyCreatedToken}
                    readOnly
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => copyToClipboard(newlyCreatedToken)}
                  >
                    {copySuccess ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  For security reasons, we won&apos;t be able to show you this token again.
                </p>
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Existing tokens list */}
        <Card>
          <CardHeader>
            <CardTitle>Your API Tokens</CardTitle>
            <CardDescription>
              Manage your existing API tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : tokens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Key className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No API Tokens</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You haven&apos;t created any API tokens yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{token.name}</h4>
                        {token.expiresAt && new Date(token.expiresAt) < new Date() && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created: {format(new Date(token.createdAt), "PPP")}
                        {token.lastUsedAt && (
                          <> · Last used: {format(new Date(token.lastUsedAt), "PPP")}</>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteToken(token.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 