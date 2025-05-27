
export interface Product {
  id: string;
  name: string;
  code: string;
  reference: string;
  barcode?: string | null; // Allow null
  stock: number;
  category: string; // This will be the category NAME fetched via JOIN
  categoryId?: number; // This is the foreign key
  brand: string;
  minStock: number;
  maxStock: number;
  cost: number;
  price: number;
  imageUrl?: string | null; // Allow null
  dataAiHint?: string | null; // Allow null
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalPrice: number;
  category?: string;
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  totalAmount: number;
  customerId?: string | null;
  customerName?: string | null;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Combined';
  cashierId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  purchaseHistoryCount: number;
  totalSpent: number;
  creditLimit?: number | null;
  outstandingBalance?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseInvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
  newSellingPrice?: number; // Used during processing
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  totalAmount: number;
  paymentTerms: 'Credit' | 'Cash';
  processed: boolean;
  items?: PurchaseInvoiceItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseCategoryEnum =
    | 'Rent'
    | 'Utilities'
    | 'Supplies'
    | 'Salaries'
    | 'Marketing'
    | 'Maintenance'
    | 'Office'
    | 'Travel'
    | 'Taxes'
    | 'Insurance'
    | 'Bank Fees'
    | 'Shipping'
    | 'Meals & Entertainment'
    | 'Other';

export const expenseCategories: ExpenseCategoryEnum[] = [
    'Rent', 'Utilities', 'Supplies', 'Salaries', 'Marketing', 'Maintenance',
    'Office', 'Travel', 'Taxes', 'Insurance', 'Bank Fees', 'Shipping', 'Meals & Entertainment', 'Other'
];


export interface DailyExpense {
  id: number;
  expenseDate: string;
  description: string;
  category: ExpenseCategoryEnum;
  amount: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'cashier';

export interface User {
  id: number;
  username: string;
  email: string;
  // password_hash is intentionally omitted for client-side type
  role: UserRole;
  full_name?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  firebase_uid?: string | null; // Optional, if you decide to link directly by Firebase UID
}

// Mock data is kept for reference but API calls should be used

export const mockProducts: Product[] = [
  // ... existing mock products ...
];

export const mockSales: Sale[] = [
  // ... existing mock sales ...
];

export const mockCustomers: Customer[] = [
  // ... existing mock customers ...
];

export const mockPurchaseInvoices: PurchaseInvoice[] = [
  // ... existing mock purchase invoices ...
];

