/**
 * TokenLimitExceededModal.tsx
 * 
 * A modal component that is shown when the organization's token usage limit is exceeded.
 * It provides options to increase the limit or use custom API tokens.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Key, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';
import { useOrganization } from '@/lib/organizations/context';

interface TokenLimitExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsage: number;
  usageLimit: number;
}

export function TokenLimitExceededModal({
  isOpen,
  onClose,
  currentUsage,
  usageLimit,
}: TokenLimitExceededModalProps) {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleIncreaseLimit = () => {
    setIsRedirecting(true);
    if (currentOrganization) {
      router.push(`/settings/organization/${currentOrganization.id}/api-tokens`);
    } else {
      router.push('/settings/organization');
    }
  };

  const handleUseCustomTokens = () => {
    setIsRedirecting(true);
    if (currentOrganization) {
      router.push(`/settings/organization/${currentOrganization.id}/api-tokens`);
    } else {
      router.push('/settings/organization');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            Token Usage Limit Exceeded
          </DialogTitle>
          <DialogDescription>
            Your organization has reached its monthly token usage limit.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Usage:</span>
            <span className="text-sm">{formatNumber(currentUsage)} tokens</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Monthly Limit:</span>
            <span className="text-sm">{formatNumber(usageLimit)} tokens</span>
          </div>

          <div className="rounded-md bg-muted p-4 text-sm">
            <p>
              You have two options to continue using AI features:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Increase your monthly token limit</li>
              <li>Use your own API tokens instead of the platform&apos;s</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleUseCustomTokens}
            disabled={isRedirecting}
          >
            <Key className="mr-2 h-4 w-4" />
            Use Custom Tokens
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={handleIncreaseLimit}
            disabled={isRedirecting}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Increase Limit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 