import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface IntegrationStats {
  total: number;
  active: number;
}

interface RecentChat {
  id: string;
  title: string;
  timestamp: string;
  preview: string;
}

interface OrganizationDetails {
  id: string;
  name: string;
  role: string;
  members: number;
}

interface DashboardCardsProps {
  integrationStats: IntegrationStats;
  recentChats: RecentChat[];
  organizationDetails: OrganizationDetails;
}

export function DashboardCards({
  integrationStats,
  recentChats,
  organizationDetails,
}: DashboardCardsProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Your connected services</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{integrationStats.total}</p>
            <p className="text-sm text-muted-foreground">
              {integrationStats.active} active
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/integrations">Manage Integrations</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Organization</CardTitle>
            <CardDescription>Your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{organizationDetails.name}</p>
            <p className="text-sm text-muted-foreground">
              with {organizationDetails.members} members
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/org/${organizationDetails.id}`}>View Organization</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{recentChats.length}</p>
            <p className="text-sm text-muted-foreground">
              recent conversations
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/chat">View Chats</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Chats</CardTitle>
            <CardDescription>Your most recent conversations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentChats.length > 0 ? (
              recentChats.map((chat) => (
                <div key={chat.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{chat.title}</p>
                    <p className="text-sm text-muted-foreground">{chat.preview}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(chat.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No recent chats found</p>
              </div>
            )}
            <Button asChild variant="outline" className="w-full mt-2">
              <Link href="/chat">View All Chats</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>Your workspace information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-muted-foreground">{organizationDetails.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Your Role</p>
              <p className="text-muted-foreground capitalize">{organizationDetails.role}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Members</p>
              <p className="text-muted-foreground">{organizationDetails.members} total members</p>
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex w-full gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/org/${organizationDetails.id}/settings`}>Organization Settings</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href={`/org/${organizationDetails.id}/invite`}>Invite Members</Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 