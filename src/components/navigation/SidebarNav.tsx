
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, ShoppingCart, Users, Barcode, Bot, Settings, FileText, Tag, ArrowRightLeft, Landmark, UserCog, Archive } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar';

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'Point of Sale', icon: Barcode },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
  { href: '/categories', label: 'Manage Categories', icon: Tag },
  { href: '/sales', label: 'Sales Records', icon: ShoppingCart },
  { href: '/sales/reports', label: "Today's Report", icon: FileText},
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/purchase-invoices', label: 'Purchase Invoices', icon: FileText },
  { href: '/expenses', label: 'Expenses', icon: Landmark },
  { href: '/reordering', label: 'Smart Reordering', icon: Bot },
  { href: '/users', label: 'Manage Users', icon: UserCog },
];

// Example categories - in a real app, these might be fetched or configured
const exampleCategories = [
  { name: "Engine Parts", icon: Settings }, // Using Settings as a generic icon
  { name: "Lubricants", icon: FileText }, // Example icon
  { name: "Brakes", icon: Package }, // Example icon
  { name: "Riding Gear", icon: Users }, // Example icon
  { name: "Filters", icon: Archive },
  { name: "Electrical", icon: Barcode},
];


export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategoryFilter = searchParams.get('category');

  const isInventoryPathActive = pathname === '/inventory';
  const isCategoriesPathActive = pathname.startsWith('/categories');
  const isSettingsPathActive = pathname.startsWith('/settings');

  return (
    <SidebarMenu>
      {mainNavItems.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive}
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

      {/* Settings Menu */}
      <SidebarMenuItem>
        <Link href="/settings"> {/* Main Settings link now points to /settings */}
          <SidebarMenuButton
            // No asChild, Link renders the <a>, SidebarMenuButton renders its content
            isActive={isSettingsPathActive} // Active if on /settings or any sub-settings page
            className="justify-start"
            tooltip={{ children: 'Settings', side: 'right', align: 'center' }}
          >
            <Settings className="h-5 w-5" />
            <span className="group-data-[collapsible=icon]:hidden">Settings</span>
          </SidebarMenuButton>
        </Link>
        {/* No Submenu here anymore */}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
