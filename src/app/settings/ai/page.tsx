"use client";

/**
 * AI Settings Page
 * 
 * This page provides a user interface for configuring AI preferences
 * including model selection, token limits, and context settings.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelSelector } from "@/components/ai/ModelSelector";
import { useAiPreferences } from "@/hooks/useAiPreferences";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/lib/organizations/context";
import { useRouter } from "next/navigation";
import { Key, TrendingUp } from "lucide-react";

export default function AiSettingsPage() {
  const { preferences, updateMaxTokens, updateContextSettings, isLoading } = useAiPreferences();
  const { currentOrganization } = useOrganization();
  const [maxTokens, setMaxTokens] = useState(preferences?.maxTokensPerRequest || 2000);
  const router = useRouter();
  
  const handleMaxTokensChange = (value: number[]) => {
    setMaxTokens(value[0]);
  };
  
  const handleMaxTokensCommit = async () => {
    await updateMaxTokens(maxTokens);
  };
  
  const handleContextSettingChange = async (setting: string, value: boolean) => {
    if (!preferences?.contextSettings) return;
    
    const updatedSettings = {
      ...preferences.contextSettings,
      [setting]: value,
    };
    
    await updateContextSettings(updatedSettings);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Model Settings</CardTitle>
          <CardDescription>
            Configure your AI model preferences for all chats.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Default AI Model</h3>
            <p className="text-sm text-muted-foreground">
              Select the default AI model to use for all your chats.
              You can override this setting in individual chats.
            </p>
            <div className="pt-2">
              <ModelSelector isOrganizationSetting={true} />
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium">Maximum Tokens</h3>
            <p className="text-sm text-muted-foreground">
              Set the maximum number of tokens to use per request.
              Higher values allow for longer responses but may increase costs.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="max-tokens">Max Tokens: {maxTokens}</Label>
              </div>
              <Slider
                id="max-tokens"
                min={100}
                max={4000}
                step={100}
                value={[maxTokens]}
                onValueChange={handleMaxTokensChange}
                onValueCommit={handleMaxTokensCommit}
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium">Context Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure how the AI uses context in conversations.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-history">Include User History</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow the AI to reference your previous conversations.
                  </p>
                </div>
                <Switch
                  id="include-history"
                  checked={preferences?.contextSettings?.includeUserHistory ?? true}
                  onCheckedChange={(checked) => handleContextSettingChange('includeUserHistory', checked)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-org-data">Include Organization Data</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow the AI to reference your organization&apos;s data.
                  </p>
                </div>
                <Switch
                  id="include-org-data"
                  checked={preferences?.contextSettings?.includeOrganizationData ?? true}
                  onCheckedChange={(checked) => handleContextSettingChange('includeOrganizationData', checked)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>API Tokens & Usage</CardTitle>
          <CardDescription>
            Manage custom API tokens and monitor your token usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can use your own API tokens for AI providers or set usage limits for your organization.
            This helps you control costs and manage your AI usage more effectively.
          </p>
          
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">Custom API Tokens</h3>
              <p className="text-xs text-muted-foreground">
                Use your own OpenAI, Anthropic, or Google API tokens
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                if (currentOrganization?.id) {
                  router.push(`/settings/organization/${currentOrganization.id}/api-tokens`);
                } else {
                  router.push('/settings/organization');
                }
              }}
            >
              <Key className="mr-2 h-4 w-4" />
              Manage Tokens
            </Button>
          </div>
          
          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">Token Usage Limits</h3>
              <p className="text-xs text-muted-foreground">
                Set monthly token usage limits for your organization
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                if (currentOrganization?.id) {
                  router.push(`/settings/organization/${currentOrganization.id}/api-tokens`);
                } else {
                  router.push('/settings/organization');
                }
              }}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Manage Limits
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 