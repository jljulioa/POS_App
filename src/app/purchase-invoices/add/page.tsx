
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
  invoiceNumber: z.string().min(1, { message: "El número de factura no puede estar vacío." }),
  invoiceDate: z.date({ required_error: "La fecha de la factura es obligatoria." }),
  supplierName: z.string().min(1, { message: "El nombre del proveedor no puede estar vacío." }),
  totalAmount: z.coerce.number().min(0, { message: "El monto total debe ser no negativo." }),
  paymentTerms: z.enum(['Credit', 'Cash'], { required_error: "Los términos de pago son obligatorios." }),
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
        title: "Factura de Compra Añadida",
        description: `La factura ${data.invoiceNumber} ha sido añadida con éxito.`,
      });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      router.push('/purchase-invoices');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error al Añadir Factura",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: PurchaseInvoiceFormValues) => {
    mutation.mutate(data);
  };

  return (
    <AppLayout>
      <PageHeader title="Añadir Nueva Factura de Compra" description="Introduzca los detalles de la factura del proveedor.">
        <Button variant="outline" asChild>
          <Link href="/purchase-invoices">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
          </Link>
        </Button>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FilePlus className="mr-2 h-6 w-6 text-primary" />
                Información de la Factura
              </CardTitle>
              <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Factura *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej., FAC-2024-001" {...field} />
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
                    <FormLabel>Fecha de la Factura *</FormLabel>
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
                              <span>Seleccione una fecha</span>
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
                    <FormLabel>Nombre del Proveedor *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej., ACME Parts Co." {...field} />
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
                    <FormLabel>Monto Total ($) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej., 1250.75" {...field} />
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
                    <FormLabel>Términos de Pago *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione los términos de pago" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Credit">Crédito</SelectItem>
                        <SelectItem value="Cash">Efectivo</SelectItem>
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
                {mutation.isPending ? 'Guardando...' : 'Guardar Factura'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
