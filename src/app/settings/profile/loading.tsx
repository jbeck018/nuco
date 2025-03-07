import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4 mb-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-3 w-64 mt-1" />
            </div>
            
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-3 w-64 mt-1" />
            </div>
            
            <div className="pt-4 flex justify-end">
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 