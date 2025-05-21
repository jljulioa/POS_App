
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, ShoppingCart, Users, Barcode, Bot, Settings, FileText } from 'lucide-react'; // Added FileText
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'Point of Sale', icon: Barcode },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/purchase-invoices', label: 'Purchase Invoices', icon: FileText }, // New Item
  { href: '/reordering', label: 'Smart Reordering', icon: Bot },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
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
    </SidebarMenu>
  );
}

    