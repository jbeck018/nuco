"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Key, Plus, Trash2, Copy, Check, AlertCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogOverlay,
  DialogPortal
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface ApiToken {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

// Custom high z-index dialog components
const HighZIndexDialogOverlay = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) => (
  <DialogOverlay className={cn("z-[99]", className)} {...props} />
);

const HighZIndexDialogContent = ({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) => (
  <DialogPortal>
    <HighZIndexDialogOverlay />
    <DialogPrimitive.Content
      data-slot="dialog-content"
      className={cn(
        "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[100] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
);

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

  // Delete token confirmation
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
      
      // Open the dialog after token creation is complete
      setIsDialogOpen(true);
      
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

  // Confirm token deletion
  const confirmDeleteToken = (tokenId: string) => {
    setTokenToDelete(tokenId);
    setIsDeleteDialogOpen(true);
  };

  // Execute token deletion
  const executeDeleteToken = async () => {
    if (!tokenToDelete) return;
    
    await handleDeleteToken(tokenToDelete);
    setTokenToDelete(null);
    setIsDeleteDialogOpen(false);
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
                  // Don't open the dialog here, it will be opened after token creation
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
        
        {/* Token display dialog with higher z-index */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <HighZIndexDialogContent>
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
          </HighZIndexDialogContent>
        </Dialog>
        
        {/* Delete confirmation dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <HighZIndexDialogContent>
            <DialogHeader>
              <DialogTitle>Delete API Token</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this API token? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={executeDeleteToken}>
                Delete
              </Button>
            </DialogFooter>
          </HighZIndexDialogContent>
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
                      onClick={() => confirmDeleteToken(token.id)}
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