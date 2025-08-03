
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
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Dirección de correo electrónico no válida." }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  identificationNumber: z.string().optional().or(z.literal('')), // Added new field
  purchaseHistoryCount: z.coerce.number().int().min(0).optional(),
  totalSpent: z.coerce.number().min(0).optional(),
  creditLimit: z.coerce.number().min(0, "El límite de crédito debe ser no negativo.").optional(),
  outstandingBalance: z.coerce.number().optional(),
});

type CustomerFormValues = z.infer<typeof CustomerFormSchema>;

// API fetch function for a single customer
const fetchCustomer = async (customerId: string): Promise<Customer> => {
  const response = await fetch(`/api/customers/${customerId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error al obtener el cliente y no se pudo analizar el error' }));
    throw new Error(errorData.message || 'Error al obtener el cliente');
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
    const errorData = await response.json().catch(() => ({ message: 'Error al actualizar el cliente y no se pudo analizar el error' }));
    throw new Error(errorData.message || 'Error al actualizar el cliente');
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
      identificationNumber: '', // Added default
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
        identificationNumber: customer.identificationNumber || '', // Added value
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
        title: "Cliente Actualizado con Éxito",
        description: `${data.name} ha sido actualizado.`,
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      router.push('/customers');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error al Actualizar Cliente",
        description: error.message || "Ocurrió un error inesperado.",
      });
    },
  });

  const onSubmit = (data: CustomerFormValues) => {
    mutation.mutate(data);
  };

  if (isLoadingCustomer) {
    return (
      <AppLayout>
        <PageHeader title="Editar Cliente" description="Cargando detalles del cliente..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isCustomerError || !customer) {
    return (
      <AppLayout>
        <PageHeader title="Error" description="No se pudieron cargar los detalles del cliente." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Error al Cargar Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{customerError?.message || "No se pudo encontrar el cliente o se produjo un error."}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/customers">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Clientes
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title={`Editar Cliente: ${customer.name}`} description="Actualice los detalles del cliente a continuación.">
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
                <UserCog className="mr-2 h-6 w-6 text-primary" />
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
                name="purchaseHistoryCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Historial de Compras</FormLabel>
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
                    <FormLabel>Total Gastado ($)</FormLabel>
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
                      <Input type="number" step="0.01" placeholder="Ej., 50.00" {...field} value={field.value ?? ''} />
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
                {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
