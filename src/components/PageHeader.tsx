
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For action buttons or other elements
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 pb-4 border-border">
      <div className="flex flex-col gap-4 sm:flex-row items-start sm:items-center justify-between">
        <div className="flex-grow">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h2>
          {description && <p className="text-sm sm:text-md text-muted-foreground mt-1">{description}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
