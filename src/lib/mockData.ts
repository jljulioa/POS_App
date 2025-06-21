
export interface Product {
  id: string;
  name: string;
  code: string;
  reference: string;
  barcode?: string | null;
  stock: number;
  category: string; // This is the category NAME, derived from category_id
  categoryId?: number; // Foreign key to ProductCategories.id
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
  unitPrice: number;
  costPrice: number; // Cost of the item at time of sale
  totalPrice: number;
  category?: string; // Product category name
}

export interface Sale {
  id: string;
  date: string; // ISO string
  items: SaleItem[];
  totalAmount: number; // Grand total
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
  identificationNumber?: string | null;
  purchaseHistoryCount: number;
  totalSpent: number;
  creditLimit?: number | null;
  outstandingBalance?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseInvoicePayment {
  id: number;
  purchase_invoice_id: string;
  payment_date: string; // ISO string
  amount: number;
  payment_method: string;
  notes?: string | null;
  created_at: string; // ISO string
}

export interface PurchaseInvoiceItem {
  productId: string;
  productName: string;
  productCode: string; // Added for barcode generation
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
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
  balanceDue: number;
  processed: boolean;
  items?: PurchaseInvoiceItem[];
  payments?: PurchaseInvoicePayment[];
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
  id: number;
  email: string;
  role: UserRole;
  full_name?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  supabase_user_id?: string | null;
}

export interface InvoiceSettings {
  id?: number; // Will be 1 for the single row
  companyName: string;
  nit: string; // Tax ID or similar identifier
  address: string;
  footerMessage: string;
  updatedAt?: string;
}
// TaxSetting interface removed
