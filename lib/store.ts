'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Role = 'ADMIN' | 'WAITER';
export type TableStatus = 'AVAILABLE' | 'OCCUPIED';
export type OrderStatus = 'OPEN' | 'CLOSED';
export type OrderItemStatus = 'PENDING' | 'PAID';
export type BillingMode = 'JOINT' | 'INDIVIDUAL';

export type User = { id: string; name: string; role: Role; pin: string; restaurantId: string };
export type Restaurant = { id: string; name: string; ownerId: string; taxRate: number; defaultBillingMode: BillingMode };
export type Product = { id: string; restaurantId: string; name: string; price: number; active: boolean };
export type TableEntity = { id: string; restaurantId: string; name: string; status: TableStatus };
export type CustomerSession = { id: string; tableId: string; name: string; active: boolean; joinedAt: number };
export type Order = { id: string; tableId: string; status: OrderStatus; createdAt: number };
export type OrderItem = { id: string; orderId: string; productId: string; assignedTo: string | null; status: OrderItemStatus; createdAt: number };

type Db = {
  users: Record<string, User>;
  restaurants: Record<string, Restaurant>;
  products: Record<string, Product>;
  tables: Record<string, TableEntity>;
  customerSessions: Record<string, CustomerSession>;
  orders: Record<string, Order>;
  orderItems: Record<string, OrderItem>;
};

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const buildSeed = (): Db => {
  const adminId = uid('user');
  const waiter1 = uid('user');
  const waiter2 = uid('user');
  const restaurantId = uid('rest');
  const t1 = uid('table');
  const t2 = uid('table');
  const t3 = uid('table');
  const order1 = uid('ord');
  const order2 = uid('ord');
  const order3 = uid('ord');
  const products = ['Margherita Pizza', 'Pasta Alfredo', 'Caesar Salad', 'House Burger', 'Lemonade', 'Tiramisu', 'Espresso'];

  const db: Db = {
    users: {
      [adminId]: { id: adminId, name: 'Owner Admin', role: 'ADMIN', pin: '1111', restaurantId },
      [waiter1]: { id: waiter1, name: 'Ava Waiter', role: 'WAITER', pin: '2222', restaurantId },
      [waiter2]: { id: waiter2, name: 'Noah Waiter', role: 'WAITER', pin: '3333', restaurantId },
    },
    restaurants: {
      [restaurantId]: { id: restaurantId, name: 'SyncroTable Bistro', ownerId: adminId, taxRate: 0.08, defaultBillingMode: 'INDIVIDUAL' },
    },
    products: {},
    tables: {
      [t1]: { id: t1, restaurantId, name: 'Table 1', status: 'AVAILABLE' },
      [t2]: { id: t2, restaurantId, name: 'Table 2', status: 'AVAILABLE' },
      [t3]: { id: t3, restaurantId, name: 'Table 3', status: 'AVAILABLE' },
    },
    customerSessions: {},
    orders: {
      [order1]: { id: order1, tableId: t1, status: 'OPEN', createdAt: Date.now() },
      [order2]: { id: order2, tableId: t2, status: 'OPEN', createdAt: Date.now() },
      [order3]: { id: order3, tableId: t3, status: 'OPEN', createdAt: Date.now() },
    },
    orderItems: {},
  };

  products.forEach((name, i) => {
    const id = uid('prd');
    db.products[id] = { id, restaurantId, name, price: Number((8 + i * 2.25).toFixed(2)), active: true };
  });

  return db;
};

type SyncroState = {
  db: Db;
  selectedRestaurantId: string | null;
  selectedTableId: string | null;
  activeCustomerSessionId: string | null;
  waiterUserId: string | null;
  customerViewSessionId: string | null;
  billingMode: BillingMode;
  ensureSeeded: () => void;
  resetDemoData: () => void;
  setBillingMode: (mode: BillingMode) => void;
  setSelectedTable: (tableId: string | null) => void;
  waiterLoginByPin: (pin: string) => boolean;
  joinTableAsCustomer: (tableId: string, name: string) => string;
  setCustomerViewSessionId: (id: string | null) => void;
  addProduct: (name: string, price: number) => void;
  updateProduct: (id: string, data: Partial<Omit<Product, 'id' | 'restaurantId'>>) => void;
  removeProduct: (id: string) => void;
  addWaiter: (name: string, pin: string) => void;
  removeUser: (id: string) => void;
  upsertTable: (tableId: string | null, name: string) => void;
  addOrderItemWithAssignment: (tableId: string, productId: string, sessionId: string | null) => void;
  assignItemToCustomer: (itemId: string, sessionId: string | null) => void;
  markItemsAsPaid: (sessionId: string) => void;
  updateSettings: (patch: Partial<Pick<Restaurant, 'name' | 'taxRate' | 'defaultBillingMode'>>) => void;
};

const getActiveOrderIdByTable = (db: Db, tableId: string) =>
  Object.values(db.orders).find((o) => o.tableId === tableId && o.status === 'OPEN')?.id;

