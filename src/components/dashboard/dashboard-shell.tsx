import { ReactNode } from 'react';

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex-1 overflow-auto h-full">
      <div className="w-full h-full p-4 md:p-8">
        {children}
      </div>
    </div>
  );
} 