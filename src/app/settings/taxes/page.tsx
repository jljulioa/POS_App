
"use client";

import React, { useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Save, Percent, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { TaxSetting } from '@/lib/mockData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

const TaxSettingsSchema = z.object({
  taxName: z.string().min(1, "Tax name is required (e.g., VAT, Sales Tax).").max(50),
  taxPercentage: z.coerce.number().min(0, "Percentage must be non-negative.").max(100, "Percentage cannot exceed 100."),
  pricesEnteredWithTax: z.enum(['inclusive', 'exclusive'], { required_error: "Specify if prices include tax." }),
});

type TaxSettingsFormValues = z.infer<typeof TaxSettingsSchema>;

const defaultTaxSettings: TaxSettingsFormValues = {
  taxName: 'VAT',
  taxPercentage: 0,
  pricesEnteredWithTax: 'exclusive',
};

// API fetch function
const fetchTaxSettingsAPI = async (): Promise<TaxSetting> => {
  const response = await fetch('/api/settings/taxes');
  if (!response.ok) {
    if (response.status === 404) { // Handle case where settings might not exist yet
        return defaultTaxSettings as TaxSetting; // Return default if not found to populate form
    }
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch tax settings' }));
    throw new Error(errorData.message || 'Failed to fetch tax settings');
  }
  const data = await response.json();
  return data || (defaultTaxSettings as TaxSetting);
};

// API update function
const updateTaxSettingsAPI = async (data: TaxSettingsFormValues): Promise<TaxSetting> => {
  const response = await fetch('/api/settings/taxes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update tax settings' }));
    throw new Error(errorData.message || 'Failed to update tax settings');
  }
  return response.json();
};

export default function TaxSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentSettings, isLoading: isLoadingSettings, error: settingsError, isError: isSettingsError } = useQuery<TaxSetting, Error>({
    queryKey: ['taxSettings'],
    queryFn: fetchTaxSettingsAPI,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<TaxSettingsFormValues>({
    resolver: zodResolver(TaxSettingsSchema),
    defaultValues: defaultTaxSettings,
  });

  useEffect(() => {
    if (currentSettings) {
      form.reset({
        taxName: currentSettings.taxName,
        taxPercentage: currentSettings.taxPercentage,
        pricesEnteredWithTax: currentSettings.pricesEnteredWithTax,
      });
    }
  }, [currentSettings, form]);

  const mutation = useMutation<TaxSetting, Error, TaxSettingsFormValues>({
    mutationFn: updateTaxSettingsAPI,
    onSuccess: (data) => {
      toast({
        title: "Tax Settings Saved",
        description: "Your tax configurations have been updated.",
      });
      queryClient.setQueryData(['taxSettings'], data);
      queryClient.invalidateQueries({ queryKey: ['taxSettings'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Save Settings",
        description: error.message || "An unexpected error occurred.",
      });
    },
  });

  const onSubmit = (data: TaxSettingsFormValues) => {
    mutation.mutate(data);
  };

  if (isLoadingSettings) {
    return (
      <AppLayout>
        <PageHeader title="Tax Configuration" description="Loading tax settings..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isSettingsError && !currentSettings) { // Show error only if settings are not loaded from default
    return (
      <AppLayout>
        <PageHeader title="Tax Configuration" description="Error loading tax settings." />
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2"/>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{settingsError?.message || "Could not load tax settings."}</p>
             <Button variant="outline" asChild className="mt-4">
                <Link href="/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
             </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Tax Configuration" description="Set up your global tax rate and pricing preferences.">
        <Button variant="outline" asChild>
            <Link href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
            </Link>
          </Button>
      </PageHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="max-w-2xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Percent className="mr-2 h-6 w-6 text-primary" />
                Global Tax Settings
              </CardTitle>
              <CardDescription>
                These settings apply to all taxable products unless overridden at a product level (future feature).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <FormField
                control={form.control}
                name="taxName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., VAT, Sales Tax, IVA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Percentage (%) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 19.00 for 19%" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricesEnteredWithTax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Prices Are Entered: *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pricing method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="exclusive">Exclusive of Tax (Tax added at checkout)</SelectItem>
                        <SelectItem value="inclusive">Inclusive of Tax (Tax is part of the price)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={mutation.isPending || isLoadingSettings}>
                {mutation.isPending || isLoadingSettings ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Tax Settings
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
