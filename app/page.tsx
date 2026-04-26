'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BillingPanel } from '@/components/BillingPanel';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const [view, setView] = useState<'admin' | 'waiter' | 'customer'>('admin');
  const hydrated = useAppStore((s) => s.hydrated);

  if (!hydrated) return <main className="center">Preparing demo data...</main>;

  return (
    <main className="app-shell">
      <div className="top-tabs">
        {['admin', 'waiter', 'customer'].map((x) => (
          <button key={x} className={view === x ? 'active' : ''} onClick={() => setView(x as typeof view)}>{x.toUpperCase()}</button>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {view === 'admin' && <AdminView />}
        {view === 'waiter' && <WaiterView />}
        {view === 'customer' && <CustomerView />}
      </motion.div>
    </main>
  );
}

function AdminView() {
  const store = useAppStore();
  const restaurant = store.restaurants[store.activeRestaurantId];
  const [section, setSection] = useState('Dashboard');
  const [editingProduct, setEditingProduct] = useState<{ id?: string; name: string; price: string }>({ name: '', price: '' });
  const [newWaiter, setNewWaiter] = useState({ name: '', pin: '' });
  const [tableName, setTableName] = useState('');

  const metrics = useMemo(() => {
    const allItems = Object.values(store.orderItems);
    const totalSales = allItems.filter((x) => x.status === 'PAID').reduce((sum, x) => sum + (store.products[x.productId]?.price ?? 0), 0);
    const activeTables = Object.values(store.tables).filter((x) => x.status === 'OCCUPIED').length;
    const itemsSold = allItems.filter((x) => x.status === 'PAID').length;
    const byTable = Object.values(store.tables).map((table) => {
      const order = Object.values(store.orders).find((o) => o.tableId === table.id && o.status === 'OPEN');
      const amount = Object.values(store.orderItems)
        .filter((x) => x.orderId === order?.id)
        .reduce((sum, x) => sum + (store.products[x.productId]?.price ?? 0), 0);
      return { name: table.name, total: amount };
    });
    return { totalSales, activeTables, itemsSold, byTable };
  }, [store]);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <h2>SyncroTable</h2>
        {['Dashboard', 'Menu', 'Staff', 'Tables', 'Settings'].map((item) => (
          <button key={item} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>{item}</button>
        ))}
        <button className="danger" onClick={store.resetDemoData}>Reset Demo</button>
      </aside>
      <section>
        <header className="topbar"><h1>{restaurant.name}</h1></header>
        {section === 'Dashboard' && (
          <div className="grid-3">
            <Metric title="Total Sales" value={`$${metrics.totalSales.toFixed(2)}`} />
            <Metric title="Active Tables" value={String(metrics.activeTables)} />
            <Metric title="Items Sold" value={String(metrics.itemsSold)} />
            <div className="card span-3 h-300">
              <h3>Table Revenue Snapshot</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={metrics.byTable}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#10b981" radius={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {section === 'Menu' && (
          <div className="card">
            <h3>Menu Management</h3>
            <div className="inline-edit">
              <input placeholder="Product" value={editingProduct.name} onChange={(e) => setEditingProduct((p) => ({ ...p, name: e.target.value }))} />
              <input placeholder="Price" value={editingProduct.price} onChange={(e) => setEditingProduct((p) => ({ ...p, price: e.target.value }))} />
              <button onClick={() => { if (!editingProduct.name) return; store.upsertProduct({ id: editingProduct.id, name: editingProduct.name, price: Number(editingProduct.price || 0), active: true, restaurantId: store.activeRestaurantId }); setEditingProduct({ name: '', price: '' }); }}>Save</button>
            </div>
            {Object.values(store.products).map((p) => (
              <div className="list-item" key={p.id}>
                <span>{p.name} · ${p.price}</span>
                <div>
                  <button onClick={() => setEditingProduct({ id: p.id, name: p.name, price: String(p.price) })}>Edit</button>
                  <button className="danger" onClick={() => store.removeProduct(p.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {section === 'Staff' && (
          <div className="card">
            <h3>Staff Management</h3>
            <div className="inline-edit">
              <input placeholder="Name" value={newWaiter.name} onChange={(e) => setNewWaiter((s) => ({ ...s, name: e.target.value }))} />
              <input placeholder="4-digit PIN" maxLength={4} value={newWaiter.pin} onChange={(e) => setNewWaiter((s) => ({ ...s, pin: e.target.value }))} />
              <button onClick={() => { if (newWaiter.pin.length === 4 && newWaiter.name) { store.addWaiter(newWaiter.name, newWaiter.pin); setNewWaiter({ name: '', pin: '' }); } }}>Add</button>
            </div>
            {Object.values(store.users).filter((u) => u.role === 'WAITER').map((u) => (
              <div className="list-item" key={u.id}><span>{u.name} · PIN {u.pin}</span><button className="danger" onClick={() => store.removeUser(u.id)}>Remove</button></div>
            ))}
          </div>
        )}

        {section === 'Tables' && (
          <div className="card">
            <h3>Table Management</h3>
            <div className="inline-edit">
              <input placeholder="New table name" value={tableName} onChange={(e) => setTableName(e.target.value)} />
              <button onClick={() => { if (tableName) { store.upsertTable(tableName); setTableName(''); } }}>Create</button>
            </div>
            {Object.values(store.tables).map((t) => (
              <div key={t.id} className="list-item"><span>{t.name}</span><span className={t.status === 'OCCUPIED' ? 'badge occupied' : 'badge'}>{t.status}</span></div>
            ))}
          </div>
        )}

        {section === 'Settings' && (
          <div className="card stack-sm">
            <h3>Settings</h3>
            <label>Restaurant Name<input value={restaurant.name} onChange={(e) => store.setRestaurantName(e.target.value)} /></label>
            <label>Tax Rate<input type="number" step="0.01" value={restaurant.taxRate} onChange={(e) => store.setTaxRate(Number(e.target.value))} /></label>
          </div>
        )}
      </section>
    </div>
  );
}

function WaiterView() {
  const store = useAppStore();
  const [pin, setPin] = useState('');
  const [waiter, setWaiter] = useState<string>('');
  const [tableId, setTableId] = useState('');

  const sessions = useMemo(() => Object.values(store.customerSessions).filter((x) => x.tableId === tableId), [store.customerSessions, tableId]);

  if (!waiter) {
    return (
      <div className="mobile-shell dark">
        <h2>Waiter PIN Login</h2>
        <input value={pin} maxLength={4} onChange={(e) => setPin(e.target.value)} placeholder="Enter PIN" />
        <button onClick={() => { const user = store.waiterLogin(pin); if (user) setWaiter(user.name); }}>Login</button>
      </div>
    );
  }

  return (
    <div className="mobile-shell dark">
      <h2>Welcome, {waiter}</h2>
      <select value={tableId} onChange={(e) => setTableId(e.target.value)}>
        <option value="">Select table</option>
        {Object.values(store.tables).map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}
      </select>
      {tableId ? (
        <>
          <p>Who is this for?</p>
          {sessions.length === 0 ? <p className="empty">Waiting for customers...</p> : null}
          <div className="chips">
            {sessions.map((s) => <span key={s.id} className={store.lastAssignedCustomerByTable[tableId] === s.id ? 'chip active' : 'chip'}>{s.name}</span>)}
          </div>
          <div className="product-grid">
            {Object.values(store.products).filter((x) => x.active).map((p) => (
              <button key={p.id} className="product-btn" onClick={() => {
                const preferred = store.lastAssignedCustomerByTable[tableId] ?? sessions[0]?.id;
                if (!preferred) return;
                store.addOrderItemWithAssignment(tableId, p.id, preferred);
              }}>
                <b>{p.name}</b>
                <span>${p.price}</span>
              </button>
            ))}
          </div>
          <BillingPanel tableId={tableId} />
        </>
      ) : <p className="empty">Pick a table to start taking orders.</p>}
    </div>
  );
}

function CustomerView() {
  const store = useAppStore();
  const [tableId, setTableId] = useState('');
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');

  const order = useMemo(() => Object.values(store.orders).find((o) => o.tableId === tableId && o.status === 'OPEN'), [store.orders, tableId]);
  const items = useMemo(() => Object.values(store.orderItems).filter((x) => x.orderId === order?.id), [store.orderItems, order]);

  const myItems = items.filter((x) => x.assignedTo === sessionId);

  return (
    <div className="mobile-shell light">
      <h2>Customer View</h2>
      {!sessionId ? (
        <>
          <select value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">Choose table</option>
            {Object.values(store.tables).map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}
          </select>
          <input value={name} placeholder="Your name / alias" onChange={(e) => setName(e.target.value)} />
          <button onClick={() => { if (!name || !tableId) return; setSessionId(store.joinTable(tableId, name)); }}>Join table</button>
        </>
      ) : (
        <>
          <div className="card">
            <h3>My Items</h3>
            {myItems.length === 0 ? <p className="empty">No items yet.</p> : myItems.map((x) => <p key={x.id}>{store.products[x.productId]?.name} · ${store.products[x.productId]?.price} · {x.status}</p>)}
            <button onClick={() => store.markItemsAsPaid(sessionId, tableId)}>Pay My Part</button>
          </div>
          <BillingPanel tableId={tableId} />
        </>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="card"><p>{title}</p><h3>{value}</h3></div>;
}
