import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 w-full max-w-md px-8">
        <Skeleton className="h-8 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-64 mx-auto mb-8" />
        
        <div className="w-full space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 w-full mt-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
} 