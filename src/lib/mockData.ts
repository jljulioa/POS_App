
export interface Product {
  id: string;
  name: string;
  code: string;
  reference: string; // New field
  barcode?: string;
  stock: number;
  category: string;
  brand: string;
  minStock: number;
  maxStock: number;
  cost: number;
  price: number;
  imageUrl: string;
  dataAiHint?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number; // Added for COGS calculation
  totalPrice: number;
  category?: string; // Added for category-wise revenue reporting
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  totalAmount: number;
  customerId?: string;
  customerName?: string;
  paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Combined';
  cashierId: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  purchaseHistoryCount: number;
  totalSpent: number;
  creditLimit?: number;
  outstandingBalance?: number;
}

// New interfaces for Purchase Invoices
export interface PurchaseInvoiceItem {
  productId: string;
  productName: string; // Name at the time of purchase, could differ from current product name
  quantity: number;
  costPrice: number; // Cost per unit at the time of purchase
  totalCost: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO date string e.g. "2024-07-26"
  supplierName: string;
  totalAmount: number; // Total value from supplier's invoice
  paymentTerms: 'Credit' | 'Cash';
  processed: boolean; // true if items added to inventory, false otherwise
  items?: PurchaseInvoiceItem[]; // Optional: list of items on the invoice, useful for processing
}

// New interface for Sales Tickets
export interface SalesTicket {
  id: string;
  name: string; // e.g., "Ticket 1", "Customer Alex"
  cart: SaleItem[];
  status: 'Active' | 'On Hold' | 'Pending Payment';
  createdAt: string; // ISO date string
  lastUpdatedAt: string; // ISO date string
}


export const mockProducts: Product[] = [
  { id: 'P001', name: 'Spark Plug NGK CR9E', code: 'SPK-NGK-CR9E', reference: 'REF-SPK-001', barcode: '1234567890123', stock: 150, category: 'Engine Parts', brand: 'NGK', minStock: 20, maxStock: 200, cost: 2.50, price: 5.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'spark plug' },
  { id: 'P002', name: 'Motor Oil Motul 7100 10W40', code: 'OIL-MOT-7100-10W40', reference: 'REF-OIL-002', stock: 80, category: 'Lubricants', brand: 'Motul', minStock: 10, maxStock: 100, cost: 9.00, price: 15.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'motor oil' },
  { id: 'P003', name: 'Brake Pads Brembo Front', code: 'BRK-BRE-F01', reference: 'REF-BRK-003', stock: 120, category: 'Brakes', brand: 'Brembo', minStock: 15, maxStock: 150, cost: 25.00, price: 45.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'brake pads' },
  { id: 'P004', name: 'Motorcycle Chain DID X-Ring', code: 'CHN-DID-XR520', reference: 'REF-CHN-004', stock: 50, category: 'Transmission', brand: 'DID', minStock: 5, maxStock: 60, cost: 60.00, price: 100.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'motorcycle chain' },
  { id: 'P005', name: 'Helmet AGV K3 SV', code: 'HLM-AGV-K3SV-M', reference: 'REF-HLM-005', stock: 30, category: 'Riding Gear', brand: 'AGV', minStock: 3, maxStock: 40, cost: 150.00, price: 250.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'motorcycle helmet' },
  { id: 'P006', name: 'Air Filter K&N', code: 'AIR-KN-YA600', reference: 'REF-AIR-006', stock: 75, category: 'Filters', brand: 'K&N', minStock: 10, maxStock: 80, cost: 30.00, price: 55.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'air filter' },
  { id: 'P007', name: 'Battery Yuasa YTZ10S', code: 'BAT-YUA-YTZ10S', reference: 'REF-BAT-007', stock: 40, category: 'Electrical', brand: 'Yuasa', minStock: 5, maxStock: 50, cost: 70.00, price: 120.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'motorcycle battery' },
  { id: 'P008', name: 'Exhaust Akrapovic Slip-On', code: 'EXH-AKR-SO01', reference: 'REF-EXH-008', stock: 15, category: 'Exhaust Systems', brand: 'Akrapovic', minStock: 2, maxStock: 20, cost: 450.00, price: 700.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'exhaust pipe' },
];

