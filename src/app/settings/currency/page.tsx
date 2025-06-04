
"use client";

import React, { useEffect, useState } from 'react'; // Added useState here
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Save, DollarSign, Loader2, ArrowLeft } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext'; // Import useCurrency
import Link from 'next/link';

const CurrencySettingsSchema = z.object({
  currency: z.string().min(3, "Currency code must be 3 characters.").max(3),
});

type CurrencySettingsFormValues = z.infer<typeof CurrencySettingsSchema>;

const currencyOptions = [
  { value: 'USD', label: 'USD - United States Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound Sterling' },
  { value: 'COP', label: 'COP - Colombian Peso' },
  // Add more currencies as needed
];

export default function CurrencySettingsPage() {
  const { toast } = useToast();
  const { currency: globalCurrency, setCurrency: setGlobalCurrency, formatCurrency } = useCurrency(); // Use currency context
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CurrencySettingsFormValues>({
    resolver: zodResolver(CurrencySettingsSchema),
    defaultValues: {
      currency: globalCurrency,
    },
  });

  useEffect(() => {
    form.reset({ currency: globalCurrency });
  }, [globalCurrency, form]);

  const onSubmit = (data: CurrencySettingsFormValues) => {
    setIsLoading(true);
    setGlobalCurrency(data.currency); // Update global currency
    
    // Simulate saving if needed, but context handles persistence for now
    setTimeout(() => {
      toast({
        title: "Currency Setting Updated",
        description: `Display currency set to ${data.currency}. Values are now formatted as ${formatCurrency(12345.67, data.currency)}.`,
      });
      setIsLoading(false);
    }, 500);
  };

  return (
    <AppLayout>
      <PageHeader title="Currency Settings" description="Set the default display currency for the application.">
         <Button variant="outline" asChild>
            <Link href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
            </Link>
          </Button>
      </PageHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="max-w-xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-6 w-6 text-primary" />
                Default Application Currency
              </CardTitle>
              <CardDescription>
                Choose the currency for displaying monetary values. This setting is saved in your browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Currency *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} // Already correct
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-sm text-muted-foreground">
                Example formatting: <span className="font-semibold">{formatCurrency(12345.6789)}</span>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Currency Setting
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
