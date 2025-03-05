/**
 * OrganizationSettingsForm.tsx
 * 
 * A component for managing organization settings using the useOrganizationSettings hook.
 * This demonstrates how to use the metadata hooks in a real-world scenario.
 */
'use client';

import { useState, useEffect } from 'react';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface OrganizationSettingsFormProps {
  organizationId: string;
}

export function OrganizationSettingsForm({ organizationId }: OrganizationSettingsFormProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  
  const { 
    settings, 
    isLoading, 
    error, 
    setMemberDefaultRole,
    setDefaultIntegrations,
    setSlackNotifications,
    setSlackWebhookUrl,
  } = useOrganizationSettings(organizationId);
  
  // When settings load, update the local state
  useEffect(() => {
    if (settings?.slackSettings?.webhookUrl) {
      setWebhookUrl(settings.slackSettings.webhookUrl);
    }
  }, [settings]);
  
  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }
  
  // If error, show error message
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error.message || "Failed to load organization settings"}
        </AlertDescription>
      </Alert>
    );
  }
  
  const handleSaveWebhook = () => {
    setSlackWebhookUrl(webhookUrl);
  };
  
  const handleToggleIntegration = (integrationId: string) => {
    const currentIntegrations = settings?.defaultIntegrations || [];
    const isEnabled = currentIntegrations.includes(integrationId);
    
    if (isEnabled) {
      setDefaultIntegrations(currentIntegrations.filter(id => id !== integrationId));
    } else {
      setDefaultIntegrations([...currentIntegrations, integrationId]);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Member Role Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Member Default Role</CardTitle>
          <CardDescription>
            Set the default role for new members joining your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            defaultValue={settings?.memberDefaultRole || 'member'} 
            onValueChange={setMemberDefaultRole}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {/* Default Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Default Integrations</CardTitle>
          <CardDescription>
            Select which integrations should be enabled by default for new members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">HubSpot</h4>
              <p className="text-sm text-muted-foreground">
                Enable HubSpot integration by default
              </p>
            </div>
            <Switch 
              checked={settings?.defaultIntegrations?.includes('hubspot')}
              onCheckedChange={() => handleToggleIntegration('hubspot')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Slack</h4>
              <p className="text-sm text-muted-foreground">
                Enable Slack integration by default
              </p>
            </div>
            <Switch 
              checked={settings?.defaultIntegrations?.includes('slack')}
              onCheckedChange={() => handleToggleIntegration('slack')}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Slack Integration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Slack Integration</CardTitle>
          <CardDescription>
            Configure Slack notifications and webhooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="webhook-url" className="text-sm font-medium">
              Webhook URL
            </label>
            <div className="flex space-x-2">
              <Input 
                id="webhook-url"
                value={webhookUrl} 
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="flex-1"
              />
              <Button onClick={handleSaveWebhook}>Save</Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4">
            <div>
              <h4 className="font-medium">New Member Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Send a notification when a new member joins
              </p>
            </div>
            <Switch 
              checked={settings?.slackSettings?.notifyOnNewMembers}
              onCheckedChange={(checked) => setSlackNotifications({ notifyOnNewMembers: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Integration Change Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Send a notification when integrations are updated
              </p>
            </div>
            <Switch 
              checked={settings?.slackSettings?.notifyOnIntegrationChanges}
              onCheckedChange={(checked) => setSlackNotifications({ notifyOnIntegrationChanges: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 