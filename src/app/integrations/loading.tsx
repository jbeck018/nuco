import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

export default function IntegrationsLoading() {
  return (
    <div className="container max-w-5xl py-8">
      <PageHeader
        heading="Integrations"
        subheading="Connect your favorite tools and services"
      />
      
      {/* Integration categories */}
      <div className="flex gap-2 mb-6 mt-8 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
      
      {/* Search and filter */}
      <div className="flex gap-3 mb-8">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      
      {/* Integrations grid */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <div className="flex gap-1">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-[90%] mb-2" />
            <Skeleton className="h-4 w-[80%] mb-6" />
            
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      <div className="mt-8 flex justify-center">
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
} 