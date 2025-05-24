
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Barcode, Package, ShoppingCart, Users, ArrowRight, Loader2, AlertTriangle, FileText, Landmark, Bot } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  ctaLink?: string;
  ctaText?: string;
  colorClass?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

function StatCard({ title, value, icon: Icon, description, ctaLink, ctaText, colorClass = "text-primary", isLoading, isError, errorMessage }: StatCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Icon className={`h-6 w-6 ${colorClass}`} />}
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="text-destructive text-sm flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" /> Error
          </div>
        ) : isLoading ? (
          <div className="text-2xl sm:text-3xl font-bold text-muted-foreground">...</div>
        ) : (
          <div className="text-2xl sm:text-3xl font-bold">{value}</div>
        )}
        {description && !isError && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
        {errorMessage && isError && <p className="text-xs text-destructive pt-1">{errorMessage.substring(0,50)}...</p>}
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

const fetchProductStats = async (): Promise<{ totalProducts: number }> => {
  const res = await fetch('/api/products/stats');
  if (!res.ok) throw new Error('Failed to fetch product stats');
  return res.json();
};

const fetchSalesStats = async (): Promise<{ totalSalesAmount: number; totalSalesCount: number }> => {
  const res = await fetch('/api/sales/stats');
  if (!res.ok) throw new Error('Failed to fetch sales stats');
  return res.json();
};

const fetchCustomerStats = async (): Promise<{ totalCustomers: number }> => {
  const res = await fetch('/api/customers/stats');
  if (!res.ok) throw new Error('Failed to fetch customer stats');
  return res.json();
};


export default function DashboardPage() {
  const { data: productStats, isLoading: isLoadingProductStats, isError: isErrorProductStats, error: productStatsError } = useQuery({
    queryKey: ['productStats'],
    queryFn: fetchProductStats,
  });

  const { data: salesStats, isLoading: isLoadingSalesStats, isError: isErrorSalesStats, error: salesStatsError } = useQuery({
    queryKey: ['salesStats'],
    queryFn: fetchSalesStats,
  });

  const { data: customerStats, isLoading: isLoadingCustomerStats, isError: isErrorCustomerStats, error: customerStatsError } = useQuery({
    queryKey: ['customerStats'],
    queryFn: fetchCustomerStats,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
        
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            value={productStats?.totalProducts ?? 'N/A'}
            icon={Package}
            description="Current unique items in stock."
            ctaLink="/inventory"
            ctaText="View Inventory"
            colorClass="text-blue-500"
            isLoading={isLoadingProductStats}
            isError={isErrorProductStats}
            errorMessage={(productStatsError as Error)?.message}
          />
          <StatCard 
            title="Today's Sales" 
            value={`$${(salesStats?.totalSalesAmount ?? 0).toFixed(2)}`}
            icon={ShoppingCart}
            description={`${salesStats?.totalSalesCount ?? 0} transactions today`}
            ctaLink="/sales/reports"
            ctaText="View Today's Report"
            colorClass="text-purple-500"
            isLoading={isLoadingSalesStats}
            isError={isErrorSalesStats}
            errorMessage={(salesStatsError as Error)?.message}
          />
          <StatCard 
            title="Total Customers" 
            value={customerStats?.totalCustomers ?? 'N/A'}
            icon={Users}
            description="Total registered customers."
            ctaLink="/customers"
            ctaText="Manage Customers"
            colorClass="text-orange-500"
            isLoading={isLoadingCustomerStats}
            isError={isErrorCustomerStats}
            errorMessage={(customerStatsError as Error)?.message}
          />
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Access common tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="py-4 sm:py-6 text-sm sm:text-base">
              <Link href="/inventory/add">
                <Package className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Add Product
              </Link>
            </Button>
            <Button asChild variant="outline" className="py-4 sm:py-6 text-sm sm:text-base">
              <Link href="/reordering">
                <Bot className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Smart Reorder
              </Link>
            </Button>
             <Button asChild variant="outline" className="py-4 sm:py-6 text-sm sm:text-base">
              <Link href="/sales/reports">
                <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Sales Report
              </Link>
            </Button>
             <Button asChild variant="outline" className="py-4 sm:py-6 text-sm sm:text-base">
              <Link href="/customers/add">
                <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Add Customer
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
