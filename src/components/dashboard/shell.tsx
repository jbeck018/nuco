import { ReactNode } from "react";

interface DashboardShellProps {
  children: ReactNode;
  className?: string;
}

export function DashboardShell({
  children,
  className,
}: DashboardShellProps) {
  return (
    <div className="flex-1 items-start md:grid md:gap-8 md:grid-cols-[1fr]">
      <main className={`flex flex-col flex-1 gap-4 p-4 md:gap-8 md:p-8 ${className}`}>
        {children}
      </main>
    </div>
  );
} 