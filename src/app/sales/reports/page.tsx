
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Sale, SaleItem } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Loader2, AlertTriangle, ShoppingCart } from 'lucide-react';
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// API fetch function for today's sales
const fetchTodaysSales = async (): Promise<Sale[]> => {
  const res = await fetch('/api/sales?period=today'); // Use query parameter
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

export default function TodaysSalesReportPage() {
  const { toast } = useToast();

  const { data: sales = [], isLoading, error, isError } = useQuery<Sale[], Error>({
    queryKey: ['todaysSales'],
    queryFn: fetchTodaysSales,
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to Load Today's Sales",
        description: err.message || "An unexpected error occurred.",
      });
    }
  });

  const grandTotal = useMemo(() => {
    return sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  }, [sales]);

  const handlePrint = () => {
    // Basic browser print
    window.print();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Today's Sales Report" description="Loading sales data for today..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
     return (
      <AppLayout>
        <PageHeader title="Today's Sales Report" description="Error loading today's sales." />
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Failed to Load Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error?.message || "An unknown error occurred."}</p>
          </CardContent>
           <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/sales">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Sales
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Today's Sales Report" description={`Sales for ${format(new Date(), 'PPP')}`}>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" /> Print Report
        </Button>
        <Button variant="outline" asChild>
          <Link href="/sales">
            <ArrowLeft className="mr-2 h-4 w-4" /> All Sales Records
          </Link>
        </Button>
      </PageHeader>

      {sales.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No sales recorded for today yet.
          </CardContent>
        </Card>
      )}

      {sales.map((sale) => (
        <Card key={sale.id} className="mb-6 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
              <div>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-3 h-6 w-6 text-primary" />
                  Sale ID: {sale.id}
                </CardTitle>
                <CardDescription>
                  Date: {format(new Date(sale.date), 'Pp')} | Customer: {sale.customerName || 'N/A'} | Cashier: {sale.cashierId}
                </CardDescription>
              </div>
              <div className="mt-2 sm:mt-0 text-left sm:text-right">
                 <Badge variant={
                    sale.paymentMethod === 'Card' ? 'default' :
                    sale.paymentMethod === 'Cash' ? 'secondary' : 'outline'
                  } className="text-sm mb-1">
                    {sale.paymentMethod}
                  </Badge>
                <p className="text-2xl font-bold text-primary">${Number(sale.totalAmount).toFixed(2)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <h4 className="text-md font-semibold mb-2 text-foreground">Items Sold:</h4>
            {sale.items && sale.items.length > 0 ? (
              <ScrollArea className="rounded-md border max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items.map((item: SaleItem, index: number) => (
                      <TableRow key={item.productId + index}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">${Number(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${Number(item.totalPrice).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-sm">No items found for this sale.</p>
            )}
          </CardContent>
        </Card>
      ))}
      
      {sales.length > 0 && (
        <Card className="mt-8 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Grand Total for Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">${grandTotal.toFixed(2)}</p>
            <p className="text-muted-foreground">Across {sales.length} transaction(s).</p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
