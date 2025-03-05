"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart, Users, MessageSquare, Command, Bot, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Define types for analytics data
interface UsageSummary {
  totalEvents: number;
  totalUsers: number;
  totalChannels: number;
  commandsUsed: number;
  messagesProcessed: number;
  aiResponses: number;
}

interface AIPerformanceMetrics {
  averageResponseTime: number;
  averageFeedbackRating: number;
  totalResponses: number;
}

interface UserActivity {
  id: string;
  slackUserId: string;
  slackUserName: string | null;
  totalInteractions: number;
  commandsUsed: number;
  messagesReceived: number;
  messagesSent: number;
  reactionsReceived: number;
  lastActive: string | null;
}

interface ChannelActivity {
  id: string;
  slackChannelId: string;
  slackChannelName: string | null;
  totalInteractions: number;
  commandsUsed: number;
  messagesReceived: number;
  messagesSent: number;
  uniqueUsers: number;
}

interface EventCounts {
  [eventType: string]: number;
}

interface Integration {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  config: Record<string, unknown>;
}

export default function SlackAnalyticsDashboard() {
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");
  const [timePeriod, setTimePeriod] = useState<string>("month");
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [aiMetrics, setAIMetrics] = useState<AIPerformanceMetrics | null>(null);
  const [topUsers, setTopUsers] = useState<UserActivity[]>([]);
  const [topChannels, setTopChannels] = useState<ChannelActivity[]>([]);
  const [eventCounts, setEventCounts] = useState<EventCounts>({});
  
  // Fetch Slack integrations
  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/integrations?type=slack");
      
      if (!response.ok) {
        throw new Error("Failed to fetch integrations");
      }
      
      const data = await response.json();
      setIntegrations(data);
      
      // Select the first integration by default
      if (data.length > 0) {
        setSelectedIntegration(data[0].id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load Slack integrations",
      });
      setLoading(false);
    }
  }, [toast]);
  
  // Fetch analytics data for the selected integration
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch usage summary
      const summaryResponse = await fetch(
        `/api/slack/analytics/summary?integrationId=${selectedIntegration}&period=${timePeriod}`
      );
      
      if (!summaryResponse.ok) {
        throw new Error("Failed to fetch usage summary");
      }
      
      const summaryData = await summaryResponse.json();
      setUsageSummary(summaryData);
      
      // Fetch AI metrics
      const aiResponse = await fetch(
        `/api/slack/analytics/ai-metrics?integrationId=${selectedIntegration}&period=${timePeriod}`
      );
      
      if (!aiResponse.ok) {
        throw new Error("Failed to fetch AI metrics");
      }
      
      const aiData = await aiResponse.json();
      setAIMetrics(aiData);
      
      // Fetch top users
      const usersResponse = await fetch(
        `/api/slack/analytics/top-users?integrationId=${selectedIntegration}&limit=10`
      );
      
      if (!usersResponse.ok) {
        throw new Error("Failed to fetch top users");
      }
      
      const usersData = await usersResponse.json();
      setTopUsers(usersData);
      
      // Fetch top channels
      const channelsResponse = await fetch(
        `/api/slack/analytics/top-channels?integrationId=${selectedIntegration}&limit=10`
      );
      
      if (!channelsResponse.ok) {
        throw new Error("Failed to fetch top channels");
      }
      
      const channelsData = await channelsResponse.json();
      setTopChannels(channelsData);
      
      // Fetch event counts
      const eventsResponse = await fetch(
        `/api/slack/analytics/event-counts?integrationId=${selectedIntegration}&period=${timePeriod}`
      );
      
      if (!eventsResponse.ok) {
        throw new Error("Failed to fetch event counts");
      }
      
      const eventsData = await eventsResponse.json();
      setEventCounts(eventsData);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data",
      });
      setLoading(false);
    }
  }, [selectedIntegration, timePeriod, toast]);
  
  // Fetch integrations when component mounts
  useEffect(() => {
    if (status === "authenticated") {
      fetchIntegrations();
    } else if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router, fetchIntegrations]);
  
  // Fetch analytics data when integration or time period changes
  useEffect(() => {
    if (selectedIntegration) {
      fetchAnalyticsData();
    }
  }, [selectedIntegration, timePeriod, fetchAnalyticsData]);
  
  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Format time in milliseconds to readable format
  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  };
  
  // Format date string to readable format
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Never";
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Get friendly name for time period
  const getTimePeriodName = (period: string): string => {
    switch (period) {
      case "day":
        return "Last 24 Hours";
      case "week":
        return "Last 7 Days";
      case "month":
        return "Last 30 Days";
      case "year":
        return "Last 12 Months";
      case "all":
        return "All Time";
      default:
        return "Last 30 Days";
    }
  };
  
  // Get integration name by ID
  const getIntegrationName = (id: string): string => {
    const integration = integrations.find(i => i.id === id);
    return integration ? integration.name : "Unknown Integration";
  };
  
  // Render loading state
  if (loading && !usageSummary) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg">Loading analytics data...</p>
        </div>
      </div>
    );
  }
  
  // Render no integrations state
  if (integrations.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/integrations/slack")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Slack Analytics</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>No Slack Integrations</CardTitle>
            <CardDescription>
              You need to connect a Slack workspace to view analytics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/integrations/slack")}>
              Connect Slack Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/integrations/slack")}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Slack Analytics</h1>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/2">
          <label className="text-sm font-medium mb-2 block">
            Slack Workspace
          </label>
          <Select
            value={selectedIntegration}
            onValueChange={setSelectedIntegration}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a workspace" />
            </SelectTrigger>
            <SelectContent>
              {integrations.map((integration) => (
                <SelectItem key={integration.id} value={integration.id}>
                  {integration.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full md:w-1/2">
          <label className="text-sm font-medium mb-2 block">
            Time Period
          </label>
          <Select
            value={timePeriod}
            onValueChange={setTimePeriod}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">
          {getIntegrationName(selectedIntegration)} - {getTimePeriodName(timePeriod)}
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usageSummary && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatNumber(usageSummary.totalUsers)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Unique users interacting with the bot
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatNumber(usageSummary.messagesProcessed)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total messages processed
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <Command className="h-5 w-5 mr-2" />
                      Commands
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatNumber(usageSummary.commandsUsed)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total commands executed
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <Bot className="h-5 w-5 mr-2" />
                      AI Responses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatNumber(usageSummary.aiResponses)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total AI-generated responses
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <BarChart className="h-5 w-5 mr-2" />
                      Channels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatNumber(usageSummary.totalChannels)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Channels with bot activity
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <BarChart className="h-5 w-5 mr-2" />
                      Total Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatNumber(usageSummary.totalEvents)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total tracked events
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
            
            {aiMetrics && (
              <Card className="col-span-1 md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle>AI Performance Metrics</CardTitle>
                  <CardDescription>
                    Performance metrics for AI-generated responses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-lg font-medium mb-1">Average Response Time</h3>
                      <p className="text-2xl font-bold">
                        {formatTime(aiMetrics.averageResponseTime)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-1">Average Feedback Rating</h3>
                      <p className="text-2xl font-bold">
                        {aiMetrics.averageFeedbackRating.toFixed(1)} / 5
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-1">Total Responses</h3>
                      <p className="text-2xl font-bold">
                        {formatNumber(aiMetrics.totalResponses)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Top Users</TabsTrigger>
          <TabsTrigger value="channels">Top Channels</TabsTrigger>
          <TabsTrigger value="events">Event Breakdown</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Top Active Users</CardTitle>
              <CardDescription>
                Users with the most interactions with the bot
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : topUsers.length === 0 ? (
                <p className="text-center py-4">No user activity data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">User</th>
                        <th className="text-right py-2 px-4">Total Interactions</th>
                        <th className="text-right py-2 px-4">Commands</th>
                        <th className="text-right py-2 px-4">Messages</th>
                        <th className="text-right py-2 px-4">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUsers.map((user) => (
                        <tr key={user.id} className="border-b">
                          <td className="py-2 px-4">
                            {user.slackUserName || user.slackUserId}
                          </td>
                          <td className="text-right py-2 px-4">
                            {formatNumber(user.totalInteractions)}
                          </td>
                          <td className="text-right py-2 px-4">
                            {formatNumber(user.commandsUsed)}
                          </td>
                          <td className="text-right py-2 px-4">
                            {formatNumber(user.messagesReceived + user.messagesSent)}
                          </td>
                          <td className="text-right py-2 px-4">
                            {formatDate(user.lastActive)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>Top Active Channels</CardTitle>
              <CardDescription>
                Channels with the most bot activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : topChannels.length === 0 ? (
                <p className="text-center py-4">No channel activity data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Channel</th>
                        <th className="text-right py-2 px-4">Total Interactions</th>
                        <th className="text-right py-2 px-4">Commands</th>
                        <th className="text-right py-2 px-4">Messages</th>
                        <th className="text-right py-2 px-4">Unique Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topChannels.map((channel) => (
                        <tr key={channel.id} className="border-b">
                          <td className="py-2 px-4">
                            {channel.slackChannelName || channel.slackChannelId}
                          </td>
                          <td className="text-right py-2 px-4">
                            {formatNumber(channel.totalInteractions)}
                          </td>
                          <td className="text-right py-2 px-4">
                            {formatNumber(channel.commandsUsed)}
                          </td>
                          <td className="text-right py-2 px-4">
                            {formatNumber(channel.messagesReceived + channel.messagesSent)}
                          </td>
                          <td className="text-right py-2 px-4">
                            {formatNumber(channel.uniqueUsers)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Event Breakdown</CardTitle>
              <CardDescription>
                Distribution of different event types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : Object.keys(eventCounts).length === 0 ? (
                <p className="text-center py-4">No event data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Event Type</th>
                        <th className="text-right py-2 px-4">Count</th>
                        <th className="text-right py-2 px-4">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(eventCounts).map(([eventType, count]) => {
                        const total = Object.values(eventCounts).reduce((sum, c) => sum + c, 0);
                        const percentage = total > 0 ? (count / total) * 100 : 0;
                        
                        return (
                          <tr key={eventType} className="border-b">
                            <td className="py-2 px-4">{eventType}</td>
                            <td className="text-right py-2 px-4">
                              {formatNumber(count)}
                            </td>
                            <td className="text-right py-2 px-4">
                              {percentage.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 