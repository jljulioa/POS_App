
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, Package, Search, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { InventoryTransactionDB } from '@/app/api/inventory-transactions/route'; // Using DB type from API

const fetchInventoryTransactions = async (): Promise<InventoryTransactionDB[]> => {
  const res = await fetch('/api/inventory-transactions');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.message || 'Failed to fetch inventory transactions');
  }
  return res.json();
};

export default function InventoryTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20);

  const { data: transactions = [], isLoading, error, isError } = useQuery<InventoryTransactionDB[], Error>({
    queryKey: ['inventoryTransactions'],
    queryFn: fetchInventoryTransactions,
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    const termLower = searchTerm.toLowerCase();
    return transactions.filter(transaction =>
      transaction.product_name.toLowerCase().includes(termLower) ||
      transaction.product_id.toLowerCase().includes(termLower) ||
      (transaction.related_document_id && transaction.related_document_id.toLowerCase().includes(termLower)) ||
      transaction.transaction_type.toLowerCase().includes(termLower)
    );
  }, [searchTerm, transactions]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === 'all' || filteredTransactions.length === 0) return 1;
    return Math.ceil(filteredTransactions.length / Number(itemsPerPage));
  }, [filteredTransactions, itemsPerPage]);

  const displayedTransactions = useMemo(() => {
    if (itemsPerPage === 'all') return filteredTransactions;
    const numericItemsPerPage = Number(itemsPerPage);
    const startIndex = (currentPage - 1) * numericItemsPerPage;
    const endIndex = startIndex + numericItemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    else if (totalPages === 0 && filteredTransactions.length > 0) setCurrentPage(1);
  }, [filteredTransactions.length, totalPages, currentPage]);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value === 'all' ? 'all' : Number(value));
  };

  const paginationStartItem = itemsPerPage === 'all' || filteredTransactions.length === 0 ? (filteredTransactions.length > 0 ? 1 : 0) : (currentPage - 1) * Number(itemsPerPage) + 1;
  const paginationEndItem = itemsPerPage === 'all' ? filteredTransactions.length : Math.min(currentPage * Number(itemsPerPage), filteredTransactions.length);


  const getBadgeVariant = (type: InventoryTransactionDB['transaction_type']): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'Sale': return 'destructive'; // Stock decreases
      case 'Purchase': return 'default'; // Stock increases (using primary color)
      case 'Return': return 'secondary'; // Stock increases (using secondary color)
      case 'Adjustment': return 'outline';
      default: return 'outline';
    }
  };

  const translateTransactionType = (type: InventoryTransactionDB['transaction_type']): string => {
    switch (type) {
      case 'Sale': return 'Venta';
      case 'Purchase': return 'Compra';
      case 'Return': return 'Devolución';
      case 'Adjustment': return 'Ajuste';
      default: return type;
    }
  };

  const itemsPerPageOptions = [
    { value: '20', label: '20' },
    { value: '40', label: '40' },
    { value: 'all', label: 'Todos' },
  ];


  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Transacciones de Inventario" description="Cargando historial de transacciones..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="Transacciones de Inventario" description="Error al cargar los datos de las transacciones." />
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <div className="flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Error</div>
          <p>{error?.message || "Ocurrió un error desconocido."}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Transacciones de Inventario" description="Ver todos los movimientos de stock de productos.">
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por Nombre de Producto, ID, Documento, Tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8" 
            />
        </div>
      </PageHeader>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>ID de Producto</TableHead>
              <TableHead>Nombre del Producto</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-center">Cambio de Cantidad</TableHead>
              <TableHead className="text-center">Stock Anterior</TableHead>
              <TableHead className="text-center">Stock Posterior</TableHead>
              <TableHead>Documento Relacionado</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{format(new Date(transaction.transaction_date), 'PPpp')}</TableCell>
                <TableCell>{transaction.product_id}</TableCell>
                <TableCell className="font-medium">{transaction.product_name}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={getBadgeVariant(transaction.transaction_type)}>
                    {translateTransactionType(transaction.transaction_type)}
                  </Badge>
                </TableCell>
                <TableCell className={`text-center font-semibold ${transaction.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.quantity_change > 0 ? `+${transaction.quantity_change}` : transaction.quantity_change}
                </TableCell>
                <TableCell className="text-center">{transaction.stock_before}</TableCell>
                <TableCell className="text-center">{transaction.stock_after}</TableCell>
                <TableCell>{transaction.related_document_id || 'N/A'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{transaction.notes || 'N/A'}</TableCell>
              </TableRow>
            ))}
            {displayedTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No se encontraron transacciones de inventario.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filas por página:</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Items por página" /></SelectTrigger>
            <SelectContent>{itemsPerPageOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">{filteredTransactions.length > 0 ? `Mostrando ${paginationStartItem}-${paginationEndItem} de ${filteredTransactions.length} transacciones` : "No hay transacciones"}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || itemsPerPage === 'all'}><ChevronLeft className="h-4 w-4 mr-1" /> Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || itemsPerPage === 'all'}>Siguiente <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      </div>
    </AppLayout>
  );
}