export const useSyncroStore = create<SyncroState>()(
  persist(
    (set, get) => ({
      db: buildSeed(),
      selectedRestaurantId: null,
      selectedTableId: null,
      activeCustomerSessionId: null,
      waiterUserId: null,
      customerViewSessionId: null,
      billingMode: 'INDIVIDUAL',
      ensureSeeded: () => {
        const { db } = get();
        if (!Object.keys(db.restaurants).length) set({ db: buildSeed() });
        const restId = Object.keys(get().db.restaurants)[0] ?? null;
        if (!get().selectedRestaurantId) set({ selectedRestaurantId: restId });
      },
      resetDemoData: () => set({ db: buildSeed(), selectedTableId: null, activeCustomerSessionId: null, waiterUserId: null, customerViewSessionId: null }),
      setBillingMode: (billingMode) => set({ billingMode }),
      setSelectedTable: (selectedTableId) => set({ selectedTableId }),
      waiterLoginByPin: (pin) => {
        const waiter = Object.values(get().db.users).find((u) => u.role === 'WAITER' && u.pin === pin);
        if (!waiter) return false;
        set({ waiterUserId: waiter.id, selectedRestaurantId: waiter.restaurantId });
        return true;
      },
      joinTableAsCustomer: (tableId, name) => {
        const id = uid('cs');
        set((state) => {
          state.db.customerSessions[id] = { id, tableId, name, active: true, joinedAt: Date.now() };
          state.db.tables[tableId].status = 'OCCUPIED';
          state.customerViewSessionId = id;
          state.activeCustomerSessionId = id;
          return { db: { ...state.db }, customerViewSessionId: id, activeCustomerSessionId: id };
        });
        return id;
      },
      setCustomerViewSessionId: (customerViewSessionId) => set({ customerViewSessionId }),
      addProduct: (name, price) =>
        set((state) => {
          const restaurantId = state.selectedRestaurantId ?? Object.keys(state.db.restaurants)[0];
          const id = uid('prd');
          state.db.products[id] = { id, restaurantId, name, price, active: true };
          return { db: { ...state.db } };
        }),
      updateProduct: (id, data) => set((state) => ({ db: { ...state.db, products: { ...state.db.products, [id]: { ...state.db.products[id], ...data } } } })),
      removeProduct: (id) => set((state) => {
        const next = { ...state.db.products };
        delete next[id];
        return { db: { ...state.db, products: next } };
      }),
      addWaiter: (name, pin) =>
        set((state) => {
          const id = uid('user');
          const restaurantId = state.selectedRestaurantId ?? Object.keys(state.db.restaurants)[0];
          state.db.users[id] = { id, name, pin, role: 'WAITER', restaurantId };
          return { db: { ...state.db } };
        }),
      removeUser: (id) => set((state) => {
        const users = { ...state.db.users };
        delete users[id];
        return { db: { ...state.db, users } };
      }),
      upsertTable: (tableId, name) =>
        set((state) => {
          if (tableId && state.db.tables[tableId]) {
            state.db.tables[tableId].name = name;
            return { db: { ...state.db } };
          }
          const id = uid('table');
          const restaurantId = state.selectedRestaurantId ?? Object.keys(state.db.restaurants)[0];
          state.db.tables[id] = { id, restaurantId, name, status: 'AVAILABLE' };
          const orderId = uid('ord');
          state.db.orders[orderId] = { id: orderId, tableId: id, status: 'OPEN', createdAt: Date.now() };
          return { db: { ...state.db } };
        }),
      addOrderItemWithAssignment: (tableId, productId, sessionId) =>
        set((state) => {
          const orderId = getActiveOrderIdByTable(state.db, tableId);
          if (!orderId) return { db: state.db };
          const id = uid('item');
          state.db.orderItems[id] = { id, orderId, productId, assignedTo: sessionId, status: 'PENDING', createdAt: Date.now() };
          state.activeCustomerSessionId = sessionId;
          return { db: { ...state.db }, activeCustomerSessionId: sessionId };
        }),
      assignItemToCustomer: (itemId, sessionId) => set((state) => ({ db: { ...state.db, orderItems: { ...state.db.orderItems, [itemId]: { ...state.db.orderItems[itemId], assignedTo: sessionId } } } })),
      markItemsAsPaid: (sessionId) =>
        set((state) => {
          const updated = Object.fromEntries(
            Object.entries(state.db.orderItems).map(([k, item]) => [k, item.assignedTo === sessionId ? { ...item, status: 'PAID' as const } : item]),
          );
          return { db: { ...state.db, orderItems: updated } };
        }),
      updateSettings: (patch) =>
        set((state) => {
          const restId = state.selectedRestaurantId ?? Object.keys(state.db.restaurants)[0];
          return { db: { ...state.db, restaurants: { ...state.db.restaurants, [restId]: { ...state.db.restaurants[restId], ...patch } } } };
        }),
    }),
    {
      name: 'syncrotable-db-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ ...state, ensureSeeded: undefined }),
    },
  ),
);

export const selectors = {
  restaurant: (s: SyncroState) => (s.selectedRestaurantId ? s.db.restaurants[s.selectedRestaurantId] : Object.values(s.db.restaurants)[0]),
  tables: (s: SyncroState) => Object.values(s.db.tables),
  products: (s: SyncroState) => Object.values(s.db.products).filter((p) => p.active),
};
