
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FilePlus, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PurchaseInvoice } from '@/lib/mockData';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


const PurchaseInvoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, { message: "Invoice number cannot be empty." }),
  invoiceDate: z.date({ required_error: "Invoice date is required." }),
  supplierName: z.string().min(1, { message: "Supplier name cannot be empty." }),
  totalAmount: z.coerce.number().min(0, { message: "Total amount must be non-negative." }),
  paymentTerms: z.enum(['Credit', 'Cash'], { required_error: "Payment terms are required." }),
});

type PurchaseInvoiceFormValues = z.infer<typeof PurchaseInvoiceFormSchema>;

// API mutation function
const addPurchaseInvoiceAPI = async (newInvoice: PurchaseInvoiceFormValues): Promise<PurchaseInvoice> => {
  // Convert date to YYYY-MM-DD string for API
  const apiPayload = {
    ...newInvoice,
    invoiceDate: format(newInvoice.invoiceDate, "yyyy-MM-dd"),
  };
  const response = await fetch('/api/purchase-invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiPayload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to add purchase invoice' }));
    throw new Error(errorData.message || 'Failed to add purchase invoice');
  }
  return response.json();
};


export default function AddPurchaseInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PurchaseInvoiceFormValues>({
    resolver: zodResolver(PurchaseInvoiceFormSchema),
    defaultValues: {
      invoiceNumber: '',
      invoiceDate: new Date(),
      supplierName: '',
      totalAmount: 0,
      paymentTerms: 'Credit',
    },
  });

  const mutation = useMutation<PurchaseInvoice, Error, PurchaseInvoiceFormValues>({
    mutationFn: addPurchaseInvoiceAPI,
    onSuccess: (data) => {
      toast({
        title: "Purchase Invoice Added",
        description: `Invoice ${data.invoiceNumber} has been successfully added.`,
      });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      router.push('/purchase-invoices');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Add Invoice",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: PurchaseInvoiceFormValues) => {
    mutation.mutate(data);
  };

  return (
    <AppLayout>
      <PageHeader title="Add New Purchase Invoice" description="Enter the details of the supplier invoice.">
        <Button variant="outline" asChild>
          <Link href="/purchase-invoices">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
          </Link>
        </Button>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FilePlus className="mr-2 h-6 w-6 text-primary" />
                Invoice Information
              </CardTitle>
              <CardDescription>Fields marked with * are required.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., INV-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Invoice Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Supplier Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ACME Parts Co." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount ($) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 1250.75" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Credit">Credit</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" /> 
                )}
                {mutation.isPending ? 'Saving...' : 'Save Invoice'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
