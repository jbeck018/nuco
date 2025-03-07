import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Chat header skeleton */}
      <div className="border-b p-4">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      {/* Chat messages area skeleton */}
      <div className="flex-1 overflow-auto p-4 space-y-8">
        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-lg bg-primary/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-[90%] mb-1" />
            <Skeleton className="h-4 w-[70%]" />
          </div>
        </div>
        
        {/* AI response */}
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg bg-muted p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-[95%] mb-1" />
            <Skeleton className="h-4 w-[85%]" />
          </div>
        </div>
        
        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-lg bg-primary/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
            <Skeleton className="h-4 w-[80%] mb-1" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </div>
        
        {/* AI thinking indicator */}
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg bg-muted p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse"></div>
              <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse delay-150"></div>
              <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse delay-300"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat input skeleton */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </div>
    </div>
  );
} 