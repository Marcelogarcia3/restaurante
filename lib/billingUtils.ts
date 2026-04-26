import { useAppStore } from './store';

export const addOrderItemWithAssignment = (tableId: string, productId: string, customerSessionId: string) =>
  useAppStore.getState().addOrderItemWithAssignment(tableId, productId, customerSessionId);

export const assignItemToCustomer = (orderItemId: string, customerSessionId: string) =>
  useAppStore.getState().assignItemToCustomer(orderItemId, customerSessionId);

export const markItemsAsPaid = (customerSessionId: string, tableId: string) =>
  useAppStore.getState().markItemsAsPaid(customerSessionId, tableId);

export const resetDemoData = () => useAppStore.getState().resetDemoData();
