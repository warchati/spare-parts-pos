export interface Product {
  id: number;
  code: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  vehicleType: string;
  oemNumber: string;
  buyPrice: number;
  sellPrice: number;
  wholesalePrice: number;
  stock: number;
  minStock: number;
  location: string;
  defaultLocationId: number | null;
  defaultLocation?: { id: number; name: string; code: string } | null;
  imageUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  document: string;
  vehicle: string;
  notes: string;
  creditLimit: number;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: number;
  clientId: number | null;
  userId: number;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentDetails: string;
  status: SaleStatus;
  createdAt: string;
}

export interface SaleItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit' | 'multiple';
export type SaleStatus = 'completed' | 'cancelled' | 'pending';

export interface PurchaseOrder {
  id: number;
  supplierId: number;
  userId: number;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: PurchaseStatus;
  createdAt: string;
  receivedAt: string | null;
}

export interface PurchaseItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export type PurchaseStatus = 'pending' | 'received' | 'cancelled';

export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'cashier' | 'viewer';
  active: boolean;
}
