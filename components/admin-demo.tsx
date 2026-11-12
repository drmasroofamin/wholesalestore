'use client';
import { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  IndianRupee,
  LayoutDashboard,
  Leaf,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Wheat,
  X,
} from 'lucide-react';
import { money, products } from '@/lib/catalog';
import '@/app/admin/admin.css';
const initialOrders = [
  {
    id: 'GG-1048',
    customer: 'Aamina Khan',
    type: 'Household',
    items: 4,
    total: 124700,
    method: 'UPI',
    payment: 'Paid',
    status: 'Confirmed',
    time: '10:42 AM',
  },
  {
    id: 'GG-1047',
    customer: 'Bhat General Store',
    type: 'Retailer',
    items: 12,
    total: 1845000,
    method: 'Khata',
    payment: 'Credit due',
    status: 'Packed',
    time: '10:35 AM',
  },
  {
    id: 'GG-1046',
    customer: 'Imran Ahmad',
    type: 'Household',
    items: 3,
    total: 86400,
    method: 'COD',
    payment: 'COD pending',
    status: 'Placed',
    time: '10:18 AM',
  },
  {
    id: 'GG-1045',
    customer: 'Valley Mart',
    type: 'Retailer',
    items: 8,
    total: 964000,
    method: 'Bank transfer',
    payment: 'Paid',
    status: 'Out for delivery',
    time: '10:02 AM',
  },
  {
    id: 'GG-1044',
    customer: 'Sana Mir',
    type: 'Household',
    items: 5,
    total: 163500,
    method: 'UPI',
    payment: 'Paid',
    status: 'Delivered',
    time: '9:45 AM',
  },
  {
    id: 'GG-1043',
    customer: 'Kashmir Provisions',
    type: 'Retailer',
    items: 20,
    total: 3240000,
    method: 'Khata',
    payment: 'Credit due',
    status: 'Confirmed',
    time: '9:32 AM',
  },
];
const tabs = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Orders', icon: ShoppingBag },
  { name: 'Products', icon: Package },
  { name: 'Inventory', icon: ClipboardList },
  { name: 'Customers', icon: Users },
  { name: 'Retailers', icon: Building2 },
  { name: 'Delivery', icon: Truck },
  { name: 'Payments', icon: Wallet },
  { name: 'Reports', icon: TrendingUp },
  { name: 'Settings', icon: Settings },
];
export default function Admin() {
  const [tab, setTab] = useState('Overview'),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('All statuses'),
    [orders, setOrders] = useState(initialOrders),
    [selection, setSelection] = useState<string[]>([]),
    [selected, setSelected] = useState<(typeof initialOrders)[number] | null>(null),
    [inventory, setInventory] = useState(products.map((p) => ({ ...p }))),
    [notice, setNotice] = useState(''),
    [menu, setMenu] = useState(false),
    [retailers, setRetailers] = useState([
      { name: 'Zainab Provision Store', owner: 'Zainab Bhat', status: 'Pending', limit: 2500000 },
      { name: 'Valley Mart', owner: 'Faizan Mir', status: 'Approved', limit: 5000000 },
      { name: 'Kashmir Provisions', owner: 'Tariq Dar', status: 'Approved', limit: 7500000 },
    ]);
  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.id + ' ' + o.customer).toLowerCase().includes(query.toLowerCase()) &&
          (status === 'All statuses' || o.status === status),
      ),
    [orders, query, status],
  );
  function exportCSV() {
    const rows =
      tab === 'Products' || tab === 'Inventory'
        ? [
            ['Product', 'Pack', 'Price (paise)', 'Stock'],
            ...inventory.map((p) => [p.name, p.pack, p.price, p.stock]),
          ]
        : [
            ['Order', 'Customer', 'Total (paise)', 'Payment', 'Status'],
            ...filtered.map((o) => [o.id, o.customer, o.total, o.payment, o.status]),
          ];
    const blob = new Blob(
      [
        rows
          .map((row) => row.map((cell) => '"' + String(cell).replaceAll('"', '""') + '"').join(','))
          .join('\n'),
      ],
      { type: 'text/csv;charset=utf-8;' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'grain-good-demo-export.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function updateStatus(id: string, next: string) {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status: next } : o)));
    if (selected?.id === id) setSelected({ ...selected, status: next });
    setNotice('Demo order updated in this session.');
  }
  return (
    <div className="admin-shell">
      <aside className={menu ? 'admin-sidebar open' : 'admin-sidebar'}>
        <a href="/" className="brand">
          <Wheat size={28} />
          <div>
            grain<span>&</span>good<small>MERCHANT WORKSPACE</small>
          </div>
        </a>
        <span className="sidebar-caption">YOUR WORKSPACE</span>
        <nav>
          {tabs.map((t) => (
            <button
              key={t.name}
              className={tab === t.name ? 'current' : ''}
              onClick={() => {
                setTab(t.name);
                setQuery('');
                setStatus('All statuses');
                setMenu(false);
              }}
            >
              <t.icon size={18} />
              {t.name}
              {t.name === 'Orders' && <b>24</b>}
              {t.name === 'Retailers' && <span className="notification-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div>
            <Leaf size={21} />
            <strong>A little better, every day.</strong>
            <p>
              Good business starts with
              <br />
              good essentials.
            </p>
          </div>
          <a href="/">
            <ArrowLeft size={15} /> Back to storefront
          </a>
          <div className="admin-user">
            <span>MA</span>
            <div>
              <strong>Merchant Admin</strong>
              <small>Demo workspace</small>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <div className="admin-content">
        <div className="admin-topbar">
          <div>
            <button
              className="sidebar-toggle"
              onClick={() => setMenu(!menu)}
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{tab}</strong>
          </div>
          <div>
            <span className="demo-chip">
              <span /> DEMO MODE
            </span>
            <button
              aria-label="Notifications"
              onClick={() =>
                setNotice('3 sample alerts: low stock, pending retailer approval, and credit due.')
              }
            >
              <Bell size={18} />
            </button>
            <span className="admin-avatar">MA</span>
          </div>
        </div>
        <main className="admin-main">
          <div className="admin-page-heading">
            <div>
              <span className="eyebrow">A GOOD DAY TO GROW</span>
              <h1>{tab === 'Overview' ? 'Your business, at a glance.' : tab}</h1>
              <p>
                {tab === 'Overview'
                  ? 'A little clarity for a whole lot of goodness.'
                  : `Manage your ${tab.toLowerCase()} in one place.`}
              </p>
            </div>
            <div className="admin-actions">
              <span className="today-date">
                {new Intl.DateTimeFormat('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'Asia/Kolkata',
                }).format(new Date())}
              </span>
              <button className="secondary" onClick={exportCSV}>
                <ArrowDownToLine size={14} /> Export
              </button>
            </div>
          </div>
          <div className="admin-demo-banner">
            <ShieldCheck size={15} /> Sample data workspace. Changes are session-only; no live
            orders or customer records are accessible.
          </div>
          {(tab === 'Overview' || tab === 'Reports') && (
            <>
              <div className="metric-grid">
                {[
                  {
                    label: "Today's revenue",
                    value: '₹48,650',
                    change: '+18.6%',
                    note: 'vs. yesterday',
                    icon: IndianRupee,
                    trend: [12, 20, 16, 24, 20, 34, 30, 42, 35, 50],
                  },
                  {
                    label: "Today's orders",
                    value: '64',
                    change: '+12.3%',
                    note: '24 need your attention',
                    icon: ShoppingBag,
                    trend: [15, 22, 20, 27, 25, 23, 36, 39, 35, 49],
                  },
                  {
                    label: 'Outstanding credit',
                    value: '₹1,24,800',
                    change: '8 retailers',
                    note: '₹24,500 due this week',
                    icon: Wallet,
                    trend: [42, 36, 39, 34, 36, 29, 31, 25, 30, 22],
                  },
                  {
                    label: 'Low-stock products',
                    value: '06',
                    change: 'Action needed',
                    note: 'Keep your shelves stocked',
                    icon: Package,
                    trend: [19, 27, 22, 26, 28, 31, 27, 34, 30, 37],
                  },
                ].map((m, i) => (
                  <div className="metric" key={m.label}>
                    <div>
                      <span>{m.label}</span>
                      <m.icon size={17} />
                    </div>
                    <strong>{m.value}</strong>
                    <div className="metric-bottom">
                      <span className={i > 1 ? 'neutral' : ''}>
                        {i < 2 && <TrendingUp size={11} />} {m.change}
                      </span>
                      <svg viewBox="0 0 100 50" aria-label="Sample sparkline">
                        <polyline
                          points={m.trend.map((v, j) => `${j * 11},${55 - v}`).join(' ')}
                          fill="none"
                          stroke={i === 3 ? '#c3a063' : '#779169'}
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <small>{m.note}</small>
                  </div>
                ))}
              </div>
              <div className="analytics-grid">
                <section className="admin-card revenue-chart">
                  <div className="card-heading">
                    <div>
                      <h2>Sales overview</h2>
                      <p>A healthy week for your business</p>
                    </div>
                    <select
                      aria-label="Sales period"
                      onChange={(e) =>
                        setNotice(
                          `${e.target.value} selected. Chart displays illustrative sample data.`,
                        )
                      }
                    >
                      <option>This week</option>
                      <option>Last week</option>
                      <option>This month</option>
                    </select>
                  </div>
                  <div className="chart-legend">
                    <span />
                    <small>Households</small>
                    <span />
                    <small>Retailers</small>
                    <strong>
                      ₹2,84,650 <em>↗ 16.8%</em>
                    </strong>
                  </div>
                  <div className="bar-chart">
                    <div className="chart-axis">
                      <span>₹60k</span>
                      <span>₹45k</span>
                      <span>₹30k</span>
                      <span>₹15k</span>
                      <span>₹0</span>
                    </div>
                    <div className="chart-bars">
                      {[42, 57, 49, 73, 62, 88, 79].map((n, i) => (
                        <div className="bar-group" key={i}>
                          <div className="bar-area">
                            <div style={{ height: n * 0.68 + '%' }} />
                            <div style={{ height: n + '%' }} />
                          </div>
                          <span>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
                <section className="admin-card attention-card">
                  <div className="card-heading">
                    <h2>Needs a little attention</h2>
                    <span className="count-badge">3</span>
                  </div>
                  {[
                    {
                      icon: ShoppingBag,
                      title: '24 orders to prepare',
                      text: 'Fresh orders are waiting to be packed.',
                      to: 'Orders',
                      color: 'green',
                    },
                    {
                      icon: Package,
                      title: '6 products running low',
                      text: 'A quick restock goes a long way.',
                      to: 'Inventory',
                      color: 'gold',
                    },
                    {
                      icon: Building2,
                      title: '1 retailer awaiting approval',
                      text: 'Welcome a new business to the family.',
                      to: 'Retailers',
                      color: 'brown',
                    },
                  ].map((a) => (
                    <button className="attention-item" key={a.title} onClick={() => setTab(a.to)}>
                      <span className={a.color}>
                        <a.icon size={18} />
                      </span>
                      <div>
                        <strong>{a.title}</strong>
                        <p>{a.text}</p>
                      </div>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                  <div className="attention-footer">
                    <Leaf size={14} /> Small actions. A smoother business.
                  </div>
                </section>
              </div>
            </>
          )}
          {(tab === 'Overview' || tab === 'Orders') && (
            <section className="admin-card orders-card">
              <div className="card-heading">
                <div>
                  <h2>{tab === 'Overview' ? 'Recent orders' : 'All orders'}</h2>
                  <p>Every order is a little trust in your business.</p>
                </div>
                {tab === 'Overview' && (
                  <button className="text-link" onClick={() => setTab('Orders')}>
                    View all orders <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
              <div className="table-toolbar">
                <div className="admin-search">
                  <Search size={15} />
                  <input
                    aria-label="Search orders"
                    placeholder="Search order ID or customer…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter orders by status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {[
                    'All statuses',
                    'Placed',
                    'Confirmed',
                    'Packed',
                    'Out for delivery',
                    'Delivered',
                    'Cancelled',
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                {selection.length > 0 && (
                  <button
                    className="bulk-button"
                    onClick={() => {
                      selection.forEach((id) => updateStatus(id, 'Confirmed'));
                      setSelection([]);
                    }}
                  >
                    Confirm {selection.length} orders
                  </button>
                )}
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Select all orders"
                          checked={
                            filtered.length > 0 && filtered.every((o) => selection.includes(o.id))
                          }
                          onChange={(e) =>
                            setSelection(e.target.checked ? filtered.map((o) => o.id) : [])
                          }
                        />
                      </th>
                      <th>ORDER ID</th>
                      <th>CUSTOMER</th>
                      <th>AMOUNT</th>
                      <th>PAYMENT</th>
                      <th>STATUS</th>
                      <th>TIME</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select ${o.id}`}
                            checked={selection.includes(o.id)}
                            onChange={(e) =>
                              setSelection((s) =>
                                e.target.checked ? [...s, o.id] : s.filter((i) => i !== o.id),
                              )
                            }
                          />
                        </td>
                        <td>
                          <button className="order-id" onClick={() => setSelected(o)}>
                            {o.id}
                          </button>
                        </td>
                        <td>
                          <div className="customer-cell">
                            <span className={o.type === 'Retailer' ? 'retailer-avatar' : ''}>
                              {o.customer
                                .split(' ')
                                .map((s) => s[0])
                                .slice(0, 2)
                                .join('')}
                            </span>
                            <div>
                              <strong>{o.customer}</strong>
                              <small>
                                {o.type} · {o.items} items
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="amount-cell">{money(o.total)}</td>
                        <td>
                          <div className={'payment-label ' + (o.payment === 'Paid' ? 'paid' : '')}>
                            {o.payment === 'Paid' && <span />}
                            {o.payment}
                          </div>
                          <small className="payment-method">{o.method}</small>
                        </td>
                        <td>
                          <span
                            className={
                              'status-label status-' + o.status.toLowerCase().replaceAll(' ', '-')
                            }
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="time-cell">{o.time}</td>
                        <td>
                          <button aria-label={`Open ${o.id}`} onClick={() => setSelected(o)}>
                            <MoreHorizontal size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && <div className="empty">No orders match these filters.</div>}
              </div>
              <div className="table-bottom">
                <span>Showing {filtered.length} sample orders</span>
                <span>
                  <span className="live-dot" /> Demo data · session only
                </span>
              </div>
            </section>
          )}
          {(tab === 'Products' || tab === 'Inventory') && (
            <section className="admin-card">
              <div className="card-heading">
                <div>
                  <h2>
                    {tab === 'Inventory'
                      ? 'Keep the goodness in stock'
                      : 'Your essential catalogue'}
                  </h2>
                  <p>
                    Edit sample {tab === 'Inventory' ? 'stock quantities' : 'prices'} below. Values
                    remain in this session.
                  </p>
                </div>
              </div>
              <div className="table-toolbar">
                <div className="admin-search">
                  <Search size={15} />
                  <input
                    aria-label="Search catalogue"
                    placeholder="Search products…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>CATEGORY</th>
                      <th>PACK</th>
                      <th>PRICE</th>
                      <th>STOCK</th>
                      <th>AVAILABILITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory
                      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="customer-cell">
                              <img src={p.image} width="35" height="44" alt="" />
                              <strong>{p.name}</strong>
                            </div>
                          </td>
                          <td>{p.category}</td>
                          <td>{p.pack}</td>
                          <td>
                            {tab === 'Products' ? (
                              <input
                                className="editable-cell"
                                aria-label={`Price of ${p.name} in rupees`}
                                type="number"
                                min="1"
                                value={p.price / 100}
                                onChange={(e) =>
                                  setInventory((items) =>
                                    items.map((i) =>
                                      i.id === p.id
                                        ? {
                                            ...i,
                                            price: Math.max(
                                              100,
                                              Math.round(Number(e.target.value) * 100),
                                            ),
                                          }
                                        : i,
                                    ),
                                  )
                                }
                              />
                            ) : (
                              money(p.price)
                            )}
                          </td>
                          <td>
                            {tab === 'Inventory' ? (
                              <input
                                className="editable-cell"
                                aria-label={`Stock of ${p.name}`}
                                type="number"
                                min="0"
                                max="100000"
                                value={p.stock}
                                onChange={(e) =>
                                  setInventory((items) =>
                                    items.map((i) =>
                                      i.id === p.id
                                        ? {
                                            ...i,
                                            stock: Math.max(
                                              0,
                                              Math.min(100000, Math.floor(Number(e.target.value))),
                                            ),
                                          }
                                        : i,
                                    ),
                                  )
                                }
                              />
                            ) : (
                              p.stock
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                'status-label ' +
                                (p.stock > 10 ? 'status-delivered' : 'status-placed')
                              }
                            >
                              {p.stock === 0
                                ? 'Out of stock'
                                : p.stock <= 10
                                  ? 'Low stock'
                                  : 'In stock'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="table-bottom">
                Demo changes do not modify the storefront catalogue or database.
              </div>
            </section>
          )}
          {tab === 'Retailers' && (
            <section className="admin-card">
              <div className="card-heading">
                <div>
                  <h2>Your business community</h2>
                  <p>Sample approval and credit controls. No real credit is granted.</p>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>BUSINESS</th>
                      <th>OWNER</th>
                      <th>CREDIT LIMIT</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retailers.map((r) => (
                      <tr key={r.name}>
                        <td>
                          <strong>{r.name}</strong>
                        </td>
                        <td>{r.owner}</td>
                        <td>{money(r.limit)}</td>
                        <td>
                          <span
                            className={
                              'status-label ' +
                              (r.status === 'Approved' ? 'status-delivered' : 'status-placed')
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td>
                          {r.status === 'Pending' ? (
                            <div className="approval-actions">
                              <button
                                onClick={() =>
                                  setRetailers((rs) =>
                                    rs.map((x) =>
                                      x.name === r.name ? { ...x, status: 'Approved' } : x,
                                    ),
                                  )
                                }
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  setRetailers((rs) =>
                                    rs.map((x) =>
                                      x.name === r.name ? { ...x, status: 'Rejected' } : x,
                                    ),
                                  )
                                }
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <Check size={15} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === 'Customers' && (
            <section className="admin-card">
              <div className="card-heading">
                <h2>The people behind every order</h2>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>CUSTOMER</th>
                      <th>TYPE</th>
                      <th>SAMPLE ORDER</th>
                      <th>VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>{o.customer}</td>
                        <td>{o.type}</td>
                        <td>
                          <button onClick={() => setSelected(o)}>{o.id}</button>
                        </td>
                        <td>{money(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === 'Delivery' && (
            <section className="admin-card">
              <div className="card-heading">
                <div>
                  <h2>Goodness on the move</h2>
                  <p>Sample delivery assignments</p>
                </div>
              </div>
              {orders
                .filter((o) => ['Packed', 'Out for delivery'].includes(o.status))
                .map((o) => (
                  <div className="delivery-row" key={o.id}>
                    <div>
                      <strong>
                        {o.id} · {o.customer}
                      </strong>
                      <p>{o.items} items · Srinagar · 4 PM – 7 PM</p>
                    </div>
                    <select
                      aria-label={`Delivery status for ${o.id}`}
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    >
                      <option>Packed</option>
                      <option>Out for delivery</option>
                      <option>Delivered</option>
                    </select>
                  </div>
                ))}
            </section>
          )}
          {tab === 'Payments' && (
            <section className="admin-card">
              <div className="card-heading">
                <div>
                  <h2>Every rupee, accounted for.</h2>
                  <p>Illustrative payment reconciliation. No gateway is connected.</p>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ORDER</th>
                      <th>METHOD</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>{o.id}</td>
                        <td>{o.method}</td>
                        <td>{money(o.total)}</td>
                        <td>
                          <span
                            className={
                              'status-label ' +
                              (o.payment === 'Paid' ? 'status-delivered' : 'status-placed')
                            }
                          >
                            {o.payment}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === 'Settings' && (
            <section className="admin-card settings-card">
              <h2>Store settings</h2>
              <p>
                Production settings must be configured on the server. This workspace cannot enable
                live payments.
              </p>
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setNotice('Demo preferences saved for this session.');
                }}
              >
                <label>
                  Store name
                  <input defaultValue="Grain & Good" required />
                </label>
                <label>
                  Demo delivery pincodes
                  <input defaultValue="Any valid six-digit Indian pincode (demo only)" readOnly />
                </label>
                <label>
                  Free delivery above (₹)
                  <input type="number" defaultValue="999" min="0" />
                </label>
                <label>
                  Cash on delivery limit (₹)
                  <input type="number" defaultValue="25000" min="0" max="25000" />
                </label>
                <button className="primary">Save demo preferences</button>
              </form>
            </section>
          )}
          <div className="admin-footnote">
            <Leaf size={12} /> Made for the way your business grows.
            <span>Grain & Good · Merchant workspace</span>
          </div>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Order detail"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" aria-label="Close" onClick={() => setSelected(null)}>
              <X size={18} />
            </button>
            <span className="eyebrow">SAMPLE ORDER DETAILS</span>
            <h2>{selected.id}</h2>
            <p>
              {selected.customer} · {selected.type}
            </p>
            <div className="order-ref">
              <strong>{money(selected.total)}</strong>
              <span>
                {selected.items} items · {selected.method} · {selected.payment}
              </span>
            </div>
            <label className="form">
              Order status
              <select
                value={selected.status}
                onChange={(e) => updateStatus(selected.id, e.target.value)}
              >
                {[
                  'Placed',
                  'Confirmed',
                  'Packed',
                  'Out for delivery',
                  'Delivered',
                  'Cancelled',
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <p className="demo-notice">
              Sample order only. Changes do not notify customers or trigger fulfilment.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
