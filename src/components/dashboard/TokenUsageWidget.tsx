'use client';

/**
 * TokenUsageWidget.tsx
 * 
 * A dashboard widget that displays token usage information for the organization.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/organizations/context';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { formatNumber } from '@/lib/utils';
import { TrendingUp, Key, AlertTriangle } from 'lucide-react';

export function TokenUsageWidget() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const { aiSettings, isLoading } = useOrganizationSettings(currentOrganization?.id || '');
  const [isNearLimit, setIsNearLimit] = useState(false);
  
  // Get token usage data
  const currentUsage = aiSettings?.usageLimit?.currentMonthUsage || 0;
  const usageLimit = aiSettings?.usageLimit?.monthlyTokenLimit || 1000000;
  const usagePercentage = Math.min(Math.round((currentUsage / usageLimit) * 100), 100);
  
  // Check if usage is near the limit (>80%)
  useEffect(() => {
    setIsNearLimit(usagePercentage > 80);
  }, [usagePercentage]);
  
  // Navigate to API tokens settings
  const handleManageTokens = () => {
    if (currentOrganization?.id) {
      router.push(`/settings/organization/${currentOrganization.id}/api-tokens`);
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
          <CardDescription>Loading usage data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[100px] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
        <CardDescription>
          {aiSettings?.useCustomTokens 
            ? 'Using your custom API tokens' 
            : 'Monthly platform token usage'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Usage Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {formatNumber(currentUsage)} / {formatNumber(usageLimit)} tokens
              </span>
              <span 
                className={`text-sm font-medium ${
                  usagePercentage > 90 
                    ? 'text-destructive' 
                    : usagePercentage > 75 
                      ? 'text-amber-500' 
                      : 'text-muted-foreground'
                }`}
              >
                {usagePercentage}%
              </span>
            </div>
            <Progress 
              value={usagePercentage} 
              className={`h-2 ${
                usagePercentage > 90 
                  ? 'bg-destructive/20' 
                  : usagePercentage > 75 
                    ? 'bg-amber-500/20' 
                    : ''
              }`}
            />
          </div>
          
          {/* Warning for high usage */}
          {isNearLimit && !aiSettings?.useCustomTokens && (
            <div className="rounded-md bg-amber-500/15 p-2 text-xs text-amber-600 dark:text-amber-400 flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>
                You&apos;re approaching your monthly token limit. Consider increasing your limit or using custom API tokens.
              </span>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col space-y-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={handleManageTokens}
            >
              {aiSettings?.useCustomTokens ? (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Manage Custom Tokens
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Increase Token Limit
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 