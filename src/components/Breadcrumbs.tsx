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
  reports: 'Reports & Tools',
  'sales-summary': 'Sales Summary',
  'barcode-products': 'Barcode Products',
  'inventory-adjustment': 'Inventory Adjustment',
  'inventory-adjustment-summary': 'Inventory Adjustment Summary',
  'top-selling-products': 'Top Selling Products',
  customers: 'Customers',
  'purchase-invoices': 'Purchase Invoices',
  expenses: 'Expenses',
  reordering: 'Smart Reordering',
  users: 'Users',
  settings: 'Settings',
  invoice: 'Invoice Settings',
  currency: 'Currency Settings',
  add: 'Add',
  edit: 'Edit',
  import: 'Import',
  process: 'Process',
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
    let label = pathLabels[segment.toLowerCase()] || capitalizeWords(segment);
    
    if (segment.match(/^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/) || 
        segment.match(/^P[0-9a-fA-F]+$/i) || 
        segment.match(/^C[0-9a-fA-F]+$/i) || 
        segment.match(/^S[0-9a-fA-F]+$/i) || 
        segment.match(/^PI[0-9a-fA-F]+$/i) || 
        segment.match(/^T[0-9a-fA-F]+$/i) || 
        (segments[index-1] && (pathLabels[segments[index-1].toLowerCase()] === 'Edit' || pathLabels[segments[index-1].toLowerCase()] === 'Process')) && 
        (!pathLabels[segment.toLowerCase()]) 
       ) {
      if (segments[index+1] && segments[index+1].toLowerCase() === 'edit' && segments[index-1]) {
        label = `${capitalizeWords(segments[index-1])} Detail`; 
      } else if (segments[index-1] && pathLabels[segments[index-1].toLowerCase()]) {
         label = capitalizeWords(segments[index-1]); 
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
