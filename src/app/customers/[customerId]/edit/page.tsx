
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserCog, Save, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Customer } from '@/lib/mockData';
import React, { useEffect } from 'react';

const CustomerFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  purchaseHistoryCount: z.coerce.number().int().min(0).optional(),
  totalSpent: z.coerce.number().min(0).optional(),
  creditLimit: z.coerce.number().min(0, "Credit limit must be non-negative.").optional(),
  outstandingBalance: z.coerce.number().optional(),
});

type CustomerFormValues = z.infer<typeof CustomerFormSchema>;

// API fetch function for a single customer
const fetchCustomer = async (customerId: string): Promise<Customer> => {
  const response = await fetch(`/api/customers/${customerId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch customer and could not parse error' }));
    throw new Error(errorData.message || 'Failed to fetch customer');
  }
  return response.json();
};

// API mutation function for updating a customer
const updateCustomer = async ({ customerId, data }: { customerId: string; data: CustomerFormValues }): Promise<Customer> => {
  const response = await fetch(`/api/customers/${customerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update customer and could not parse error' }));
    throw new Error(errorData.message || 'Failed to update customer');
  }
  return response.json();
};

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.customerId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customer, isLoading: isLoadingCustomer, error: customerError, isError: isCustomerError } = useQuery<Customer, Error>({
    queryKey: ['customer', customerId],
    queryFn: () => fetchCustomer(customerId),
    enabled: !!customerId,
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      purchaseHistoryCount: 0,
      totalSpent: 0,
      creditLimit: undefined,
      outstandingBalance: undefined,
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        purchaseHistoryCount: customer.purchaseHistoryCount || 0,
        totalSpent: customer.totalSpent || 0,
        creditLimit: customer.creditLimit ?? undefined,
        outstandingBalance: customer.outstandingBalance ?? undefined,
      });
    }
  }, [customer, form]);

  const mutation = useMutation<Customer, Error, CustomerFormValues>({
    mutationFn: (data) => updateCustomer({ customerId, data }),
    onSuccess: (data) => {
      toast({
        title: "Customer Updated Successfully",
        description: `${data.name} has been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      router.push('/customers');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Update Customer",
        description: error.message || "An unexpected error occurred.",
      });
    },
  });

  const onSubmit = (data: CustomerFormValues) => {
    mutation.mutate(data);
  };

  if (isLoadingCustomer) {
    return (
      <AppLayout>
        <PageHeader title="Edit Customer" description="Loading customer details..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isCustomerError || !customer) {
    return (
      <AppLayout>
        <PageHeader title="Error" description="Could not load customer details." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Failed to Load Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{customerError?.message || "The customer could not be found or an error occurred."}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/customers">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title={`Edit Customer: ${customer.name}`} description="Update the customer details below.">
        <Button variant="outline" asChild>
          <Link href="/customers">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
          </Link>
        </Button>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCog className="mr-2 h-6 w-6 text-primary" />
                Customer Information
              </CardTitle>
              <CardDescription>Fields marked with * are required.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g., john.doe@example.com" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., (555) 123-4567" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123 Main St, Anytown, USA" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchaseHistoryCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase History Count</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? 0} readOnly className="bg-muted/50"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalSpent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Spent ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? 0} readOnly className="bg-muted/50"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Limit ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 500.00" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="outstandingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outstanding Balance ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 50.00" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={mutation.isPending || isLoadingCustomer}>
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {mutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
