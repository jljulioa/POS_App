
"use client";

import React, { useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Save, Settings, FileText, Loader2, AlertTriangle } from 'lucide-react';
import type { InvoiceSettings } from '@/lib/mockData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const InvoiceSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required."),
  nit: z.string().min(1, "NIT/Tax ID is required."),
  address: z.string().min(1, "Address is required."),
  footerMessage: z.string().optional().or(z.literal('')),
});

type InvoiceSettingsFormValues = z.infer<typeof InvoiceSettingsSchema>;

const defaultSettings: InvoiceSettingsFormValues = {
  companyName: 'MotoFox POS',
  nit: 'N/A',
  address: 'Your Store Address',
  footerMessage: 'Thank you for your business!',
};

// API fetch function
const fetchInvoiceSettingsAPI = async (): Promise<InvoiceSettings> => {
  const response = await fetch('/api/settings/invoice');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch settings' }));
    throw new Error(errorData.message || 'Failed to fetch settings');
  }
  return response.json();
};

// API update function
const updateInvoiceSettingsAPI = async (data: InvoiceSettingsFormValues): Promise<InvoiceSettings> => {
  const response = await fetch('/api/settings/invoice', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update settings' }));
    throw new Error(errorData.message || 'Failed to update settings');
  }
  return response.json();
};

export default function InvoiceSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentSettings, isLoading: isLoadingSettings, error: settingsError, isError: isSettingsError } = useQuery<InvoiceSettings, Error>({
    queryKey: ['invoiceSettings'],
    queryFn: fetchInvoiceSettingsAPI,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const form = useForm<InvoiceSettingsFormValues>({
    resolver: zodResolver(InvoiceSettingsSchema),
    defaultValues: defaultSettings, 
  });

  useEffect(() => {
    if (currentSettings) {
      form.reset({
        companyName: currentSettings.companyName,
        nit: currentSettings.nit,
        address: currentSettings.address,
        footerMessage: currentSettings.footerMessage || '',
      });
    }
  }, [currentSettings, form]);

  const mutation = useMutation<InvoiceSettings, Error, InvoiceSettingsFormValues>({
    mutationFn: updateInvoiceSettingsAPI,
    onSuccess: (data) => {
      toast({
        title: "Settings Saved",
        description: "Invoice settings have been updated.",
      });
      queryClient.setQueryData(['invoiceSettings'], data); // Optimistically update the cache
      queryClient.invalidateQueries({ queryKey: ['invoiceSettings'] }); // Refetch in background
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Save Settings",
        description: error.message || "An unexpected error occurred.",
      });
    },
  });

  const onSubmit = (data: InvoiceSettingsFormValues) => {
    mutation.mutate(data);
  };

  if (isLoadingSettings) {
    return (
      <AppLayout>
        <PageHeader title="Invoice Settings" description="Loading settings..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isSettingsError) {
    return (
      <AppLayout>
        <PageHeader title="Invoice Settings" description="Error loading settings." />
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2"/>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{settingsError?.message || "Could not load invoice settings."}</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Invoice Settings" description="Configure the details that appear on your sales receipts and invoices." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="max-w-2xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-6 w-6 text-primary" />
                Company & Invoice Details
              </CardTitle>
              <CardDescription>These details will be used on printed receipts and invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIT / Tax ID *</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company's Tax ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Address *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="123 Main Street, City, Country" {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="footerMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Footer Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Thank you for your purchase! Returns accepted within 30 days with receipt." {...field} value={field.value ?? ''} rows={3}/>
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
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
