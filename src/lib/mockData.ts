
export interface Product {
  id: string;
  name: string;
  code: string;
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
  totalPrice: number;
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

export const mockProducts: Product[] = [
  { id: 'P001', name: 'Spark Plug NGK CR9E', code: 'SPK-NGK-CR9E', barcode: '1234567890123', stock: 150, category: 'Engine Parts', brand: 'NGK', minStock: 20, maxStock: 200, cost: 2.50, price: 5.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'spark plug' },
  { id: 'P002', name: 'Motor Oil Motul 7100 10W40', code: 'OIL-MOT-7100-10W40', stock: 80, category: 'Lubricants', brand: 'Motul', minStock: 10, maxStock: 100, cost: 9.00, price: 15.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'motor oil' },
  { id: 'P003', name: 'Brake Pads Brembo Front', code: 'BRK-BRE-F01', stock: 120, category: 'Brakes', brand: 'Brembo', minStock: 15, maxStock: 150, cost: 25.00, price: 45.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'brake pads' },
  { id: 'P004', name: 'Motorcycle Chain DID X-Ring', code: 'CHN-DID-XR520', stock: 50, category: 'Transmission', brand: 'DID', minStock: 5, maxStock: 60, cost: 60.00, price: 100.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'motorcycle chain' },
  { id: 'P005', name: 'Helmet AGV K3 SV', code: 'HLM-AGV-K3SV-M', stock: 30, category: 'Riding Gear', brand: 'AGV', minStock: 3, maxStock: 40, cost: 150.00, price: 250.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'motorcycle helmet' },
  { id: 'P006', name: 'Air Filter K&N', code: 'AIR-KN-YA600', stock: 75, category: 'Filters', brand: 'K&N', minStock: 10, maxStock: 80, cost: 30.00, price: 55.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'air filter' },
  { id: 'P007', name: 'Battery Yuasa YTZ10S', code: 'BAT-YUA-YTZ10S', stock: 40, category: 'Electrical', brand: 'Yuasa', minStock: 5, maxStock: 50, cost: 70.00, price: 120.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'motorcycle battery' },
  { id: 'P008', name: 'Exhaust Akrapovic Slip-On', code: 'EXH-AKR-SO01', stock: 15, category: 'Exhaust Systems', brand: 'Akrapovic', minStock: 2, maxStock: 20, cost: 450.00, price: 700.00, imageUrl: 'https://placehold.co/100x100.png', dataAiHint: 'exhaust pipe' },
];

export const mockSales: Sale[] = [
  { id: 'S001', date: '2024-07-20T10:30:00Z', items: [{ productId: 'P001', productName: 'Spark Plug NGK CR9E', quantity: 2, unitPrice: 5.00, totalPrice: 10.00 }, { productId: 'P002', productName: 'Motor Oil Motul 7100 10W40', quantity: 1, unitPrice: 15.00, totalPrice: 15.00 }], totalAmount: 25.00, customerId: 'C001', customerName: 'John Doe', paymentMethod: 'Card', cashierId: 'E001' },
  { id: 'S002', date: '2024-07-20T14:15:00Z', items: [{ productId: 'P003', productName: 'Brake Pads Brembo Front', quantity: 1, unitPrice: 45.00, totalPrice: 45.00 }], totalAmount: 45.00, paymentMethod: 'Cash', cashierId: 'E002' },
  { id: 'S003', date: '2024-07-19T16:00:00Z', items: [{ productId: 'P005', productName: 'Helmet AGV K3 SV', quantity: 1, unitPrice: 250.00, totalPrice: 250.00 }, { productId: 'P004', productName: 'Motorcycle Chain DID X-Ring', quantity: 1, unitPrice: 100.00, totalPrice: 100.00 }], totalAmount: 350.00, customerId: 'C002', customerName: 'Jane Smith', paymentMethod: 'Combined', cashierId: 'E001' },
];

export const mockCustomers: Customer[] = [
  { id: 'C001', name: 'John Doe', email: 'john.doe@example.com', phone: '555-1234', address: '123 Main St, Anytown', purchaseHistoryCount: 5, totalSpent: 450.75, creditLimit: 500, outstandingBalance: 50.00 },
  { id: 'C002', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '555-5678', address: '456 Oak Ave, Anytown', purchaseHistoryCount: 12, totalSpent: 1205.20 },
  { id: 'C003', name: 'Mike Brown', phone: '555-9012', purchaseHistoryCount: 2, totalSpent: 85.00 },
  { id: 'C004', name: 'Workshop Express', email: 'contact@workshopexpress.com', phone: '555-3456', address: '789 Industrial Rd, Anytown', purchaseHistoryCount: 35, totalSpent: 8560.00, creditLimit: 2000, outstandingBalance: 350.00 },
];
