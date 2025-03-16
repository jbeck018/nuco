import { ReactNode } from 'react';

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex-1 overflow-auto h-full">
      <div className="w-full h-full pt-4 pb-2 px-4 md">
        {children}
      </div>
    </div>
  );
} 