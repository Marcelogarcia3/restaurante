'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { selectors, useSyncroStore } from '@/lib/store';

type View = 'ADMIN' | 'WAITER' | 'CUSTOMER';
type AdminSection = 'DASHBOARD' | 'MENU' | 'STAFF' | 'TABLES' | 'SETTINGS';

export default function Page() {
  const [view, setView] = useState<View>('ADMIN');
  const ensureSeeded = useSyncroStore((s) => s.ensureSeeded);
  useEffect(() => ensureSeeded(), [ensureSeeded]);

  return (
    <main className="app-shell">
      <header className="top-switcher card">
        <h1>SyncroTable</h1>
        <div className="tabs">
          {(['ADMIN', 'WAITER', 'CUSTOMER'] as View[]).map((v) => (
            <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
      </header>
      {view === 'ADMIN' && <AdminPanel />}
      {view === 'WAITER' && <WaiterPanel />}
      {view === 'CUSTOMER' && <CustomerPanel />}
    </main>
  );
}

function AdminPanel() {
  const [section, setSection] = useState<AdminSection>('DASHBOARD');
  const restaurant = useSyncroStore(selectors.restaurant);
  const resetDemoData = useSyncroStore((s) => s.resetDemoData);

  return (
    <div className="admin-layout">
      <aside className="sidebar card">
        {(['DASHBOARD', 'MENU', 'STAFF', 'TABLES', 'SETTINGS'] as AdminSection[]).map((sec) => (
          <button key={sec} className={section === sec ? 'active' : ''} onClick={() => setSection(sec)}>{sec}</button>
        ))}
        <button className="danger" onClick={resetDemoData}>Reset Demo</button>
      </aside>
      <section className="content card">
        <div className="content-top"><h2>{restaurant?.name}</h2></div>
        {section === 'DASHBOARD' && <DashboardSection />}
        {section === 'MENU' && <MenuSection />}
        {section === 'STAFF' && <StaffSection />}
        {section === 'TABLES' && <TablesSection />}
        {section === 'SETTINGS' && <SettingsSection />}
      </section>
    </div>
  );
}

function DashboardSection() {
  const db = useSyncroStore((s) => s.db);
  const metrics = useMemo(() => {
    const items = Object.values(db.orderItems);
    const products = db.products;
    const totalSales = items.reduce((sum, i) => sum + (i.status === 'PAID' ? products[i.productId]?.price ?? 0 : 0), 0);
    const activeTables = Object.values(db.tables).filter((t) => t.status === 'OCCUPIED').length;
    const itemsSold = items.filter((i) => i.status === 'PAID').length;
    return { totalSales, activeTables, itemsSold };
  }, [db]);

  const chartData = useMemo(() => Object.values(db.tables).map((t) => {
    const order = Object.values(db.orders).find((o) => o.tableId === t.id && o.status === 'OPEN');
    const count = order ? Object.values(db.orderItems).filter((i) => i.orderId === order.id).length : 0;
    return { table: t.name, items: count };
  }), [db]);

  return <div>
    <div className="metrics-grid">
      <article className="card metric"><span>Total sales</span><strong>${metrics.totalSales.toFixed(2)}</strong></article>
      <article className="card metric"><span>Active tables</span><strong>{metrics.activeTables}</strong></article>
      <article className="card metric"><span>Items sold</span><strong>{metrics.itemsSold}</strong></article>
    </div>
    <div className="card" style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="table" /><YAxis /><Tooltip /><Bar dataKey="items" fill="#10b981" radius={10} /></BarChart>
      </ResponsiveContainer>
    </div>
  </div>;
}

function MenuSection() {
  const products = useSyncroStore((s) => Object.values(s.db.products));
  const addProduct = useSyncroStore((s) => s.addProduct);
  const updateProduct = useSyncroStore((s) => s.updateProduct);
  const removeProduct = useSyncroStore((s) => s.removeProduct);

  return <div className="stack">{products.map((p) => <div className="row card" key={p.id}>
    <input value={p.name} onChange={(e) => updateProduct(p.id, { name: e.target.value })} />
    <input type="number" value={p.price} onChange={(e) => updateProduct(p.id, { price: Number(e.target.value) })} />
    <button onClick={() => removeProduct(p.id)}>Delete</button>
  </div>)}
  <button onClick={() => addProduct('New Item', 9.9)}>+ Add Product</button></div>;
}

function StaffSection() {
  const users = useSyncroStore((s) => Object.values(s.db.users).filter((u) => u.role === 'WAITER'));
  const addWaiter = useSyncroStore((s) => s.addWaiter);
  const removeUser = useSyncroStore((s) => s.removeUser);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  return <div className="stack">
    {users.map((u) => <div key={u.id} className="row card"><span>{u.name} ({u.pin})</span><button onClick={() => removeUser(u.id)}>Remove</button></div>)}
    <div className="row card"><input placeholder="Waiter name" value={name} onChange={(e) => setName(e.target.value)} /><input placeholder="4-digit PIN" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} /><button onClick={() => { if (name && pin.length === 4) { addWaiter(name, pin); setName(''); setPin(''); } }}>Add</button></div>
  </div>;
}

function TablesSection() {
  const tables = useSyncroStore((s) => Object.values(s.db.tables));
  const upsertTable = useSyncroStore((s) => s.upsertTable);
  return <div className="stack">{tables.length === 0 ? <div className="empty">No tables yet. Create one now.</div> : tables.map((t) =>
    <div key={t.id} className="row card"><input value={t.name} onChange={(e) => upsertTable(t.id, e.target.value)} /><span>{t.status}</span></div>)}
    <button onClick={() => upsertTable(null, `Table ${tables.length + 1}`)}>+ New Table</button></div>;
}

function SettingsSection() {
  const restaurant = useSyncroStore(selectors.restaurant);
  const updateSettings = useSyncroStore((s) => s.updateSettings);
  if (!restaurant) return null;
  return <div className="stack">
    <label>Restaurant Name<input value={restaurant.name} onChange={(e) => updateSettings({ name: e.target.value })} /></label>
    <label>Tax Rate<input type="number" value={restaurant.taxRate} onChange={(e) => updateSettings({ taxRate: Number(e.target.value) })} /></label>
    <label>Default Billing Mode<select value={restaurant.defaultBillingMode} onChange={(e) => updateSettings({ defaultBillingMode: e.target.value as 'JOINT' | 'INDIVIDUAL' })}><option>JOINT</option><option>INDIVIDUAL</option></select></label>
  </div>;
}

function WaiterPanel() {
  const waiterUserId = useSyncroStore((s) => s.waiterUserId);
  const waiterLoginByPin = useSyncroStore((s) => s.waiterLoginByPin);
  const tables = useSyncroStore((s) => Object.values(s.db.tables));
  const products = useSyncroStore(selectors.products);
  const db = useSyncroStore((s) => s.db);
  const selectedTableId = useSyncroStore((s) => s.selectedTableId);
  const setSelectedTable = useSyncroStore((s) => s.setSelectedTable);
  const addOrderItemWithAssignment = useSyncroStore((s) => s.addOrderItemWithAssignment);
  const [pin, setPin] = useState('');

  if (!waiterUserId) return <section className="mobile card"><h3>Waiter Login</h3><input placeholder="4-digit PIN" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} /><button onClick={() => waiterLoginByPin(pin)}>Login</button></section>;

  const sessions = Object.values(db.customerSessions).filter((cs) => cs.tableId === selectedTableId && cs.active);

  return <section className="mobile card">
    <h3>Waiter Console</h3>
    <div className="chip-wrap">{tables.map((t) => <button key={t.id} className={selectedTableId === t.id ? 'active' : ''} onClick={() => setSelectedTable(t.id)}>{t.name}</button>)}</div>
    {!selectedTableId ? <div className="empty">Select a table to start taking orders.</div> :
      <div className="stack">{products.map((p) => <div key={p.id} className="row card">
        <span>{p.name} - ${p.price.toFixed(2)}</span>
        <select onChange={(e) => addOrderItemWithAssignment(selectedTableId, p.id, e.target.value || null)} defaultValue="">
          <option value="">Who is this for?</option>
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>)}
      {sessions.length === 0 && <div className="empty">Waiting for customers...</div>}
      </div>}
  </section>;
}

function CustomerPanel() {
  const tables = useSyncroStore((s) => Object.values(s.db.tables));
  const db = useSyncroStore((s) => s.db);
  const joinTableAsCustomer = useSyncroStore((s) => s.joinTableAsCustomer);
  const customerViewSessionId = useSyncroStore((s) => s.customerViewSessionId);
  const setCustomerViewSessionId = useSyncroStore((s) => s.setCustomerViewSessionId);
  const billingMode = useSyncroStore((s) => s.billingMode);
  const setBillingMode = useSyncroStore((s) => s.setBillingMode);
  const markItemsAsPaid = useSyncroStore((s) => s.markItemsAsPaid);
  const [tableId, setTableId] = useState('');
  const [name, setName] = useState('');

  const session = customerViewSessionId ? db.customerSessions[customerViewSessionId] : null;
  const order = session ? Object.values(db.orders).find((o) => o.tableId === session.tableId && o.status === 'OPEN') : null;
  const tableItems = useMemo(() => !order ? [] : Object.values(db.orderItems).filter((i) => i.orderId === order.id), [db.orderItems, order]);
  const myItems = useMemo(() => tableItems.filter((i) => i.assignedTo === session?.id), [tableItems, session]);

  return <section className="mobile card customer">
    <h3>Customer View</h3>
    {!session ? <div className="stack">
      <select value={tableId} onChange={(e) => setTableId(e.target.value)}><option value="">Select table</option>{tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      <button onClick={() => tableId && name && joinTableAsCustomer(tableId, name)}>Join Table</button>
    </div> : <>
      <div className="row"><strong>Hi {session.name}</strong><button onClick={() => setCustomerViewSessionId(null)}>Switch</button></div>
      <div className="tabs"><button className={billingMode === 'JOINT' ? 'active' : ''} onClick={() => setBillingMode('JOINT')}>Table Bill</button><button className={billingMode === 'INDIVIDUAL' ? 'active' : ''} onClick={() => setBillingMode('INDIVIDUAL')}>My Items</button></div>
      {billingMode === 'INDIVIDUAL' ? <BillList title="My Items" items={myItems} db={db} /> : <JointBill items={tableItems} db={db} sessions={db.customerSessions} />}
      <button onClick={() => markItemsAsPaid(session.id)}>Pay My Part</button>
    </>}
  </section>;
}

function BillList({ title, items, db }: { title: string; items: { id: string; productId: string; status: 'PENDING' | 'PAID'; assignedTo: string | null }[]; db: ReturnType<typeof useSyncroStore.getState>['db'] }) {
  const total = items.reduce((sum, i) => sum + (db.products[i.productId]?.price ?? 0), 0);
  return <div className="stack"><h4>{title}</h4>{items.length === 0 ? <div className="empty">No items yet</div> : items.map((i) => <div className="row card" key={i.id}><span>{db.products[i.productId]?.name}</span><span>${db.products[i.productId]?.price.toFixed(2)} · {i.status}</span></div>)}<div className="row"><strong>Total</strong><strong>${total.toFixed(2)}</strong></div></div>;
}

function JointBill({ items, db, sessions }: { items: { id: string; productId: string; status: 'PENDING' | 'PAID'; assignedTo: string | null }[]; db: ReturnType<typeof useSyncroStore.getState>['db']; sessions: ReturnType<typeof useSyncroStore.getState>['db']['customerSessions'] }) {
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.assignedTo ? sessions[item.assignedTo]?.name ?? 'Unknown' : 'Shared';
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});

  return <div className="stack">{Object.keys(grouped).length === 0 ? <div className="empty">No items yet</div> : Object.entries(grouped).map(([k, arr]) =>
    <div key={k} className="card stack"><h4>{k}</h4>{arr.map((i) => <div className="row" key={i.id}><span>{db.products[i.productId]?.name}</span><span>${db.products[i.productId]?.price.toFixed(2)}</span></div>)}</div>)}</div>;
}
