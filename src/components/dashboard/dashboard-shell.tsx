import { ReactNode } from 'react';

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {children}
    </div>
  );
} 