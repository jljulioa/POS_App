
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Barcode, Package, ShoppingCart, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  ctaLink?: string;
  ctaText?: string;
  colorClass?: string;
}

function StatCard({ title, value, icon: Icon, description, ctaLink, ctaText, colorClass = "text-primary" }: StatCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-6 w-6 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
        {ctaLink && ctaText && (
          <Button asChild variant="link" className="px-0 pt-2 text-sm text-accent hover:text-primary">
            <Link href={ctaLink}>
              {ctaText} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard 
            title="Start New Sale" 
            value="POS" 
            icon={Barcode} 
            description="Quickly process customer transactions."
            ctaLink="/pos"
            ctaText="Go to POS"
            colorClass="text-green-500"
          />
          <StatCard 
            title="Total Products" 
            value="1,250" 
            icon={Package}
            description="Current unique items in stock."
            ctaLink="/inventory"
            ctaText="View Inventory"
            colorClass="text-blue-500"
          />
          <StatCard 
            title="Today's Sales" 
            value="$2,350.80" 
            icon={ShoppingCart}
            description="+5.2% from yesterday"
            ctaLink="/sales"
            ctaText="View Sales Reports"
            colorClass="text-purple-500"
          />
          <StatCard 
            title="Active Customers" 
            value="320" 
            icon={Users}
            description="Customers with recent activity."
            ctaLink="/customers"
            ctaText="Manage Customers"
            colorClass="text-orange-500"
          />
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Access common tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="py-6 text-base">
              <Link href="/inventory/add">
                <Package className="mr-2 h-5 w-5" /> Add Product
              </Link>
            </Button>
            <Button asChild variant="outline" className="py-6 text-base">
              <Link href="/reordering">
                <Users className="mr-2 h-5 w-5" /> Smart Reorder
              </Link>
            </Button>
             <Button asChild variant="outline" className="py-6 text-base">
              <Link href="/sales/reports">
                <ShoppingCart className="mr-2 h-5 w-5" /> Sales Report
              </Link>
            </Button>
             <Button asChild variant="outline" className="py-6 text-base">
              <Link href="/customers/add">
                <Users className="mr-2 h-5 w-5" /> Add Customer
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
