
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Barcode, Package, ShoppingCart, Users, ArrowRight, Loader2, AlertTriangle, FileText, Landmark, Bot, Archive, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext'; // Import useCurrency

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

const fetchLowStockStats = async (): Promise<{ totalLowStockItems: number }> => {
  const res = await fetch('/api/products/stats/lowstock');
  if (!res.ok) throw new Error('Failed to fetch low stock stats');
  return res.json();
};

const fetchOutOfStockStats = async (): Promise<{ totalOutOfStockItems: number }> => {
  const res = await fetch('/api/products/stats/outofstock');
  if (!res.ok) throw new Error('Failed to fetch out of stock stats');
  return res.json();
};

interface DailySalesSummary {
  date: string; // Formatted "MMM d"
  name: string; // Formatted "EEE"
  revenue: number;
  cogs: number; 
  profit: number;
}

const fetchDailySalesSummary = async (): Promise<DailySalesSummary[]> => {
  const res = await fetch('/api/sales/stats/daily-summary');
  if (!res.ok) throw new Error('Failed to fetch daily sales summary');
  return res.json();
};

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-2))",
  },
  cogs: { 
    label: "COGS",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const { formatCurrency } = useCurrency(); // Use currency context

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

  const { data: lowStockStats, isLoading: isLoadingLowStockStats, isError: isErrorLowStockStats, error: lowStockStatsError } = useQuery({
    queryKey: ['lowStockStats'],
    queryFn: fetchLowStockStats,
  });

  const { data: outOfStockStats, isLoading: isLoadingOutOfStockStats, isError: isErrorOutOfStockStats, error: outOfStockStatsError } = useQuery({
    queryKey: ['outOfStockStats'],
    queryFn: fetchOutOfStockStats,
  });
  
  const { data: dailySalesSummary, isLoading: isLoadingDailySummary, isError: isErrorDailySummary, error: dailySummaryError } = useQuery<DailySalesSummary[], Error>({
    queryKey: ['dailySalesSummary'],
    queryFn: fetchDailySalesSummary,
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
            value={salesStats?.totalSalesAmount !== undefined ? formatCurrency(salesStats.totalSalesAmount) : 'N/A'}
            icon={ShoppingCart}
            description={`${salesStats?.totalSalesCount ?? 0} transactions today`}
            ctaLink="/reports/sales-summary?period=today"
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
          <StatCard
            title="Low Stock Items"
            value={lowStockStats?.totalLowStockItems ?? 'N/A'}
            icon={AlertTriangle}
            description="Items needing reorder soon."
            ctaLink="/inventory?status=low_stock"
            ctaText="View Low Stock"
            colorClass="text-yellow-500"
            isLoading={isLoadingLowStockStats}
            isError={isErrorLowStockStats}
            errorMessage={(lowStockStatsError as Error)?.message}
          />
          <StatCard
            title="Out of Stock Items"
            value={outOfStockStats?.totalOutOfStockItems ?? 'N/A'}
            icon={Archive}
            description="Items currently unavailable."
            ctaLink="/inventory?status=out_of_stock"
            ctaText="View Out of Stock"
            colorClass="text-red-500"
            isLoading={isLoadingOutOfStockStats}
            isError={isErrorOutOfStockStats}
            errorMessage={(outOfStockStatsError as Error)?.message}
          />
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-6 w-6 text-primary" />
              Last 5 Days Sales Performance
            </CardTitle>
            <CardDescription>Revenue, COGS, and Profit for {dailySalesSummary && dailySalesSummary.length > 0 ? `${dailySalesSummary[0].date} - ${dailySalesSummary[dailySalesSummary.length - 1].date}` : 'the last 5 days'}.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDailySummary && (
              <div className="flex justify-center items-center h-[350px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            )}
            {isErrorDailySummary && (
              <div className="flex flex-col justify-center items-center h-[350px] text-destructive">
                <AlertTriangle className="h-10 w-10 mb-2" />
                <p>Failed to load sales performance data.</p>
                <p className="text-xs">{(dailySummaryError as Error)?.message}</p>
              </div>
            )}
            {!isLoadingDailySummary && !isErrorDailySummary && dailySalesSummary && (
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <BarChart accessibilityLayer data={dailySalesSummary} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name" 
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value, index) => {
                      const item = dailySalesSummary[index];
                      return item ? item.name : value; 
                    }}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value).replace(/\.\d{2}$/, '')} // Basic strip decimals
                    tickLine={false}
                    axisLine={false}
                    tickMargin={5}
                  />
                   <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label, payload) => {
                           const item = dailySalesSummary.find(d => d.name === label);
                           return item ? `${item.date} (${item.name})` : label;
                        }}
                        formatter={(value, name) => (
                          <div className="flex items-center">
                            <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartConfig[name as keyof typeof chartConfig]?.color }} />
                            <span>{chartConfig[name as keyof typeof chartConfig]?.label}: {formatCurrency(Number(value))}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                  <Bar dataKey="cogs" fill="var(--color-cogs)" radius={4} /> 
                  <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

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
              <Link href="/reports/sales-summary">
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
