
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
  // Categories will be inserted here by the logic below
  { href: '/categories', label: 'Manage Categories', icon: Tag }, // New link to manage categories
  { href: '/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/purchase-invoices', label: 'Purchase Invoices', icon: FileText },
  { href: '/reordering', label: 'Smart Reordering', icon: Bot },
];

// Static product categories for sidebar submenu, dynamic categories will be used in product forms
const productCategoriesForSidebar = [
  { name: 'Engine Parts', slug: 'Engine Parts' },
  { name: 'Lubricants', slug: 'Lubricants' },
  { name: 'Brakes', slug: 'Brakes' },
  { name: 'Riding Gear', slug: 'Riding Gear' },
  { name: 'Filters', slug: 'Filters' },
  { name: 'Electrical', slug: 'Electrical' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrlCategory = searchParams.get('category');

  // Insert "Product Categories" submenu after "Inventory"
  const inventoryItemIndex = mainNavItems.findIndex(item => item.href === '/inventory');
  const navItemsWithCategoriesSubmenu = [...mainNavItems];

  if (inventoryItemIndex !== -1) {
    const categoriesSubmenu = {
      isSubmenu: true,
      label: 'Product Categories', // This won't be displayed as a clickable link
      icon: Archive,
      subItems: productCategoriesForSidebar
    };
    navItemsWithCategoriesSubmenu.splice(inventoryItemIndex + 1, 0, categoriesSubmenu as any); // Insert after Inventory
  }


  return (
    <SidebarMenu>
      {navItemsWithCategoriesSubmenu.map((item, index) => {
        if (item.isSubmenu) { // Check for our custom submenu flag
          const subMenu = item as any; // Cast to access subItems
          return (
            <SidebarMenuItem key={`submenu-${subMenu.label}`}>
              <SidebarMenuButton
                asChild={false} // Not a link itself
                isActive={pathname === '/inventory' && !!currentUrlCategory} // Active if viewing inventory with any category
                tooltip={{ children: subMenu.label, side: 'right', align: 'center' }}
                className="justify-start"
              >
                <subMenu.icon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{subMenu.label}</span>
              </SidebarMenuButton>
              <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                {subMenu.subItems.map((category: { name: string; slug: string }) => (
                  <SidebarMenuSubItem key={category.slug}>
                    <Link href={`/inventory?category=${encodeURIComponent(category.slug)}`} passHref legacyBehavior>
                      <SidebarMenuSubButton
                        isActive={pathname === '/inventory' && currentUrlCategory === category.slug}
                      >
                        <span>{category.name}</span>
                      </SidebarMenuSubButton>
                    </Link>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </SidebarMenuItem>
          );
        }

        // Regular menu items
        return (
          <SidebarMenuItem key={item.href || `item-${index}`}>
            <Link href={item.href!} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={
                  (pathname === item.href && item.href !== '/inventory') || 
                  (pathname === '/inventory' && item.href === '/inventory' && !currentUrlCategory) ||
                  (item.href !== "/" && pathname.startsWith(item.href!) && item.href !== '/inventory' && item.href !== '/categories') ||
                  (item.href === '/categories' && pathname === '/categories')
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
