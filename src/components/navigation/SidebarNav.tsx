
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, ShoppingCart, Users, Barcode, Bot, Settings, FileText, Archive, Tag } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar';

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'Point of Sale', icon: Barcode },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/categories', label: 'Manage Categories', icon: Tag },
  { href: '/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/purchase-invoices', label: 'Purchase Invoices', icon: FileText },
  { href: '/reordering', label: 'Smart Reordering', icon: Bot },
];

export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrlCategory = searchParams.get('category');

  return (
    <SidebarMenu>
      {mainNavItems.map((item, index) => {
        // Regular menu items
        return (
          <SidebarMenuItem key={item.href || `item-${index}`}>
            <Link href={item.href!} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={
                  // Exact match for non-inventory, non-categories pages
                  (pathname === item.href && item.href !== '/inventory' && item.href !== '/categories') ||
                  // Inventory page active if path is /inventory AND no category filter
                  (pathname === '/inventory' && item.href === '/inventory' && !currentUrlCategory) ||
                  // Categories page active if path is /categories
                  (pathname === '/categories' && item.href === '/categories') ||
                  // For other parent routes like /customers/add, /inventory/add, etc.
                  (item.href !== "/" && pathname.startsWith(item.href!) && item.href !== '/inventory' && item.href !== '/categories')
                }
                tooltip={{ children: item.label, side: 'right', align: 'center' }}
                className="justify-start"
              >
                <a>
                  <item.icon className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
