
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
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Customer } from '@/lib/mockData';

const CustomerFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  identificationNumber: z.string().optional().or(z.literal('')), // Added new field
  // purchaseHistoryCount and totalSpent will be managed by backend or derived, not typically part of create form
  creditLimit: z.coerce.number().min(0, "Credit limit must be non-negative.").optional(),
  outstandingBalance: z.coerce.number().optional(), // Can be negative if customer has credit
});

type CustomerFormValues = z.infer<typeof CustomerFormSchema>;

// API mutation function to add a customer
const addCustomer = async (newCustomer: CustomerFormValues): Promise<Customer> => {
  const response = await fetch('/api/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newCustomer),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to add customer and could not parse error' }));
    throw new Error(errorData.message || 'Failed to add customer');
  }
  return response.json();
};

export default function AddCustomerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      identificationNumber: '', // Added default
      creditLimit: undefined,
      outstandingBalance: undefined,
    },
  });

  const mutation = useMutation<Customer, Error, CustomerFormValues>({
    mutationFn: addCustomer,
    onSuccess: (data) => {
      toast({
        title: "Customer Added Successfully",
        description: `${data.name} has been added to the customer list.`,
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.push('/customers');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Add Customer",
        description: error.message || "An unexpected error occurred.",
      });
    },
  });

  const onSubmit = (data: CustomerFormValues) => {
    mutation.mutate(data);
  };

  return (
    <AppLayout>
      <PageHeader title="Add New Customer" description="Fill in the details for the new customer.">
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
                <UserPlus className="mr-2 h-6 w-6 text-primary" />
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
                name="identificationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identification Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., National ID, DNI, Cédula" {...field} value={field.value ?? ''} />
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
                      <Input type="number" step="0.01" placeholder="e.g., 50.00 or -10.00" {...field} value={field.value ?? ''} />
                    </FormControl>
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
                {mutation.isPending ? 'Saving...' : 'Save Customer'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
