
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
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Dirección de correo electrónico no válida." }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  identificationNumber: z.string().optional().or(z.literal('')), // Added new field
  // purchaseHistoryCount and totalSpent will be managed by backend or derived, not typically part of create form
  creditLimit: z.coerce.number().min(0, "El límite de crédito debe ser no negativo.").optional(),
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
        title: "Cliente Añadido con Éxito",
        description: `${data.name} ha sido añadido a la lista de clientes.`,
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.push('/customers');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error al Añadir Cliente",
        description: error.message || "Ocurrió un error inesperado.",
      });
    },
  });

  const onSubmit = (data: CustomerFormValues) => {
    mutation.mutate(data);
  };

  return (
    <AppLayout>
      <PageHeader title="Añadir Nuevo Cliente" description="Rellene los datos del nuevo cliente.">
        <Button variant="outline" asChild>
          <Link href="/customers">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
          </Link>
        </Button>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="mr-2 h-6 w-6 text-primary" />
                Información del Cliente
              </CardTitle>
              <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej., John Doe" {...field} />
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
                    <FormLabel>Número de Identificación</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej., Cédula, DNI" {...field} value={field.value ?? ''} />
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
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Ej., john.doe@example.com" {...field} value={field.value ?? ''} />
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
                    <FormLabel>Número de Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej., (555) 123-4567" {...field} value={field.value ?? ''} />
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
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej., Av. Siempre Viva 123" {...field} value={field.value ?? ''} />
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
                    <FormLabel>Límite de Crédito ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej., 500.00" {...field} value={field.value ?? ''} />
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
                    <FormLabel>Saldo Pendiente ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej., 50.00 o -10.00" {...field} value={field.value ?? ''} />
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
                {mutation.isPending ? 'Guardando...' : 'Guardar Cliente'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
