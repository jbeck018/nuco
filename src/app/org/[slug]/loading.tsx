import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationLoading() {
  return (
    <div className="container py-8">
      {/* Organization header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
      
      {/* Organization stats */}
      <div className="grid gap-4 grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 shadow-sm">
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
      
      {/* Organization content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
              {i % 2 === 0 && (
                <Skeleton className="h-6 w-16 ml-auto rounded-full" />
              )}
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-[90%] mb-2" />
            <Skeleton className="h-4 w-[80%] mb-4" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 