
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
import { Save, Settings, FileText, Loader2 } from 'lucide-react';
import type { InvoiceSettings } from '@/lib/mockData';

const INVOICE_SETTINGS_KEY = 'invoiceSettings';

const InvoiceSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required."),
  nit: z.string().min(1, "NIT/Tax ID is required."),
  address: z.string().min(1, "Address is required."),
  footerMessage: z.string().optional(),
});

type InvoiceSettingsFormValues = z.infer<typeof InvoiceSettingsSchema>;

const defaultInvoiceSettings: InvoiceSettingsFormValues = {
  companyName: 'MotoFox POS',
  nit: '123456789-0',
  address: '123 Motorcycle Lane, Anytown, USA',
  footerMessage: 'Thank you for your business!',
};

export default function InvoiceSettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<InvoiceSettingsFormValues>({
    resolver: zodResolver(InvoiceSettingsSchema),
    defaultValues: defaultInvoiceSettings,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem(INVOICE_SETTINGS_KEY);
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings) as InvoiceSettingsFormValues;
          // Validate parsed settings against schema before resetting form
          const validation = InvoiceSettingsSchema.safeParse(parsedSettings);
          if (validation.success) {
            form.reset(validation.data);
          } else {
            console.warn("Invalid settings found in localStorage, using defaults.", validation.error);
            localStorage.setItem(INVOICE_SETTINGS_KEY, JSON.stringify(defaultInvoiceSettings)); // Save defaults if stored is bad
            form.reset(defaultInvoiceSettings);
          }
        } catch (error) {
          console.error("Failed to parse invoice settings from localStorage:", error);
          localStorage.setItem(INVOICE_SETTINGS_KEY, JSON.stringify(defaultInvoiceSettings));
          form.reset(defaultInvoiceSettings);
        }
      } else {
        // If no settings saved, save the default ones
        localStorage.setItem(INVOICE_SETTINGS_KEY, JSON.stringify(defaultInvoiceSettings));
      }
    }
  }, [form]);

  const onSubmit = (data: InvoiceSettingsFormValues) => {
    setIsLoading(true);
    try {
      localStorage.setItem(INVOICE_SETTINGS_KEY, JSON.stringify(data));
      toast({
        title: "Settings Saved",
        description: "Invoice details have been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Save Settings",
        description: "Could not save settings to local storage. Your browser might be configured to block it.",
      });
      console.error("Error saving invoice settings to localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Invoice & Receipt Settings" description="Configure the details that appear on your sales receipts and invoices." />
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
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
