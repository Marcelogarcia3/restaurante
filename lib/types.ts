export type UserRole = 'ADMIN' | 'WAITER';
export type TableStatus = 'AVAILABLE' | 'OCCUPIED';
export type OrderStatus = 'OPEN' | 'CLOSED';
export type OrderItemStatus = 'UNPAID' | 'PAID';
export type BillingMode = 'JOINT' | 'SPLIT';

export interface User {
  id: string;
  restaurantId: string;
  name: string;
  role: UserRole;
  pin: string;
}

export interface Restaurant {
  id: string;
  name: string;
  ownerId: string;
  taxRate: number;
  defaultBillingMode: BillingMode;
}

export interface Product {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  active: boolean;
}

export interface DiningTable {
  id: string;
  restaurantId: string;
  name: string;
  status: TableStatus;
}

export interface CustomerSession {
  id: string;
  tableId: string;
  name: string;
  createdAt: string;
}

export interface Order {
  id: string;
  tableId: string;
  status: OrderStatus;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  assignedTo: string;
  status: OrderItemStatus;
  createdAt: string;
}

export interface DatabaseState {
  users: Record<string, User>;
  restaurants: Record<string, Restaurant>;
  products: Record<string, Product>;
  tables: Record<string, DiningTable>;
  customerSessions: Record<string, CustomerSession>;
  orders: Record<string, Order>;
  orderItems: Record<string, OrderItem>;
}
