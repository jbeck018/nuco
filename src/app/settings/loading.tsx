import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div>
      <PageHeader
        heading="Settings"
        subheading="Manage your account and preferences"
      />
      
      <div className="mt-8 space-y-8">
        {/* Profile settings skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
        
        {/* Account preferences skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-4">
                <Skeleton className="h-10 w-32 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <div className="flex items-start space-x-3 space-y-0">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 