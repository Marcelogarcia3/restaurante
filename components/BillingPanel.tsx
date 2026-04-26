'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { BillingMode } from '@/lib/types';

export function BillingPanel({ tableId }: { tableId: string }) {
  const { orders, orderItems, products, customerSessions, restaurants, activeRestaurantId, markItemsAsPaid, setBillingMode } = useAppStore();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const restaurant = restaurants[activeRestaurantId];
  const mode = restaurant.defaultBillingMode;

  const data = useMemo(() => {
    const order = Object.values(orders).find((o) => o.tableId === tableId && o.status === 'OPEN');
    const items = order ? Object.values(orderItems).filter((x) => x.orderId === order.id) : [];
    const sessions = Object.values(customerSessions).filter((x) => x.tableId === tableId);
    const total = items.reduce((sum, x) => sum + (products[x.productId]?.price ?? 0), 0);

    const grouped = sessions.map((session) => {
      const own = items.filter((x) => x.assignedTo === session.id);
      const subtotal = own.reduce((sum, x) => sum + (products[x.productId]?.price ?? 0), 0);
      return { session, own, subtotal };
    });

    return { total, grouped, items, sessions };
  }, [orders, orderItems, products, customerSessions, tableId]);

  const taxTotal = data.total * (1 + restaurant.taxRate);

  return (
    <div className="card">
      <div className="row between">
        <h3>Billing</h3>
        <div className="pill-switch">
          {(['JOINT', 'SPLIT'] as BillingMode[]).map((m) => (
            <button key={m} className={mode === m ? 'active' : ''} onClick={() => setBillingMode(m)}>{m}</button>
          ))}
        </div>
      </div>
      {data.items.length === 0 ? <p className="empty">No items yet.</p> : null}
      {mode === 'JOINT' ? (
        <div className="stack-sm">
          <p>Subtotal: ${data.total.toFixed(2)}</p>
          <p>Total w/ tax: <b>${taxTotal.toFixed(2)}</b></p>
        </div>
      ) : (
        <div className="stack-sm">
          {data.grouped.length === 0 ? <p className="empty">Waiting for customers...</p> : null}
          {data.grouped.map(({ session, subtotal, own }) => (
            <div key={session.id} className="list-item">
              <div>
                <b>{session.name}</b>
                <p>${subtotal.toFixed(2)} • {own.filter((x) => x.status === 'PAID').length}/{own.length} paid</p>
              </div>
              <button onClick={() => { setSelectedSession(session.id); markItemsAsPaid(session.id, tableId); }}>
                {selectedSession === session.id ? 'Paid ✓' : 'Pay My Part'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
