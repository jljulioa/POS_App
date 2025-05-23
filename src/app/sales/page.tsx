
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Sale, SaleItem } from '@/lib/mockData'; // Keep type
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileDown, Eye, Loader2, AlertTriangle, ShoppingCart, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// API fetch function for sales
const fetchSales = async (startDate?: Date, endDate?: Date): Promise<Sale[]> => {
  const params = new URLSearchParams();
  if (startDate) {
    params.append('startDate', format(startDate, 'yyyy-MM-dd'));
  }
  if (endDate) {
    params.append('endDate', format(endDate, 'yyyy-MM-dd'));
  }
  const res = await fetch(`/api/sales?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};


export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: sales = [], isLoading, error, isError, refetch } = useQuery<Sale[], Error>({
    queryKey: ['sales', startDate, endDate], // Add dates to queryKey to trigger refetch
    queryFn: () => fetchSales(startDate, endDate),
    enabled: true, // Fetch on mount and when dates change (due to queryKey)
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to Load Sales Records",
        description: err.message || "An unexpected error occurred.",
      });
    }
  });

  const filteredSales = useMemo(() => {
    return sales.filter(sale =>
      sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sale.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, sales]);

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setIsViewModalOpen(true);
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    // refetch will be triggered by queryKey change
  };
  
  // Effect to refetch when dates change
  useEffect(() => {
    // refetch(); // This is handled by React Query when queryKey changes
  }, [startDate, endDate, refetch]);


  if (isLoading && !sales.length) { // Show loading only if no data is present yet
    return (
      <AppLayout>
        <PageHeader title="Sales Records" description="Loading sales history..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
     return (
      <AppLayout>
        <PageHeader title="Sales Records" description="Error loading sales data." />
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Failed to Load Sales Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error?.message || "An unknown error occurred while fetching sales data."}</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Sales Records" description="View and analyze your sales history.">
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <Input
          placeholder="Search by Sale ID, Customer, Product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[150px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[150px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>End Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => startDate && date < startDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
        </div>
         {(startDate || endDate) && (
            <Button variant="ghost" onClick={handleClearFilters} size="sm">
              <FilterX className="mr-2 h-4 w-4" /> Clear Dates
            </Button>
          )}
      </div>

      {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

      {!isLoading && (
        <div className="rounded-lg border shadow-sm bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id}</TableCell>
                  <TableCell>{format(new Date(sale.date), 'PPpp')}</TableCell>
                  <TableCell>{sale.customerName || 'N/A'}</TableCell>
                  <TableCell className="text-center">{sale.items.length}</TableCell>
                  <TableCell className="text-right">${Number(sale.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      sale.paymentMethod === 'Card' ? 'default' :
                      sale.paymentMethod === 'Cash' ? 'secondary' : 'outline'
                    }>{sale.paymentMethod}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleViewSale(sale)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No sales records found for the selected criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedSale && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-6 w-6 text-primary" />
                Sale Details: {selectedSale.id}
              </DialogTitle>
              <DialogDescription>
                Date: {format(new Date(selectedSale.date), 'PPpp')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-semibold">Customer:</span> {selectedSale.customerName || 'N/A'}</div>
                <div><span className="font-semibold">Payment Method:</span> {selectedSale.paymentMethod}</div>
                <div><span className="font-semibold">Cashier:</span> {selectedSale.cashierId}</div>
                <div className="text-lg font-bold"><span className="font-semibold">Total:</span> ${Number(selectedSale.totalAmount).toFixed(2)}</div>
              </div>

              <h3 className="font-semibold text-md mt-2">Items Sold:</h3>
              {selectedSale.items && selectedSale.items.length > 0 ? (
                <div className="rounded-md border max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.items.map((item: SaleItem, index: number) => (
                        <TableRow key={item.productId + index}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">${Number(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">${Number(item.totalPrice).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">No items found for this sale.</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