export const mockSales: Sale[] = [
  { id: 'S001', date: '2024-07-20T10:30:00Z', items: [{ productId: 'P001', productName: 'Spark Plug NGK CR9E', quantity: 2, unitPrice: 5.00, costPrice: 2.50, totalPrice: 10.00, category: 'Engine Parts' }, { productId: 'P002', productName: 'Motor Oil Motul 7100 10W40', quantity: 1, unitPrice: 15.00, costPrice: 9.00, totalPrice: 15.00, category: 'Lubricants' }], totalAmount: 25.00, customerId: 'C001', customerName: 'John Doe', paymentMethod: 'Card', cashierId: 'E001' },
  { id: 'S002', date: '2024-07-20T14:15:00Z', items: [{ productId: 'P003', productName: 'Brake Pads Brembo Front', quantity: 1, unitPrice: 45.00, costPrice: 25.00, totalPrice: 45.00, category: 'Brakes' }], totalAmount: 45.00, paymentMethod: 'Cash', cashierId: 'E002' },
  { id: 'S003', date: '2024-07-19T16:00:00Z', items: [{ productId: 'P005', productName: 'Helmet AGV K3 SV', quantity: 1, unitPrice: 250.00, costPrice: 150.00, totalPrice: 250.00, category: 'Riding Gear' }, { productId: 'P004', productName: 'Motorcycle Chain DID X-Ring', quantity: 1, unitPrice: 100.00, costPrice: 60.00, totalPrice: 100.00, category: 'Transmission' }], totalAmount: 350.00, customerId: 'C002', customerName: 'Jane Smith', paymentMethod: 'Combined', cashierId: 'E001' },
];

export const mockCustomers: Customer[] = [
  { id: 'C001', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', address: '123 Main St, Anytown', purchaseHistoryCount: 5, totalSpent: 450.75, creditLimit: 500, outstandingBalance: 50.00 },
  { id: 'C002', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', address: '456 Oak Ave, Anytown', purchaseHistoryCount: 12, totalSpent: 1205.20 },
  { id: 'C003', name: 'Mike Brown', phone: '555-9012', purchaseHistoryCount: 2, totalSpent: 85.00 },
  { id: 'C004', name: 'Workshop Express', email: 'contact@workshopexpress.com', phone: '555-3456', address: '789 Industrial Rd, Anytown', purchaseHistoryCount: 35, totalSpent: 8560.00, creditLimit: 2000, outstandingBalance: 350.00 },
];

export const mockPurchaseInvoices: PurchaseInvoice[] = [
  { id: 'PI001', invoiceNumber: 'INV-SUPPLIER-A-1001', invoiceDate: '2024-07-15', supplierName: 'Supplier Alpha Parts', totalAmount: 1250.75, paymentTerms: 'Credit', processed: true, items: [ {productId: 'P001', productName: 'Spark Plug', quantity: 50, costPrice: 2.40, totalCost: 120.00 }]},
  { id: 'PI002', invoiceNumber: 'INV-SUPPLIER-B-2034', invoiceDate: '2024-07-18', supplierName: 'MotoGear Inc.', totalAmount: 875.00, paymentTerms: 'Cash', processed: false },
  { id: 'PI003', invoiceNumber: 'INV-SUPPLIER-A-1005', invoiceDate: '2024-07-22', supplierName: 'Supplier Alpha Parts', totalAmount: 2300.50, paymentTerms: 'Credit', processed: false },
  { id: 'PI004', invoiceNumber: 'INV-SUPPLIER-C-0012', invoiceDate: '2024-07-25', supplierName: 'Performance Imports', totalAmount: 550.20, paymentTerms: 'Cash', processed: true, items: [ {productId: 'P008', productName: 'Exhaust Akrapovic', quantity: 1, costPrice: 440.00, totalCost: 440.00 }]},
];
