/**
 * Loading Spinner Component
 * 
 * A simple loading spinner component that can be used to indicate loading states.
 */

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Loading spinner component
 * @param props Component props
 * @returns A loading spinner component
 */
export function LoadingSpinner({
  className,
  size = 'md',
  ...props
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent',
        {
          'h-4 w-4': size === 'sm',
          'h-6 w-6': size === 'md',
          'h-8 w-8': size === 'lg',
        },
        'text-primary',
        className
      )}
      role="status"
      aria-label="loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
} 