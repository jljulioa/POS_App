
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For action buttons or other elements
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 pb-4 border-b border-border">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
          {description && <p className="text-md text-muted-foreground mt-1">{description}</p>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
