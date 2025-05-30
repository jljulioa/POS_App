
"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const pathLabels: Record<string, string> = {
  pos: 'POS',
  inventory: 'Inventory',
  transactions: 'Transactions',
  categories: 'Categories',
  sales: 'Sales',
  reports: 'Reports',
  customers: 'Customers',
  'purchase-invoices': 'Purchase Invoices',
  expenses: 'Expenses',
  reordering: 'Smart Reordering',
  users: 'Users',
  settings: 'Settings',
  invoice: 'Invoice',
  add: 'Add',
  edit: 'Edit',
  import: 'Import',
  process: 'Process',
  // Add more specific labels here as needed, e.g.
  // "P123": "Product Detail" // This would require more logic to handle dynamic segments
};

// Function to capitalize first letter of each word
const capitalizeWords = (str: string) => {
  return str
    .replace(/-/g, ' ') // Replace hyphens with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean); // Remove empty strings from split

  if (segments.length === 0 && pathname === '/') { // Root path
    return <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>;
  }

  const breadcrumbItems = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    // Try to get a friendly label, fallback to capitalized segment
    let label = pathLabels[segment.toLowerCase()] || capitalizeWords(segment);
    
    // Basic check for UUID-like or numeric ID segments to avoid displaying them directly
    // A more robust solution would involve checking against known patterns or fetching data
    if (segment.match(/^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/) || 
        segment.match(/^P[0-9a-fA-F]+$/i) || // For product IDs like P123abc
        segment.match(/^C[0-9a-fA-F]+$/i) || // For customer IDs like C123
        segment.match(/^S[0-9a-fA-F]+$/i) || // For Sale IDs like S123
        segment.match(/^PI[0-9a-fA-F]+$/i) || // For Purchase Invoice IDs
        segment.match(/^T[0-9a-fA-F]+$/i) || // For Ticket IDs
        (segments[index-1] && (pathLabels[segments[index-1].toLowerCase()] === 'Edit' || pathLabels[segments[index-1].toLowerCase()] === 'Process')) && 
        (!pathLabels[segment.toLowerCase()]) // if previous was edit/process and current is not a known label, likely an ID
       ) {
      // If the previous segment was something like 'edit' or 'process', and this segment isn't a predefined label,
      // it's likely an ID. We can try to use the label of the parent or just a generic term.
      // For example, if path is /inventory/P123/edit, segment "P123" might not have a label.
      // For "edit" or "process", the label is already handled.
      // Let's try to be more specific for "edit" on the ID itself.
      if (segments[index+1] && segments[index+1].toLowerCase() === 'edit' && segments[index-1]) {
        label = `${capitalizeWords(segments[index-1])} Detail`; // e.g. "Inventory Detail"
      } else if (segments[index-1] && pathLabels[segments[index-1].toLowerCase()]) {
         label = capitalizeWords(segments[index-1]); // Try to use parent's label if it's an ID page
      } else {
        // Fallback for unknown dynamic segments if not handled above
        // label = "Detail"; 
      }
    }


    return { href, label, isCurrent: index === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-muted-foreground">
      {pathname !== '/' && (
        <>
          <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="mx-1 h-4 w-4 shrink-0" />
        </>
      )}
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.href}>
          {item.isCurrent ? (
            <span className="font-semibold text-foreground">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          )}
          {!item.isCurrent && index < breadcrumbItems.length - 1 && (
             <ChevronRight className="mx-1 h-4 w-4 shrink-0" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
