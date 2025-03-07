import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApiTokensLoading() {
  return (
    <div className="container max-w-5xl py-8">
      <PageHeader
        heading="API Tokens"
        subheading="Create and manage API tokens for programmatic access to the API"
      />
      
      <div className="mt-8 space-y-6">
        {/* Create new token card skeleton */}
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
                <div className="flex items-center mb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-8 ml-2 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-3 w-64 mt-1" />
              </div>
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </CardContent>
        </Card>
        
        {/* Existing tokens list skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>Your API Tokens</CardTitle>
            <CardDescription>
              Manage your existing API tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-32" />
                      {i === 1 && <Skeleton className="h-5 w-16 rounded-full" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-4 w-24" />
                      {i !== 0 && (
                        <>
                          <Skeleton className="h-3 w-3 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </>
                      )}
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 