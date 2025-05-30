
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, ShoppingCart, Users, Barcode, Bot, Settings, FileText, Archive, Tag, ArrowRightLeft, Landmark, UserCog } from 'lucide-react';
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

const settingsNavItems = [
  { href: '/settings/invoice', label: 'Invoice', icon: FileText },
  // Add other settings sub-items here if needed
];

export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrlCategory = searchParams.get('category');

  const isSettingsPathActive = pathname.startsWith('/settings');

  return (
    <SidebarMenu>
      {mainNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
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
      ))}

      {/* Settings Menu */}
      <SidebarMenuItem>
        <Link href="/settings/invoice" passHref legacyBehavior>
          <SidebarMenuButton
            asChild
            isSub // Keep isSub for submenu toggle behavior
            isActive={isSettingsPathActive}
            className="justify-start"
            tooltip={{ children: 'Settings', side: 'right', align: 'center' }}
          >
            <a>
              <Settings className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">Settings</span>
            </a>
          </SidebarMenuButton>
        </Link>
        <SidebarMenuSub className={cn(!isSettingsPathActive && "hidden")}>
          {settingsNavItems.map((subItem) => (
            <SidebarMenuSubItem key={subItem.href}>
              <Link href={subItem.href} passHref legacyBehavior>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname === subItem.href}
                >
                  <a>
                    <subItem.icon className="mr-2 h-4 w-4" />
                    {subItem.label}
                  </a>
                </SidebarMenuSubButton>
              </Link>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
