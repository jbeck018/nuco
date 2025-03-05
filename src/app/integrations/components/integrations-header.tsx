/**
 * Integrations Header Component
 * 
 * This component displays the page title and any success/error messages.
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface IntegrationsHeaderProps {
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Integrations header component
 */
export function IntegrationsHeader({ successMessage, errorMessage }: IntegrationsHeaderProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Nuco app with external services to extend its functionality.
        </p>
      </div>

      {successMessage && (
        <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
} 