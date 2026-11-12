'use client';
import { useCallback, useEffect, useState } from 'react';
import { Wheat, RefreshCw, LogOut, Package, ShoppingBag, MapPin, X, Phone } from 'lucide-react';
import { money } from '@/lib/catalog';
import { BrandWord } from './brand-word';
import '@/app/admin/admin.css';
type Order = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  pincode: string;
  slot: string;
  total: number;
  status: string;
  paymentStatus: string;
  method: string;
  createdAt: string;
  items: { name: string; pack: string; quantity: number; total: number }[];
  history: { status: string; note: string | null; createdAt: string }[];
  payments: {
    gatewayOrderId: string;
    gatewayPaymentId: string | null;
    amount: number;
    status: string;
  }[];
};
type Variant = {
  id: string;
  price: number;
  mrp: number;
  stock: number;
  reserved: number;
  pack: string;
  product: { name: string };
};
type Zone = { pincode: string; fee: number; freeAbove: number; codLimit: number; active: boolean };
const transitions: Record<string, string[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};
async function request(url: string, options?: RequestInit) {
  const r = await fetch(url, { cache: 'no-store', ...options });
  const data = await r.json();
  if (r.status === 401) {
    window.location.assign('/admin/login');
    throw new Error('Session expired');
  }
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export default function LiveAdmin({ name = 'zebastore' }: { name?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [tab, setTab] = useState('Orders'),
    [orders, setOrders] = useState<Order[]>([]),
    [variants, setVariants] = useState<Variant[]>([]),
    [zones, setZones] = useState<Zone[]>([]),
    [slots, setSlots] = useState<
      { id: string; startsAt: string; endsAt: string; capacity: number; booked: number }[]
    >([]),
    [selected, setSelected] = useState<Order | null>(null),
    [query, setQuery] = useState(''),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Variant | null>(null);
  const reload = useCallback(async () => {
    try {
      const [o, c, z] = await Promise.all([
        request('/api/admin/orders?q=' + encodeURIComponent(query)),
        request('/api/admin/catalog'),
        request('/api/admin/zones'),
      ]);
      setOrders(o.orders);
      setCursor(o.nextCursor);
      setVariants(c.variants);
      setZones(z.zones);
      setSlots(z.slots);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load data');
    }
  }, [query]);
  useEffect(() => {
    const t = setTimeout(() => void reload(), 250);
    return () => clearTimeout(t);
  }, [reload]);
  useEffect(() => {
    const timer = setInterval(() => void reload(), 30000);
    return () => clearInterval(timer);
  }, [reload]);
  useEffect(() => {
    if (!selected && !editing) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null);
        setEditing(null);
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [selected, editing]);
  async function change(status: string, cashCollected: boolean) {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await request('/api/admin/orders/' + selected.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cashCollected }),
      });
      setSelected(result.order);
      setNotice('Order status saved.');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update order');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="brand" href="/">
          <Wheat />
          <div>
            <BrandWord name={name} />
            <small>LIVE MERCHANT WORKSPACE</small>
          </div>
        </a>
        <nav style={{ marginTop: 45 }}>
          {[
            { name: 'Orders', icon: ShoppingBag },
            { name: 'Inventory', icon: Package },
            { name: 'Delivery zones', icon: MapPin },
          ].map((t) => (
            <button
              className={tab === t.name ? 'current' : ''}
              key={t.name}
              disabled={!ready}
              onClick={() => setTab(t.name)}
            >
              <t.icon size={18} />
              {t.name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="/">← Storefront</a>
        </div>
      </aside>
      <div className="admin-content">
        <div className="admin-topbar">
          <strong>Live merchant workspace</strong>
          <div>
            <button onClick={() => void reload()} aria-label="Refresh orders">
              <RefreshCw size={17} />
            </button>
            <button
              onClick={async () => {
                await request('/api/admin/logout', { method: 'POST' });
                window.location.assign('/admin/login');
              }}
            >
              <LogOut size={17} /> Sign out
            </button>
          </div>
        </div>
        <main className="admin-main">
          <div className="admin-page-heading">
            <div>
              <span className="eyebrow">SAVED IN YOUR DATABASE</span>
              <h1>{tab}</h1>
              <p>
                Guest orders require you to confirm the customer’s phone and address before
                fulfilment.
              </p>
            </div>
          </div>
          <div className="filter-pills" style={{ margin: '20px 0' }}>
            {['Orders', 'Inventory', 'Delivery zones'].map((t) => (
              <button
                className={tab === t ? 'on' : ''}
                key={t}
                disabled={!ready}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {error && (
            <p className="demo-notice" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="delivery-progress">
              {notice}
              <button onClick={() => setNotice('')} aria-label="Dismiss">
                <X size={14} />
              </button>
            </p>
          )}
          {tab === 'Orders' && (
            <section className="admin-card">
              <div className="card-heading">
                <div>
                  <h2>Customer orders</h2>
                  <p>
                    Automatically refreshed every 30 seconds. Online orders are fulfilment-ready
                    only when paid.
                  </p>
                </div>
              </div>
              <div className="table-toolbar">
                <input
                  aria-label="Search saved orders"
                  className="admin-search"
                  placeholder="Order, customer or phone"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ORDER</th>
                      <th>CUSTOMER</th>
                      <th>AMOUNT</th>
                      <th>PAYMENT</th>
                      <th>STATUS</th>
                      <th>PLACED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <button className="order-id" onClick={() => setSelected(o)}>
                            {o.id}
                          </button>
                        </td>
                        <td>
                          <strong>{o.customerName}</strong>
                          <br />
                          {o.phone} · {o.pincode}
                        </td>
                        <td>{money(o.total)}</td>
                        <td>
                          {o.method} · {o.paymentStatus}
                          {o.status === 'CANCELLED' && o.paymentStatus === 'PAID' && (
                            <strong style={{ display: 'block', color: '#b33' }}>
                              Refund required
                            </strong>
                          )}
                        </td>
                        <td>{o.status}</td>
                        <td>
                          {new Date(o.createdAt).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!orders.length && <div className="empty">No saved orders yet.</div>}
              </div>
              {cursor && (
                <button
                  className="secondary full"
                  onClick={async () => {
                    try {
                      const data = await request(
                        '/api/admin/orders?q=' + encodeURIComponent(query) + '&cursor=' + cursor,
                      );
                      setOrders((o) => [...o, ...data.orders]);
                      setCursor(data.nextCursor);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Unable to load orders');
                    }
                  }}
                >
                  Load more orders
                </button>
              )}
            </section>
          )}
          {tab === 'Inventory' && (
            <section className="admin-card">
              <div className="card-heading">
                <div>
                  <h2>Prices and available stock</h2>
                  <p>Stock is physical quantity. Reserved packs are held for existing orders.</p>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>PRICE</th>
                      <th>PHYSICAL STOCK</th>
                      <th>RESERVED</th>
                      <th>AVAILABLE</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id}>
                        <td>
                          {v.product.name} · {v.pack}
                        </td>
                        <td>{money(v.price)}</td>
                        <td>{v.stock}</td>
                        <td>{v.reserved}</td>
                        <td>{v.stock - v.reserved}</td>
                        <td>
                          <button className="text-link" onClick={() => setEditing(v)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === 'Delivery zones' && (
            <>
              <section className="admin-card settings-card">
                <h2>Approved delivery pincodes</h2>
                <p>
                  Add only pincodes you can actually deliver to. Format alone does not prove
                  district or serviceability.
                </p>
                <form
                  className="form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    setBusy(true);
                    try {
                      await request('/api/admin/zones', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          pincode: form.get('pincode'),
                          fee: Math.round(Number(form.get('fee')) * 100),
                          freeAbove: Math.round(Number(form.get('freeAbove')) * 100),
                          codLimit: Math.round(Number(form.get('codLimit')) * 100),
                          active: form.get('active') === 'true',
                        }),
                      });
                      await reload();
                      setNotice('Delivery zone saved.');
                    } catch (error) {
                      setError(error instanceof Error ? error.message : 'Unable to save zone');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Pincode
                    <input
                      name="pincode"
                      pattern="[1-9][0-9]{5}"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      placeholder="192210"
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Delivery fee (₹)
                      <input
                        name="fee"
                        type="number"
                        min="0"
                        max="1000"
                        step="0.01"
                        defaultValue="39"
                        required
                      />
                    </label>
                    <label>
                      Free above (₹)
                      <input
                        name="freeAbove"
                        type="number"
                        min="0"
                        max="100000"
                        step="0.01"
                        defaultValue="999"
                        required
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      COD limit (₹)
                      <input
                        name="codLimit"
                        type="number"
                        min="0"
                        max="100000"
                        step="0.01"
                        defaultValue="25000"
                        required
                      />
                    </label>
                    <label>
                      Zone status
                      <select name="active">
                        <option value="true">Accept deliveries</option>
                        <option value="false">Pause deliveries</option>
                      </select>
                    </label>
                  </div>
                  <button className="primary" disabled={busy}>
                    Save delivery zone
                  </button>
                </form>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>PINCODE</th>
                        <th>FEE</th>
                        <th>FREE ABOVE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zones.map((z) => (
                        <tr key={z.pincode}>
                          <td>{z.pincode}</td>
                          <td>{money(z.fee)}</td>
                          <td>{money(z.freeAbove)}</td>
                          <td>{z.active ? 'Active' : 'Paused'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="admin-card settings-card" style={{ marginTop: 20 }}>
                <h2>Delivery slots</h2>
                <p>
                  Generate the next seven days with 10 AM–1 PM and 4 PM–7 PM slots, India time.
                  Cut-off is one hour before the start. Existing slot capacities are preserved.
                </p>
                <form
                  className="form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const capacity = Number(new FormData(e.currentTarget).get('capacity'));
                    setBusy(true);
                    try {
                      const result = await request('/api/admin/slots', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ days: 7, capacity }),
                      });
                      await reload();
                      setNotice(`${result.created} delivery slots created.`);
                    } catch (error) {
                      setError(error instanceof Error ? error.message : 'Unable to create slots');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Maximum orders per new slot
                    <input
                      name="capacity"
                      type="number"
                      min="1"
                      max="500"
                      defaultValue="20"
                      required
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Generate delivery slots
                  </button>
                </form>
                <p>
                  {slots.length} upcoming slots. {slots.reduce((sum, s) => sum + s.booked, 0)}{' '}
                  bookings.
                </p>
              </section>
            </>
          )}
        </main>
      </div>
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Saved order detail"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
              aria-label="Close order"
            >
              <X />
            </button>
            <span className="eyebrow">SAVED CUSTOMER ORDER</span>
            <h2>{selected.id}</h2>
            <p>
              <strong>{selected.customerName}</strong>
              <br />
              <a href={'tel:' + selected.phone}>
                <Phone size={12} /> {selected.phone}
              </a>
              <br />
              {selected.address} · {selected.pincode}
            </p>
            <p>
              {money(selected.total)} · {selected.method} · {selected.paymentStatus}
            </p>
            <p>
              Delivery:{' '}
              {slots.find((s) => s.id === selected.slot)
                ? new Date(slots.find((s) => s.id === selected.slot)!.startsAt).toLocaleString(
                    'en-IN',
                    { timeZone: 'Asia/Kolkata' },
                  )
                : selected.slot}
            </p>
            {selected.items.map((item, i) => (
              <p key={i}>
                {item.name} · {item.pack} × {item.quantity} <strong>{money(item.total)}</strong>
              </p>
            ))}
            <div className="form">
              <label>
                Next order status
                <select id="next-status" key={selected.status} defaultValue="">
                  <option value="" disabled>
                    Choose next status
                  </option>
                  {(transitions[selected.status] || []).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {selected.method === 'COD' && (
                <label style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <input type="checkbox" id="cod-collected" style={{ width: 18 }} /> I confirm the
                  full COD amount was collected (required for delivery).
                </label>
              )}
              <button
                className="primary"
                disabled={busy || !(transitions[selected.status] || []).length}
                onClick={() => {
                  const status = (document.getElementById('next-status') as HTMLSelectElement)
                    ?.value;
                  const collected = (document.getElementById('cod-collected') as HTMLInputElement)
                    ?.checked;
                  if (status) void change(status, !!collected);
                }}
              >
                Save order status
              </button>
            </div>
            {selected.payments?.length > 0 && (
              <>
                <h3>Payment references</h3>
                {selected.payments.map((payment) => (
                  <p key={payment.gatewayOrderId}>
                    Gateway order: {payment.gatewayOrderId}
                    <br />
                    Payment: {payment.gatewayPaymentId || 'Awaiting payment'}
                    <br />
                    {money(payment.amount)} · {payment.status}
                  </p>
                ))}
                <a
                  className="text-link"
                  href="https://dashboard.razorpay.com/app/payments"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Razorpay dashboard
                </a>
              </>
            )}
            <h3>Status history</h3>
            {selected.history.map((h, i) => (
              <p className="muted" key={i}>
                {h.status} · {h.note} ·{' '}
                {new Date(h.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            ))}
            <p className="demo-notice">
              For paid-order refunds, use the authenticated Razorpay dashboard. Confirm the correct
              payment before refunding; signed refund webhooks update the order.
            </p>
          </section>
        </div>
      )}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit inventory"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close inventory"
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
            <h2>{editing.product.name}</h2>
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                setBusy(true);
                try {
                  await request('/api/admin/catalog', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: editing.id,
                      price: Math.round(Number(form.get('price')) * 100),
                      mrp: Math.round(Number(form.get('mrp')) * 100),
                      stock: Number(form.get('stock')),
                    }),
                  });
                  setEditing(null);
                  await reload();
                  setNotice('Inventory saved.');
                } catch (error) {
                  setError(error instanceof Error ? error.message : 'Unable to save inventory');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Selling price (₹)
                <input
                  type="number"
                  name="price"
                  min="1"
                  step="0.01"
                  defaultValue={editing.price / 100}
                  required
                />
              </label>
              <label>
                MRP (₹)
                <input
                  type="number"
                  name="mrp"
                  min="1"
                  step="0.01"
                  defaultValue={editing.mrp / 100}
                  required
                />
              </label>
              <label>
                Physical stock
                <input
                  type="number"
                  name="stock"
                  min={editing.reserved}
                  max="1000000"
                  defaultValue={editing.stock}
                  required
                />
              </label>
              <small>{editing.reserved} packs are reserved and cannot be removed.</small>
              <button className="primary" disabled={busy}>
                Save inventory
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
