
"use client";

import React from 'react'; // Added this line
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, ShoppingCart, Users, Barcode, Bot, Settings, FileText, Archive } from 'lucide-react'; // Added Archive
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar';

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'Point of Sale', icon: Barcode },
  { href: '/inventory', label: 'Inventory', icon: Package },
  // Categories will be inserted here
  { href: '/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/purchase-invoices', label: 'Purchase Invoices', icon: FileText },
  { href: '/reordering', label: 'Smart Reordering', icon: Bot },
];

const productCategories = [
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

  return (
    <SidebarMenu>
      {mainNavItems.map((item) => {
        if (item.href === '/inventory') {
          return (
            <React.Fragment key="inventory-and-categories">
              <SidebarMenuItem>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href && !currentUrlCategory} // Active only if no category is selected
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
              
              {/* Categories Section */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild={false}
                  isActive={pathname === '/inventory' && !!currentUrlCategory}
                  tooltip={{ children: "Product Categories", side: 'right', align: 'center' }}
                  className="justify-start"
                  // This button itself doesn't navigate but acts as a header for the sub-menu.
                  // We can disable pointer events if it's purely a visual header.
                  // style={{ pointerEvents: 'none' }} 
                >
                  <Archive className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">Categories</span>
                </SidebarMenuButton>
                <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                  {productCategories.map((category) => (
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
            </React.Fragment>
          );
        }
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href) && item.href !== '/inventory')}
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

