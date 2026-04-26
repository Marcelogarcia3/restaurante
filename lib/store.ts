'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSeedData } from './demoData';
import { BillingMode, CustomerSession, DatabaseState, OrderItem, Product, User } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

interface AppState extends DatabaseState {
  hydrated: boolean;
  activeRestaurantId: string;
  lastAssignedCustomerByTable: Record<string, string>;
  setHydrated: (hydrated: boolean) => void;
  resetDemoData: () => void;
  joinTable: (tableId: string, name: string) => string;
  addOrderItemWithAssignment: (tableId: string, productId: string, customerSessionId: string) => void;
  assignItemToCustomer: (orderItemId: string, customerSessionId: string) => void;
  markItemsAsPaid: (customerSessionId: string, tableId: string) => void;
  setBillingMode: (mode: BillingMode) => void;
  upsertProduct: (product: Omit<Product, 'id'> & { id?: string }) => void;
  removeProduct: (id: string) => void;
  addWaiter: (name: string, pin: string) => void;
  removeUser: (id: string) => void;
  upsertTable: (name: string, id?: string) => void;
  setRestaurantName: (name: string) => void;
  setTaxRate: (taxRate: number) => void;
  waiterLogin: (pin: string) => User | null;
}

const seeded = createSeedData();
const firstRestaurantId = Object.keys(seeded.restaurants)[0];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seeded,
      hydrated: false,
      activeRestaurantId: firstRestaurantId,
      lastAssignedCustomerByTable: {},
      setHydrated: (hydrated) => set({ hydrated }),
      resetDemoData: () => {
        const next = createSeedData();
        set({ ...next, activeRestaurantId: Object.keys(next.restaurants)[0], lastAssignedCustomerByTable: {} });
      },
      joinTable: (tableId, name) => {
        const id = uid();
        const session: CustomerSession = { id, tableId, name, createdAt: new Date().toISOString() };
        set((state) => ({
          customerSessions: { ...state.customerSessions, [id]: session },
          tables: {
            ...state.tables,
            [tableId]: { ...state.tables[tableId], status: 'OCCUPIED' },
          },
        }));
        return id;
      },
      addOrderItemWithAssignment: (tableId, productId, customerSessionId) => {
        const order = Object.values(get().orders).find((o) => o.tableId === tableId && o.status === 'OPEN');
        if (!order) return;
        const item: OrderItem = {
          id: uid(),
          orderId: order.id,
          productId,
          assignedTo: customerSessionId,
          status: 'UNPAID',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          orderItems: { ...state.orderItems, [item.id]: item },
          lastAssignedCustomerByTable: { ...state.lastAssignedCustomerByTable, [tableId]: customerSessionId },
        }));
      },
      assignItemToCustomer: (orderItemId, customerSessionId) => {
        set((state) => ({
          orderItems: {
            ...state.orderItems,
            [orderItemId]: { ...state.orderItems[orderItemId], assignedTo: customerSessionId },
          },
        }));
      },
      markItemsAsPaid: (customerSessionId, tableId) => {
        const order = Object.values(get().orders).find((o) => o.tableId === tableId && o.status === 'OPEN');
        if (!order) return;
        set((state) => {
          const next = { ...state.orderItems };
          Object.values(next)
            .filter((x) => x.orderId === order.id && x.assignedTo === customerSessionId)
            .forEach((x) => {
              next[x.id] = { ...x, status: 'PAID' };
            });
          return { orderItems: next };
        });
      },
      setBillingMode: (mode) => {
        set((state) => ({
          restaurants: {
            ...state.restaurants,
            [state.activeRestaurantId]: { ...state.restaurants[state.activeRestaurantId], defaultBillingMode: mode },
          },
        }));
      },
      upsertProduct: (product) => {
        const id = product.id ?? uid();
        set((state) => ({
          products: {
            ...state.products,
            [id]: { id, ...product, restaurantId: state.activeRestaurantId },
          },
        }));
      },
      removeProduct: (id) => set((state) => {
        const next = { ...state.products };
        delete next[id];
        return { products: next };
      }),
      addWaiter: (name, pin) => {
        const id = uid();
        set((state) => ({
          users: {
            ...state.users,
            [id]: { id, name, pin, role: 'WAITER', restaurantId: state.activeRestaurantId },
          },
        }));
      },
      removeUser: (id) => set((state) => {
        const next = { ...state.users };
        delete next[id];
        return { users: next };
      }),
      upsertTable: (name, id) => {
        const finalId = id ?? uid();
        const orderId = uid();
        set((state) => ({
          tables: {
            ...state.tables,
            [finalId]: {
              id: finalId,
              name,
              restaurantId: state.activeRestaurantId,
              status: state.tables[finalId]?.status ?? 'AVAILABLE',
            },
          },
          orders: id
            ? state.orders
            : { ...state.orders, [orderId]: { id: orderId, tableId: finalId, status: 'OPEN' } },
        }));
      },
      setRestaurantName: (name) => set((state) => ({
        restaurants: {
          ...state.restaurants,
          [state.activeRestaurantId]: { ...state.restaurants[state.activeRestaurantId], name },
        },
      })),
      setTaxRate: (taxRate) => set((state) => ({
        restaurants: {
          ...state.restaurants,
          [state.activeRestaurantId]: { ...state.restaurants[state.activeRestaurantId], taxRate },
        },
      })),
      waiterLogin: (pin) => Object.values(get().users).find((u) => u.pin === pin && u.role === 'WAITER') ?? null,
    }),
    {
      name: 'syncrotable-db',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

export const selectors = {
  restaurant: (state: AppState) => state.restaurants[state.activeRestaurantId],
};
