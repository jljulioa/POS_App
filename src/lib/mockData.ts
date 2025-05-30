
export interface Product {
  id: string;
  name: string;
  code: string;
  reference: string;
  barcode?: string | null;
  stock: number;
  category: string; // This is the category NAME (e.g., "Engine Parts")
  categoryId?: number; // This is the foreign key (ProductCategories.id)
  brand: string;
  minStock: number;
  maxStock: number;
  cost: number;
  price: number;
  imageUrl?: string | null;
  dataAiHint?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // Effective price after discount
  costPrice: number; // Cost of the item at time of sale
  totalPrice: number; // quantity * unitPrice
  category?: string; // Product category name
}

export interface Sale {
  id: string;
  date: string; // ISO string
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
  newSellingPrice?: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
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
  expenseDate: string; // YYYY-MM-DD
  description: string;
  category: ExpenseCategoryEnum;
  amount: number;
  notes?: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export type UserRole = 'admin' | 'cashier';

export interface User {
  id: number; // From your PostgreSQL Users table
  email: string;
  // password_hash is intentionally omitted for client-side type
  role: UserRole;
  full_name?: string | null;
  is_active?: boolean;
  created_at?: string; // ISO string
  updated_at?: string; // ISO string
  supabase_user_id?: string | null; // To link with Supabase auth.users.id
}

