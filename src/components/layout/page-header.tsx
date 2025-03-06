/**
 * PageHeader Component
 * 
 * A reusable page header component that displays a heading and optional subheading.
 * Used across various pages for consistent layout and styling.
 */
import React from 'react';

interface PageHeaderProps {
  heading: string;
  subheading?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ heading, subheading, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {subheading && (
          <p className="text-muted-foreground mt-1">{subheading}</p>
        )}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
} 