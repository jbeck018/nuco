/**
 * ApiTokenManagement.tsx
 * 
 * A component for managing custom API tokens for AI providers
 * and configuring token usage limits for the organization.
 */
'use client';

import { useState, useEffect } from 'react';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { AlertCircle, Info, Key, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatNumber } from '@/lib/utils';

interface ApiTokenManagementProps {
  organizationId: string;
}

export function ApiTokenManagement({ organizationId }: ApiTokenManagementProps) {
  // Local state for token inputs
  const [openaiToken, setOpenaiToken] = useState('');
  const [anthropicToken, setAnthropicToken] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [tokenLimit, setTokenLimit] = useState(1000000); // Default 1M tokens
  
  // Get organization settings
  const { 
    settings, 
    isLoading, 
    error, 
    setCustomTokens,
    setUseCustomTokens,
    setTokenUsageLimit,
    aiSettings
  } = useOrganizationSettings(organizationId);
  
  // When settings load, update the local state
  useEffect(() => {
    if (aiSettings?.customTokens) {
      setOpenaiToken(aiSettings.customTokens.openai || '');
      setAnthropicToken(aiSettings.customTokens.anthropic || '');
      setGoogleToken(aiSettings.customTokens.google || '');
    }
    
    if (aiSettings?.usageLimit?.monthlyTokenLimit) {
      setTokenLimit(aiSettings.usageLimit.monthlyTokenLimit);
    }
  }, [aiSettings]);
  
  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
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
  
  // Calculate token usage percentage
  const currentUsage = aiSettings?.usageLimit?.currentMonthUsage || 0;
  const usageLimit = aiSettings?.usageLimit?.monthlyTokenLimit || 1000000;
  const usagePercentage = Math.min(Math.round((currentUsage / usageLimit) * 100), 100);
  
  // Handle saving OpenAI token
  const handleSaveOpenAIToken = () => {
    setCustomTokens({ openai: openaiToken });
  };
  
  // Handle saving Anthropic token
  const handleSaveAnthropicToken = () => {
    setCustomTokens({ anthropic: anthropicToken });
  };
  
  // Handle saving Google token
  const handleSaveGoogleToken = () => {
    setCustomTokens({ google: googleToken });
  };
  
  // Handle toggling custom tokens
  const handleToggleCustomTokens = (enabled: boolean) => {
    setUseCustomTokens(enabled);
  };
  
  // Handle updating token limit
  const handleTokenLimitChange = (values: number[]) => {
    setTokenLimit(values[0]);
  };
  
  // Handle saving token limit
  const handleSaveTokenLimit = () => {
    setTokenUsageLimit({ monthlyTokenLimit: tokenLimit });
  };
  
  return (
    <div className="space-y-6">
      {/* Custom API Tokens */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom API Tokens</CardTitle>
              <CardDescription>
                Use your own API tokens for AI providers instead of the platform&apos;s shared tokens
              </CardDescription>
            </div>
            <Switch 
              checked={aiSettings?.useCustomTokens || false}
              onCheckedChange={handleToggleCustomTokens}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!aiSettings?.useCustomTokens && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Using Platform Tokens</AlertTitle>
              <AlertDescription>
                You are currently using the platform&apos;s shared API tokens. Enable custom tokens to use your own.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            {/* OpenAI Token */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="openai-token" className="flex items-center">
                  <Key className="mr-2 h-4 w-4" /> OpenAI API Token
                </Label>
                <Badge variant="outline" className="ml-2">
                  {openaiToken ? 'Configured' : 'Not Set'}
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Input 
                  id="openai-token"
                  value={openaiToken} 
                  onChange={(e) => setOpenaiToken(e.target.value)}
                  placeholder="sk-..."
                  type="password"
                  className="flex-1"
                  disabled={!aiSettings?.useCustomTokens}
                />
                <Button 
                  onClick={handleSaveOpenAIToken}
                  disabled={!aiSettings?.useCustomTokens}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your OpenAI API token will be used for GPT models. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">Get your API key</a>
              </p>
            </div>
            
            {/* Anthropic Token */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="anthropic-token" className="flex items-center">
                  <Key className="mr-2 h-4 w-4" /> Anthropic API Token
                </Label>
                <Badge variant="outline" className="ml-2">
                  {anthropicToken ? 'Configured' : 'Not Set'}
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Input 
                  id="anthropic-token"
                  value={anthropicToken} 
                  onChange={(e) => setAnthropicToken(e.target.value)}
                  placeholder="sk-ant-..."
                  type="password"
                  className="flex-1"
                  disabled={!aiSettings?.useCustomTokens}
                />
                <Button 
                  onClick={handleSaveAnthropicToken}
                  disabled={!aiSettings?.useCustomTokens}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your Anthropic API token will be used for Claude models. <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">Get your API key</a>
              </p>
            </div>
            
            {/* Google Token */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="google-token" className="flex items-center">
                  <Key className="mr-2 h-4 w-4" /> Google AI API Token
                </Label>
                <Badge variant="outline" className="ml-2">
                  {googleToken ? 'Configured' : 'Not Set'}
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Input 
                  id="google-token"
                  value={googleToken} 
                  onChange={(e) => setGoogleToken(e.target.value)}
                  placeholder="AIza..."
                  type="password"
                  className="flex-1"
                  disabled={!aiSettings?.useCustomTokens}
                />
                <Button 
                  onClick={handleSaveGoogleToken}
                  disabled={!aiSettings?.useCustomTokens}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your Google AI token will be used for Gemini models. <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="underline">Get your API key</a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Token Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage Limits</CardTitle>
          <CardDescription>
            Set monthly token usage limits for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Usage */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Current Monthly Usage</Label>
              <span className="text-sm font-medium">
                {formatNumber(currentUsage)} / {formatNumber(usageLimit)} tokens ({usagePercentage}%)
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Usage resets on the first day of each month. When you reach your limit, you&apos;ll need to increase it or wait until the next month.
            </p>
          </div>
          
          {/* Token Limit Slider */}
          <div className="space-y-2 pt-4">
            <div className="flex justify-between">
              <Label htmlFor="token-limit-slider">Monthly Token Limit</Label>
              <span className="text-sm text-muted-foreground">
                {formatNumber(tokenLimit)} tokens
              </span>
            </div>
            <Slider
              id="token-limit-slider"
              min={100000}
              max={10000000}
              step={100000}
              value={[tokenLimit]}
              onValueChange={handleTokenLimitChange}
              className="py-4"
            />
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveTokenLimit}>
                Update Limit
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {!aiSettings?.useCustomTokens ? (
                <>
                  When using platform tokens, you will be charged based on your token usage. 
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="ml-1 h-3 w-3 inline text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>
                          Token pricing varies by model. You&apos;ll be billed monthly based on your actual usage.
                          Using custom tokens will not count against your billing.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              ) : (
                <>
                  When using your own API tokens, you&apos;ll be billed directly by the provider.
                  We still track usage for monitoring purposes.
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 