
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Customer } from '@/lib/mockData'; // Keep type
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, FileDown, Edit3, Eye, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// API fetch function for customers
const fetchCustomers = async (): Promise<Customer[]> => {
  const res = await fetch('/api/customers');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

// API delete function
const deleteCustomer = async (customerId: string): Promise<{ message: string }> => {
  const res = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to delete customer and could not parse error' }));
    throw new Error(errorData.message || 'Failed to delete customer');
  }
  return res.json();
};

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const { data: customers, isLoading, error, isError } = useQuery<Customer[], Error>({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  });

  useEffect(() => {
    if (isError && error) {
      toast({
        variant: "destructive",
        title: "Error al Cargar Clientes",
        description: error.message || "Ocurrió un error inesperado.",
      });
    }
  }, [isError, error, toast]);

  const filteredCustomers = useMemo(() => {
    return (customers ?? []).filter((customer: Customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.identificationNumber && customer.identificationNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.includes(searchTerm))
    );
  }, [searchTerm, customers]);

  const deleteMutation = useMutation<any, Error, string>({
    mutationFn: deleteCustomer,
    onSuccess: (data, customerId) => {
      toast({
        title: "Customer Deleted",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Delete Customer",
        description: error.message,
      });
    },
    onSettled: () => {
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  });

  const handleDeleteConfirm = () => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete.id);
    }
  };

  const openDeleteDialog = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Gestión de Clientes" description="Cargando datos de clientes..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="Gestión de Clientes" description="Error al cargar los clientes." />
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Error al Cargar Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error?.message || "Ocurrió un error desconocido al obtener los datos de los clientes."}</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Gestión de Clientes" description="Ver y gestionar su base de datos de clientes.">
        <Button asChild>
          <Link href="/customers/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente
          </Link>
        </Button>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </PageHeader>

      <div className="mb-6">
        <Input
          placeholder="Buscar por nombre, ID, email, teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Avatar</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Número de ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Total Gastado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer: Customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Avatar>
                    <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(customer.name)}`} alt={customer.name} data-ai-hint="profile avatar" />
                    <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.identificationNumber || 'N/A'}</TableCell>
                <TableCell>{customer.email || 'N/A'}</TableCell>
                <TableCell>{customer.phone || 'N/A'}</TableCell>
                <TableCell className="text-right">${Number(customer.totalSpent).toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="hover:text-primary" asChild>
                     {/* Placeholder for view, can link to edit or a dedicated view page */}
                    <Link href={`/customers/${customer.id}/edit`}>
                       <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:text-accent" asChild>
                    <Link href={`/customers/${customer.id}/edit`}>
                      <Edit3 className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-destructive"
                    onClick={() => openDeleteDialog(customer)}
                    disabled={deleteMutation.isPending && customerToDelete?.id === customer.id}
                  >
                    {deleteMutation.isPending && customerToDelete?.id === customer.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron clientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer account
              for <span className="font-semibold">{customerToDelete?.name}</span> and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, delete customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
