
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { PurchaseInvoice, PurchaseInvoiceItem } from '@/lib/mockData'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, FileDown, Settings2, Loader2, AlertTriangle, Trash2, ChevronLeft, ChevronRight, Eye, ShoppingCart } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useCurrency } from '@/contexts/CurrencyContext';

// API fetch function for the list of purchase invoices (without items initially)
const fetchPurchaseInvoicesList = async (): Promise<PurchaseInvoice[]> => {
  const res = await fetch('/api/purchase-invoices');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

// API fetch function for a single purchase invoice with its items
const fetchSinglePurchaseInvoiceWithItems = async (invoiceId: string): Promise<PurchaseInvoice> => {
  if (!invoiceId) throw new Error("Invoice ID is required to fetch details.");
  const res = await fetch(`/api/purchase-invoices/${invoiceId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to fetch invoice details.' }));
    throw new Error(errorData.message || 'Failed to fetch invoice details.');
  }
  return res.json();
};


// API delete function
const deletePurchaseInvoiceAPI = async (invoiceId: string): Promise<{ message: string }> => {
  const res = await fetch(`/api/purchase-invoices/${invoiceId}`, { method: 'DELETE' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to delete invoice' }));
    throw new Error(errorData.message || 'Failed to delete invoice');
  }
  return res.json();
};

interface InvoiceRowActionsProps {
  invoice: PurchaseInvoice;
  deleteMutation: UseMutationResult<{ message: string }, Error, string, unknown>;
  onViewDetails: (invoice: PurchaseInvoice) => void;
}

function InvoiceRowActions({ invoice, deleteMutation, onViewDetails }: InvoiceRowActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(invoice.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
      },
      onError: () => {
        setIsDeleteDialogOpen(false);
      }
    });
  };

  return (
    <div className="flex items-center justify-center space-x-1">
      {invoice.processed ? (
        <Button variant="ghost" size="icon" className="hover:text-primary h-8 w-8 sm:h-auto sm:w-auto" onClick={() => onViewDetails(invoice)}>
          <Eye className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" className="hover:text-accent h-8 w-8 sm:h-auto sm:w-auto" asChild>
          <Link href={`/purchase-invoices/${invoice.id}/process`}>
            <Settings2 className="h-4 w-4" />
          </Link>
        </Button>
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:text-destructive h-8 w-8 sm:h-auto sm:w-auto">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase invoice
              <span className="font-semibold"> {invoice.invoiceNumber}</span>.
              This action does NOT revert any stock changes if the invoice was already processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending && deleteMutation.variables === invoice.id}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {(deleteMutation.isPending && deleteMutation.variables === invoice.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


export default function PurchaseInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20);

  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<PurchaseInvoice | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const { data: invoicesList = [], isLoading: isLoadingList, error: listError, isError: isListError } = useQuery<PurchaseInvoice[], Error>({
    queryKey: ['purchaseInvoicesList'],
    queryFn: fetchPurchaseInvoicesList,
  });

  const { 
    data: detailedInvoice, 
    isLoading: isLoadingDetailedInvoice, 
    error: detailedInvoiceError,
    isError: isDetailedInvoiceError,
    refetch: refetchDetailedInvoice,
  } = useQuery<PurchaseInvoice, Error>({
    queryKey: ['purchaseInvoiceDetails', selectedInvoiceForView?.id],
    queryFn: () => fetchSinglePurchaseInvoiceWithItems(selectedInvoiceForView!.id),
    enabled: !!selectedInvoiceForView && isViewModalOpen, // Only fetch when an invoice is selected and modal is open
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const deleteMutation = useMutation<{ message: string }, Error, string>({
    mutationFn: deletePurchaseInvoiceAPI,
    onSuccess: (data) => {
      toast({ title: "Purchase Invoice Deleted", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoicesList'] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to Delete Invoice", description: error.message });
    },
  });

  const handleViewDetails = (invoice: PurchaseInvoice) => {
    setSelectedInvoiceForView(invoice);
    setIsViewModalOpen(true);
  };

  useEffect(() => {
    if (selectedInvoiceForView && isViewModalOpen) {
        refetchDetailedInvoice();
    }
  }, [selectedInvoiceForView, isViewModalOpen, refetchDetailedInvoice]);


  const filteredInvoices = useMemo(() => {
    if (!invoicesList) return [];
    return invoicesList.filter(invoice => 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, invoicesList]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === 'all' || filteredInvoices.length === 0) return 1;
    return Math.ceil(filteredInvoices.length / Number(itemsPerPage));
  }, [filteredInvoices, itemsPerPage]);

  const displayedInvoices = useMemo(() => {
    if (itemsPerPage === 'all') return filteredInvoices;
    const numericItemsPerPage = Number(itemsPerPage);
    const startIndex = (currentPage - 1) * numericItemsPerPage;
    const endIndex = startIndex + numericItemsPerPage;
    return filteredInvoices.slice(startIndex, endIndex);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    else if (totalPages === 0 && filteredInvoices.length > 0) setCurrentPage(1);
  }, [filteredInvoices.length, totalPages, currentPage]);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value === 'all' ? 'all' : Number(value));
  };

  const paginationStartItem = itemsPerPage === 'all' || filteredInvoices.length === 0 ? (filteredInvoices.length > 0 ? 1 : 0) : (currentPage - 1) * Number(itemsPerPage) + 1;
  const paginationEndItem = itemsPerPage === 'all' ? filteredInvoices.length : Math.min(currentPage * Number(itemsPerPage), filteredInvoices.length);

  const itemsPerPageOptions = [
    { value: '20', label: '20 per page' },
    { value: '40', label: '40 per page' },
    { value: 'all', label: 'Show All' },
  ];

  if (isLoadingList) {
    return (
      <AppLayout>
        <PageHeader title="Purchase Invoices" description="Loading supplier invoices..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isListError) {
    return (
      <AppLayout>
        <PageHeader title="Purchase Invoices" description="Error loading invoices." />
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <div className="flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Error</div>
          <p>{listError?.message || "An unknown error occurred."}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Purchase Invoices" description="Manage incoming supplier invoices.">
        <Button asChild>
          <Link href="/purchase-invoices/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Invoice
          </Link>
        </Button>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="mb-6">
        <Input 
          placeholder="Search by Invoice #, Supplier..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-sm"
        />
      </div>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right hidden md:table-cell">Total</TableHead>
              <TableHead className="hidden md:table-cell">Terms</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium text-xs sm:text-sm">{invoice.invoiceNumber}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-xs sm:text-sm">{invoice.supplierName}</TableCell>
                <TableCell className="text-right hidden md:table-cell">{formatCurrency(invoice.totalAmount)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={invoice.paymentTerms === 'Credit' ? 'outline' : 'secondary'}>
                    {invoice.paymentTerms}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={invoice.processed ? 'default' : 'destructive'} className={invoice.processed ? "bg-green-500 hover:bg-green-600" : "hover:bg-destructive/90"}>
                    {invoice.processed ? 'Processed' : 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <InvoiceRowActions invoice={invoice} deleteMutation={deleteMutation} onViewDetails={handleViewDetails} />
                </TableCell>
              </TableRow>
            ))}
            {displayedInvoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No purchase invoices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Items per page" /></SelectTrigger>
            <SelectContent>{itemsPerPageOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">{filteredInvoices.length > 0 ? `Showing ${paginationStartItem}-${paginationEndItem} of ${filteredInvoices.length} invoices` : "No invoices"}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || itemsPerPage === 'all'}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || itemsPerPage === 'all'}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      </div>

      {selectedInvoiceForView && isViewModalOpen && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-xl md:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-6 w-6 text-primary" />
                Invoice Details: {selectedInvoiceForView.invoiceNumber}
              </DialogTitle>
              <DialogDescription>
                Supplier: {selectedInvoiceForView.supplierName} | Date: {format(new Date(selectedInvoiceForView.invoiceDate), 'PPP')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {isLoadingDetailedInvoice && (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              {isDetailedInvoiceError && (
                <div className="text-destructive p-3 border border-destructive rounded-md">
                  <AlertTriangle className="mr-2 h-5 w-5 inline-block" />
                  Error loading details: {detailedInvoiceError?.message}
                </div>
              )}
              {!isLoadingDetailedInvoice && !isDetailedInvoiceError && detailedInvoice && detailedInvoice.items && (
                <>
                  <h4 className="font-semibold mb-2">Items on Invoice:</h4>
                  {detailedInvoice.items.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Cost/Unit</TableHead>
                            <TableHead className="text-right">Total Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailedInvoice.items.map((item: PurchaseInvoiceItem, index: number) => (
                            <TableRow key={item.productId + index}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.costPrice)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                     <p className="text-muted-foreground text-sm">No items were recorded for this processed invoice when it was finalized.</p>
                  )}
                  <div className="mt-4 text-right">
                    <p className="font-bold text-lg">Invoice Total: {formatCurrency(detailedInvoice.totalAmount)}</p>
                  </div>
                </>
              )}
               {!isLoadingDetailedInvoice && !isDetailedInvoiceError && detailedInvoice && !detailedInvoice.items && (
                 <p className="text-muted-foreground text-sm">Item details not available for this invoice (it might not have been processed with items, or items were not fetched).</p>
               )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
    