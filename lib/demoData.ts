import { BillingMode, DatabaseState, Order, Restaurant, User } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

export const createSeedData = (): DatabaseState => {
  const admin: User = { id: uid(), restaurantId: '', name: 'Sofia Admin', role: 'ADMIN', pin: '1111' };
  const restaurant: Restaurant = {
    id: uid(),
    name: 'Syncro Bistro',
    ownerId: admin.id,
    taxRate: 0.08,
    defaultBillingMode: 'SPLIT' satisfies BillingMode,
  };
  admin.restaurantId = restaurant.id;

  const waiters: User[] = [
    { id: uid(), restaurantId: restaurant.id, name: 'Marco', role: 'WAITER', pin: '2222' },
    { id: uid(), restaurantId: restaurant.id, name: 'Elena', role: 'WAITER', pin: '3333' },
  ];

  const tables = ['Table 1', 'Table 2', 'Table 3'].map((name, index) => ({
    id: uid(),
    restaurantId: restaurant.id,
    name,
    status: index === 0 ? 'OCCUPIED' : 'AVAILABLE' as const,
  }));

  const products = [
    ['Margherita Pizza', 14],
    ['Truffle Pasta', 19],
    ['Caesar Salad', 11],
    ['Sparkling Water', 4],
    ['Iced Latte', 6],
    ['Cheesecake', 8],
    ['Grilled Salmon', 22],
  ].map(([name, price]) => ({
    id: uid(),
    restaurantId: restaurant.id,
    name: String(name),
    price: Number(price),
    active: true,
  }));

  const orders: Order[] = tables.map((table) => ({ id: uid(), tableId: table.id, status: 'OPEN' }));

  return {
    users: Object.fromEntries([admin, ...waiters].map((x) => [x.id, x])),
    restaurants: { [restaurant.id]: restaurant },
    products: Object.fromEntries(products.map((x) => [x.id, x])),
    tables: Object.fromEntries(tables.map((x) => [x.id, x])),
    customerSessions: {},
    orders: Object.fromEntries(orders.map((x) => [x.id, x])),
    orderItems: {},
  };
};
