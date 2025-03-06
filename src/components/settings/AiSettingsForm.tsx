/**
 * AiSettingsForm.tsx
 * 
 * A form component for managing AI preferences, including model selection,
 * token limits, and contextual settings for AI interactions.
 */
import { useState } from 'react';
import { useAiPreferences } from '@/hooks/useAiPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Available AI models
const AI_MODELS = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', default: true },
  { id: 'gpt-4', name: 'GPT-4', default: false },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', default: false },
  { id: 'claude-2', name: 'Claude 2', default: false },
];

export function AiSettingsForm() {
  // Get AI preferences from the hook
  const { 
    preferences, 
    isLoading, 
    error,
    updateDefaultModel,
    updateMaxTokens,
    updateContextSettings,
    reset
  } = useAiPreferences();
  
  // Temporary state for slider (to avoid frequent updates)
  const [tokensValue, setTokensValue] = useState<number>(
    preferences?.maxTokensPerRequest || 2000
  );
  
  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[180px] w-full" />
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
          Failed to load AI preferences: {error.message}
        </AlertDescription>
      </Alert>
    );
  }
  
  const handleModelChange = (modelId: string) => {
    updateDefaultModel(modelId);
  };
  
  const handleTokensChange = (values: number[]) => {
    setTokensValue(values[0]);
  };
  
  const handleTokensCommit = () => {
    updateMaxTokens(tokensValue);
  };
  
  const handleContextSettingChange = (setting: string, value: boolean) => {
    switch (setting) {
      case 'includeUserHistory':
        updateContextSettings({ includeUserHistory: value });
        break;
      case 'includeOrganizationData':
        updateContextSettings({ includeOrganizationData: value });
        break;
    }
  };
  
  const handleContextWindowChange = (values: number[]) => {
    updateContextSettings({ contextWindowSize: values[0] });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Model Settings</CardTitle>
          <CardDescription>
            Configure which AI models and parameters to use for generating responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-select">Default AI Model</Label>
            <Select 
              value={preferences?.defaultModel || 'gpt-3.5-turbo'}
              onValueChange={handleModelChange}
            >
              <SelectTrigger id="model-select">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <Label htmlFor="tokens-slider">Maximum Tokens per Request</Label>
              <span className="text-sm text-muted-foreground">
                {tokensValue} tokens
              </span>
            </div>
            <Slider
              id="tokens-slider"
              min={500}
              max={8000}
              step={100}
              value={[tokensValue]}
              onValueChange={handleTokensChange}
              onValueCommit={handleTokensCommit}
              className="py-4"
            />
            <p className="text-xs text-muted-foreground">
              Controls the maximum length of AI-generated responses. Higher values allow for longer responses but use more resources.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Contextual AI Behavior</CardTitle>
          <CardDescription>
            Control how the AI uses context from your history and organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center">
                <Label htmlFor="user-history-switch">Include User History</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="ml-2 h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      When enabled, the AI will consider your recent conversation 
                      history to provide more contextually relevant responses.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                Allow AI to reference your past conversations
              </p>
            </div>
            <Switch
              id="user-history-switch"
              checked={preferences?.contextSettings?.includeUserHistory ?? true}
              onCheckedChange={(checked) => 
                handleContextSettingChange('includeUserHistory', checked)
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center">
                <Label htmlFor="org-data-switch">Include Organization Data</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="ml-2 h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      When enabled, the AI can access relevant organization-specific 
                      information to provide more tailored responses.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                Allow AI to access your organization&apos;s shared data
              </p>
            </div>
            <Switch
              id="org-data-switch"
              checked={preferences?.contextSettings?.includeOrganizationData ?? true}
              onCheckedChange={(checked) => 
                handleContextSettingChange('includeOrganizationData', checked)
              }
            />
          </div>
          
          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <Label htmlFor="context-window-slider">Context Window Size</Label>
              <span className="text-sm text-muted-foreground">
                {preferences?.contextSettings?.contextWindowSize || 10} messages
              </span>
            </div>
            <Slider
              id="context-window-slider"
              min={1}
              max={20}
              step={1}
              value={[preferences?.contextSettings?.contextWindowSize || 10]}
              onValueChange={handleContextWindowChange}
              className="py-4"
            />
            <p className="text-xs text-muted-foreground">
              Determines how many previous messages the AI will consider when generating responses.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end space-x-2 pt-2">
        <Button 
          variant="outline" 
          onClick={() => reset()}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
} 