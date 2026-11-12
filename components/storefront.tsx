'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { configureOfflineCatalogue } from '@/lib/offline';
import { PINCODE_PATTERN, PINCODE_HINT } from '@/lib/pincode';
import { loadRazorpay } from '@/lib/razorpay-browser';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Heart,
  Leaf,
  MapPin,
  Menu,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
  User,
  Users,
  Wheat,
  X,
  CheckCircle2,
  Building2,
  Phone,
  Download,
} from 'lucide-react';
import { categories, money, products as demoProducts, Product } from '@/lib/catalog';
import { quote, deliveryCharge, DEFAULT_FREE_DELIVERY_ABOVE } from '@/lib/rules';
import { phoneLink } from '@/lib/store-profile';
import { BrandWord } from './brand-word';
import { SiteFooter } from './site-footer';
type Cart = Record<string, number>;
type StoreConfig = {
  live: boolean;
  name: string;
  phone: string;
  district: string;
  onlinePayments: boolean;
  acceptingOrders: boolean;
  paymentTestMode: boolean;
  products: Product[];
  zones: { pincode: string; fee: number; freeAbove: number; codLimit: number }[];
  slots: { id: string; label: string }[];
};
export default function Storefront({
  live = false,
  name = 'zebastore',
  phone = '',
  email = '',
  address = '',
}: {
  live?: boolean;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  const [products, setProducts] = useState<Product[]>(live ? [] : demoProducts);
  const [store, setStore] = useState<StoreConfig | null>(null),
    [storeError, setStoreError] = useState(''),
    [checkoutPin, setCheckoutPin] = useState('');
  const [category, setCategory] = useState('All essentials'),
    [search, setSearch] = useState(''),
    [cart, setCart] = useState<Cart>({}),
    [ready, setReady] = useState(false),
    [panel, setPanel] = useState<
      'cart' | 'checkout' | 'account' | 'retailer' | 'orders' | 'location' | null
    >(null),
    [detail, setDetail] = useState<Product | null>(null),
    [wish, setWish] = useState<string[]>([]),
    [onlyWish, setOnlyWish] = useState(false),
    [sort, setSort] = useState('popular'),
    [lang, setLang] = useState(false),
    [coupon, setCoupon] = useState(''),
    [applied, setApplied] = useState(''),
    [message, setMessage] = useState(''),
    [order, setOrder] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [payment, setPayment] = useState('COD'),
    [location, setLocation] = useState(live ? 'Choose delivery pincode' : 'Srinagar, 190001'),
    [pack, setPack] = useState('all');
  const [slotsLoading, setSlotsLoading] = useState(live),
    [selectedSlot, setSelectedSlot] = useState(live ? '' : 'Today, 4 PM – 7 PM');
  const loadStore = useCallback(
    async (fresh = false, signal?: AbortSignal) => {
      if (!live) return;
      setSlotsLoading(true);
      try {
        const response = await fetch(fresh ? '/api/store?refresh=1' : '/api/store', {
          ...(fresh ? { cache: 'no-store' as const } : {}),
          signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Store temporarily unavailable');
        if (!data.live) throw new Error('Store mode changed. Please refresh.');
        if (signal?.aborted) return;
        setStore(data);
        setProducts(data.products);
        setStoreError('');
        setSelectedSlot((previous) =>
          data.slots.some((slot: { id: string }) => slot.id === previous) ? previous : '',
        );
        try {
          localStorage.setItem('gg-public-catalogue', JSON.stringify(data.products));
        } catch {}
        setCart((previous) =>
          Object.fromEntries(
            Object.entries(previous).filter(([id]) =>
              data.products.some((product: Product) => product.id === id),
            ),
          ),
        );
      } catch (error) {
        if (signal?.aborted) return;
        setStoreError(
          (error instanceof Error ? error.message : 'Unable to refresh delivery slots') +
            ' Checkout is unavailable until the store reconnects.',
        );
        try {
          const cached = JSON.parse(localStorage.getItem('gg-public-catalogue') || '[]');
          if (
            Array.isArray(cached) &&
            cached.every(
              (p) =>
                typeof p.id === 'string' &&
                typeof p.name === 'string' &&
                typeof p.hindi === 'string' &&
                typeof p.price === 'number' &&
                typeof p.stock === 'number',
            )
          )
            setProducts(cached);
        } catch {}
      } finally {
        if (!signal?.aborted) setSlotsLoading(false);
      }
    },
    [live],
  );
  useEffect(() => {
    const controller = new AbortController();
    void loadStore(false, controller.signal);
    return () => controller.abort();
  }, [loadStore]);
  useEffect(() => {
    if (!live || panel !== 'checkout') return;
    const controller = new AbortController();
    void loadStore(true, controller.signal);
    return () => controller.abort();
  }, [live, panel, loadStore]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('gg-cart') || '{}');
      if (stored && typeof stored === 'object' && !Array.isArray(stored))
        setCart(
          Object.fromEntries(
            Object.entries(stored).filter(
              ([id, q]) =>
                (live || products.some((p) => p.id === id)) &&
                typeof q === 'number' &&
                Number.isInteger(q) &&
                q > 0 &&
                q <= (live ? 500 : products.find((p) => p.id === id)!.stock),
            ),
          ) as Cart,
        );
      const saved = JSON.parse(localStorage.getItem('gg-wish') || '[]');
      if (Array.isArray(saved))
        setWish(
          saved.filter(
            (id: unknown) => typeof id === 'string' && (live || products.some((p) => p.id === id)),
          ),
        );
      const receipt = JSON.parse(localStorage.getItem('gg-order') || 'null');
      if (
        receipt &&
        (!live || receipt.demo === false) &&
        typeof receipt.id === 'string' &&
        typeof receipt.total === 'number' &&
        typeof receipt.paymentStatus === 'string'
      )
        setOrder(receipt);
    } catch {}
    setReady(true);
    void configureOfflineCatalogue(process.env.NODE_ENV === 'production').catch(() => {
      // Offline support is optional; unavailable browser storage must not block shopping.
    });
  }, []);
  useEffect(() => {
    if (ready) {
      localStorage.setItem('gg-cart', JSON.stringify(cart));
      localStorage.setItem('gg-wish', JSON.stringify(wish));
    }
  }, [cart, wish, ready]);
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);
  useEffect(() => {
    if (!panel && !detail) return;
    const dialog = document.querySelector<HTMLElement>('[role=dialog]');
    const previous = document.activeElement as HTMLElement | null;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>('header,main,footer,.announcement,.mobile-cart'),
    );
    background.forEach((el) => (el.inert = true));
    dialog?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanel(null);
        setDetail(null);
      }
      if (e.key === 'Tab' && dialog) {
        const all = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,select,textarea,a[href]',
          ),
        );
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      background.forEach((el) => (el.inert = false));
      previous?.focus();
    };
  }, [panel, detail]);
  const add = (id: string, delta = 1) =>
    setCart((c) => {
      const n = { ...c };
      const product = products.find((p) => p.id === id)!;
      n[id] = Math.max(0, Math.min(product.stock, (n[id] || 0) + delta));
      if (!n[id]) delete n[id];
      return n;
    });
  const toggleWish = (id: string) =>
    setWish((w) => (w.includes(id) ? w.filter((i) => i !== id) : [...w, id]));
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const summary = useMemo(() => {
    try {
      const result = quote(
        Object.entries(cart).map(([id, quantity]) => ({ id, quantity })),
        applied,
        products,
      );
      const zone = store?.zones.find(
        (z) => z.pincode === (checkoutPin || location.match(/[1-9][0-9]{5}/)?.[0]),
      );
      if (live && zone) {
        result.delivery = deliveryCharge(result.subtotal, zone.freeAbove, zone.fee);
        result.total = result.subtotal - result.discount + result.delivery;
      }
      return result;
    } catch {
      return null;
    }
  }, [cart, applied, products, store, checkoutPin, location, live]);
  const visible = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (category === 'All essentials' || p.category === category) &&
            (!onlyWish || wish.includes(p.id)) &&
            (p.name + ' ' + p.hindi).toLowerCase().includes(search.toLowerCase()) &&
            (pack === 'all' || p.pack === pack),
        )
        .sort((a, b) =>
          sort === 'low'
            ? a.price - b.price
            : sort === 'high'
              ? b.price - a.price
              : sort === 'rating'
                ? Number(b.rating) - Number(a.rating)
                : 0,
        ),
    [products, category, search, sort, onlyWish, wish, pack],
  );
  const scrollShop = () => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
  const brand = store?.name?.trim() || name;
  async function payOnline(receipt: any): Promise<boolean> {
    await loadRazorpay();
    const payment = receipt.payment;
    if (!payment || !window.Razorpay)
      throw new Error('Payment details are unavailable. Retry checkout.');
    return new Promise<boolean>((resolve) => {
      const popup = new window.Razorpay!({
        key: payment.key,
        order_id: payment.id,
        amount: payment.amount,
        currency: 'INR',
        name: store?.name || name,
        description: 'Order ' + receipt.id,
        theme: { color: '#294e3c' },
        modal: {
          ondismiss: () => {
            setMessage('Payment not completed. Your order is reserved for 15 minutes.');
            resolve(false);
          },
        },
        handler: async (result) => {
          try {
            const response = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + receipt.receiptToken,
              },
              body: JSON.stringify({
                orderId: receipt.id,
                gatewayOrderId: result.razorpay_order_id,
                paymentId: result.razorpay_payment_id,
                signature: result.razorpay_signature,
              }),
            });
            const verified = await response.json();
            if (!response.ok) throw new Error(verified.error || 'Payment verification is pending');
            const saved = { ...receipt, ...verified };
            setOrder(saved);
            localStorage.setItem('gg-order', JSON.stringify(saved));
            resolve(true);
          } catch (error) {
            setMessage(
              (error instanceof Error ? error.message : 'Payment verification is pending') +
                '. Check your order before paying again.',
            );
            resolve(false);
          }
        },
      });
      popup.open();
    });
  }
  useEffect(() => {
    if (!live || panel !== 'orders' || !order?.receiptToken) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch('/api/orders/' + order.id, {
          headers: { Authorization: 'Bearer ' + order.receiptToken },
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setOrder((previous: any) => ({ ...previous, ...data }));
          localStorage.setItem('gg-order', JSON.stringify({ ...order, ...data }));
        }
      } catch {}
    };
    void poll();
    const timer = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [live, panel, order?.id, order?.receiptToken]);
  async function checkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (live && !store) {
      setMessage('Store information is unavailable. Please refresh before ordering.');
      return;
    }
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const body = {
      items: Object.entries(cart).map(([id, quantity]) => ({ id, quantity })),
      name: form.get('name'),
      phone: form.get('phone'),
      address: form.get('address'),
      pincode: form.get('pincode'),
      slot: form.get('slot'),
      payment,
      coupon: applied,
      ...(live ? { expectedTotal: summary?.total } : {}),
    };
    const payload = JSON.stringify(body);
    try {
      const fingerprint = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))),
      )
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      let previous: { fingerprint: string; key: string } | null = null;
      try {
        previous = JSON.parse(sessionStorage.getItem('gg-checkout') || 'null');
      } catch {}
      const key = previous?.fingerprint === fingerprint ? previous.key : crypto.randomUUID();
      sessionStorage.setItem('gg-checkout', JSON.stringify({ fingerprint, key }));
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 410) sessionStorage.removeItem('gg-checkout');
        throw new Error(data.error || 'Unable to place order');
      }
      setOrder(data);
      localStorage.setItem('gg-order', JSON.stringify(data));
      const completed = !data.payment || (await payOnline(data));
      if (completed) {
        setCart({});
        sessionStorage.removeItem('gg-checkout');
      }
      setPanel('orders');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Please try again');
    } finally {
      setBusy(false);
    }
  }
  const stepper = (p: Product) =>
    cart[p.id] ? (
      <div className="stepper">
        <button aria-label={`Remove one ${p.name}`} onClick={() => add(p.id, -1)}>
          <Minus size={14} />
        </button>
        <span>{cart[p.id]}</span>
        <button aria-label={`Add one ${p.name}`} onClick={() => add(p.id)}>
          <Plus size={14} />
        </button>
      </div>
    ) : (
      <button
        className={'add-button' + (p.stock <= 0 ? ' out' : '')}
        disabled={p.stock <= 0}
        onClick={() => add(p.id)}
      >
        {p.stock <= 0 ? (
          'Out of stock'
        ) : (
          <>
            ADD <Plus size={15} />
          </>
        )}
      </button>
    );
  const support = phoneLink(store?.phone || phone);
  const knownPin = checkoutPin || location.match(/[1-9][0-9]{5}/)?.[0];
  const matchedZone =
    live && knownPin ? store?.zones.find((zone) => zone.pincode === knownPin) : undefined;
  const freeAbove = matchedZone?.freeAbove ?? DEFAULT_FREE_DELIVERY_ABOVE;
  const deliveryOffer =
    matchedZone?.fee === 0
      ? 'Free delivery on every order'
      : `Free delivery on orders of ${money(freeAbove)} or more`;
  const freeDeliveryUnlocked = matchedZone?.fee === 0 || (summary?.subtotal || 0) >= freeAbove;
  return (
    <>
      <div className="announcement">
        <span>Good food. Honest prices. A little goodness, every day.</span>
        <span className="announcement-right">
          <Truck size={14} /> {deliveryOffer} <span className="dot">•</span>{' '}
          <button onClick={() => setLang(!lang)}>{lang ? 'English' : 'हिन्दी'}</button>
        </span>
      </div>
      <header>
        <div className="header-main wrap">
          <a className="brand" href="/" aria-label={`${brand} home`}>
            <div className="brand-icon">
              <Wheat size={29} />
            </div>
            <div>
              <BrandWord name={brand} />
              <small>ROOTED IN GOODNESS</small>
            </div>
          </a>
          <button className="location" onClick={() => setPanel('location')}>
            <MapPin size={22} />
            <span>
              <small>Delivering to</small>
              <strong>{location}</strong>
            </span>
            <ChevronDown size={14} />
          </button>
          <div className="search">
            <Search size={20} />
            <input
              aria-label="Search products"
              placeholder={
                lang ? 'चावल, दाल और ज़रूरी सामान खोजें…' : 'Search for rice, dal, atta and more…'
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                scrollShop();
              }}
            />
            <kbd>⌘ K</kbd>
          </div>
          <button
            aria-label="Account"
            className="header-action account"
            onClick={() => setPanel('account')}
          >
            <User size={21} />
            <span>Account</span>
          </button>
          <button
            className={'header-action wishlist ' + (onlyWish ? 'active' : '')}
            onClick={() => {
              setOnlyWish(!onlyWish);
              scrollShop();
            }}
            aria-label="Wishlist"
          >
            <Heart size={21} />
            {wish.length > 0 && <sup>{wish.length}</sup>}
          </button>
          <button className="cart-button" onClick={() => setPanel('cart')}>
            <ShoppingBag size={18} />
            <span>My cart</span>
            <b>{count}</b>
          </button>
        </div>
        <nav className="wrap nav">
          <div className="nav-links">
            {[
              'Shop all',
              'Rice & grains',
              'Pulses & dals',
              'Atta & flour',
              'Oils & essentials',
            ].map((n, i) => (
              <button
                className={
                  category ===
                  ['All essentials', 'Rice', 'Pulses & dals', 'Atta & flour', 'Oils & ghee'][i]
                    ? 'selected'
                    : ''
                }
                key={n}
                onClick={() => {
                  setCategory(
                    ['All essentials', 'Rice', 'Pulses & dals', 'Atta & flour', 'Oils & ghee'][i],
                  );
                  scrollShop();
                }}
              >
                {i === 0 && <Menu size={16} />} {n}
                {i === 0 && <ChevronDown size={13} />}
              </button>
            ))}
            <button
              className="deals"
              onClick={() => {
                setSort('low');
                scrollShop();
              }}
            >
              <Sparkles size={15} /> Everyday deals
            </button>
          </div>
          <button className="retail-link" onClick={() => setPanel('retailer')}>
            <Building2 size={16} /> Buying for your business? <ArrowUpRight size={16} />
          </button>
        </nav>
      </header>
      <main className="wrap">
        {live && (
          <div className="demo-notice" role="status">
            {storeError ||
              (!store
                ? 'Loading the store…'
                : `${store.name} · Delivery in ${store.district}${!store.acceptingOrders ? ' · Orders are paused.' : ''}${store.paymentTestMode ? ' · Online payments are in TEST mode—no real payment is collected.' : ''}`)}
          </div>
        )}

        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span /> FROM OUR MANDI TO YOUR HOME
            </span>
            <h1>
              {lang ? (
                <>
                  रोज़ की ज़रूरतें।
                  <br />
                  <em>थोक की अच्छाई।</em>
                </>
              ) : (
                <>
                  Everyday essentials.
                  <br />
                  <em>Wholesale goodness.</em>
                </>
              )}
            </h1>
            <p>
              Quality grains, pantry staples, and honest prices.
              <br />A fuller kitchen. A happier home.
            </p>
            <button
              className="primary"
              onClick={() => {
                setCategory('All essentials');
                scrollShop();
              }}
            >
              Shop your essentials <ArrowRight size={17} />
            </button>
            <div className="hero-proof">
              <div className="avatars">
                <span>👩🏽</span>
                <span>👨🏻</span>
                <span>👩🏻</span>
                <span>👨🏽</span>
              </div>
              <div>
                <div className="stars">★★★★★</div>
                <small>
                  {live
                    ? 'Locally delivered. Carefully selected.'
                    : 'Loved by 2,000+ local families'}
                </small>
              </div>
            </div>
          </div>
          <div className="hero-art" aria-label="Everyday Indian spices on spoons">
            <img
              src="/harvest.webp"
              width="1100"
              height="733"
              alt="Turmeric, mustard seeds, chilli powder and cumin"
              fetchPriority="high"
            />
            <div className="harvest-label">
              <Leaf size={20} />
              <span>
                Pure by nature.
                <br />
                <strong>Good by choice.</strong>
              </span>
            </div>
            <div className="hero-stamp">
              SOURCED WITH CARE<span>100%</span>QUALITY PROMISE
            </div>
          </div>
        </section>
        <section className="trust-strip">
          <div>
            <Truck />
            <span>
              <strong>Fresh at your doorstep</strong>
              <small>Same-day & scheduled delivery</small>
            </span>
          </div>
          <div>
            <Wheat />
            <span>
              <strong>Quality you can trust</strong>
              <small>Carefully sourced. Always fresh.</small>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <strong>Honest wholesale prices</strong>
              <small>More goodness. Better savings.</small>
            </span>
          </div>
          <div>
            <Package />
            <span>
              <strong>For homes & businesses</strong>
              <small>From 1 kg packs to 50 kg bags</small>
            </span>
          </div>
        </section>
        <section className="category-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A WELL-STOCKED KITCHEN STARTS HERE</span>
              <h2>Goodness in every category</h2>
            </div>
            <button
              className="text-link"
              onClick={() => {
                setCategory('All essentials');
                scrollShop();
              }}
            >
              Explore all <ArrowRight size={16} />
            </button>
          </div>
          <div className="categories">
            {categories.map((c) => (
              <button
                key={c.name}
                className={'category ' + (category === c.name ? 'chosen' : '')}
                onClick={() => {
                  setCategory(c.name);
                  setOnlyWish(false);
                  scrollShop();
                }}
              >
                <span className="category-art">
                  {c.image ? (
                    <img src={c.image} alt="" />
                  ) : (
                    <ShoppingBag size={36} strokeWidth={1.2} />
                  )}
                </span>
                <strong>{c.name}</strong>
                <small>
                  {live
                    ? c.name === 'All essentials'
                      ? products.length
                      : products.filter((p) => p.category === c.name).length
                    : c.count}{' '}
                  essentials
                </small>
              </button>
            ))}
          </div>
        </section>
        <section id="shop" className="shop-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE ONES YOU KEEP COMING BACK FOR</span>
              <h2>
                {onlyWish
                  ? 'Your saved favourites'
                  : search
                    ? `Results for “${search}”`
                    : category === 'All essentials'
                      ? 'Everyday favourites'
                      : category}{' '}
                <span className="heading-leaf">✳</span>
              </h2>
              <p>Pantry heroes, picked for quality. Priced for every day.</p>
            </div>
            <div className="sort-control">
              <SlidersHorizontal size={15} />
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="popular">Most popular</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </div>
          </div>
          <div className="filter-row">
            <div className="filter-pills">
              {['All essentials', 'Rice', 'Pulses & dals', 'Atta & flour', 'Oils & ghee'].map(
                (c) => (
                  <button
                    key={c}
                    className={category === c ? 'on' : ''}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ),
              )}
            </div>
            <select
              aria-label="Filter by pack size"
              value={pack}
              onChange={(e) => setPack(e.target.value)}
            >
              <option value="all">All pack sizes</option>
              <option>1 kg</option>
              <option>5 kg</option>
              <option>1 litre</option>
              <option>1 pack</option>
            </select>
          </div>
          {visible.length > 0 && visible.every((p) => p.stock <= 0) && (
            <p className="stock-note" role="status">
              These products are listed with their prices. Each one is out of stock until the store
              restocks it.
            </p>
          )}
          <div className="product-grid">
            {visible.map((p) => (
              <article className={'product-card' + (p.stock <= 0 ? ' is-out' : '')} key={p.id}>
                <div className={'product-image ' + p.id}>
                  {p.tag && (
                    <span className={'product-tag ' + (p.tag === 'BESTSELLER' ? 'orange' : '')}>
                      {p.tag}
                    </span>
                  )}
                  {p.stock <= 0 && <span className="stock-badge">Out of stock</span>}
                  <button
                    className={'heart ' + (wish.includes(p.id) ? 'saved' : '')}
                    onClick={() => toggleWish(p.id)}
                    aria-label={`Save ${p.name}`}
                  >
                    <Heart size={17} fill={wish.includes(p.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="image-link"
                    aria-label={`View ${p.name} details`}
                    onClick={() => setDetail(p)}
                  >
                    <img src={p.image} alt={p.name} loading="lazy" width="260" height="290" />
                  </button>
                  {p.mrp > p.price && (
                    <span className="savings">
                      {Math.round(((p.mrp - p.price) / p.mrp) * 100)}% OFF
                    </span>
                  )}
                </div>
                <div className="product-info">
                  <div className="product-topline">
                    <span>{brand.toUpperCase()}</span>
                    <span className="rating">
                      <Star size={11} fill="currentColor" /> {p.rating}
                    </span>
                  </div>
                  <button className="product-title" onClick={() => setDetail(p)}>
                    {lang ? p.hindi : p.name}
                  </button>
                  <span className="pack-size">
                    {p.pack} <span>•</span> Premium quality
                  </span>
                  <div className="product-bottom">
                    <div>
                      <strong>{money(p.price)}</strong>{' '}
                      {p.mrp > p.price && <del>{money(p.mrp)}</del>}
                      <small>Inclusive of all taxes</small>
                    </div>
                    {stepper(p)}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="empty">
              <Search size={36} />
              <h3>No essentials found</h3>
              <p>Try another search or explore all categories.</p>
              <button
                className="primary"
                onClick={() => {
                  setSearch('');
                  setCategory('All essentials');
                  setOnlyWish(false);
                  setPack('all');
                }}
              >
                View all essentials
              </button>
            </div>
          )}
          <div className="catalog-footer">
            <span>
              <CheckCircle2 size={15} /> Good quality shouldn’t cost more.
            </span>
            <button
              className="text-link"
              onClick={() => {
                setCategory('All essentials');
                setPack('all');
                setSearch('');
                setOnlyWish(false);
              }}
            >
              View all essentials <ArrowRight size={16} />
            </button>
          </div>
        </section>
        <section className="business-banner">
          <div className="business-icon">
            <Building2 size={44} strokeWidth={1} />
          </div>
          <div>
            <span className="eyebrow">GROWING TOGETHER</span>
            <h2>Your business. Our wholesale advantage.</h2>
            <p>Bulk prices, easy reorders, and flexible credit. Made for your kirana.</p>
          </div>
          <button onClick={() => setPanel('retailer')}>
            Explore business benefits <ArrowUpRight size={17} />
          </button>
          <div className="banner-grain">🌾</div>
        </section>
        <section className="values">
          <div>
            <Leaf size={25} />
            <h3>Rooted in real goodness</h3>
            <p>
              Thoughtfully sourced essentials,
              <br />
              from people who know their grains.
            </p>
          </div>
          <div>
            <Users size={25} />
            <h3>Your neighbourhood, online</h3>
            <p>
              The trust of your local merchant.
              <br />
              The ease of a few taps.
            </p>
          </div>
          <div>
            <Heart size={25} />
            <h3>A little care in every order</h3>
            <p>
              Packed with attention. Delivered
              <br />
              with a smile. Every single time.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter
        name={brand}
        phone={store?.phone || phone}
        email={email}
        address={address}
        onOrders={() => setPanel('orders')}
      />
      {count > 0 && (
        <button className="mobile-cart" onClick={() => setPanel('cart')}>
          <ShoppingBag size={19} /> {count} items{' '}
          <strong>{money(summary?.total || 0)} · View cart →</strong>
        </button>
      )}
      {message && (
        <div className="toast" role="status">
          {message}
          <button onClick={() => setMessage('')} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
      {(panel || detail) && (
        <div
          className="modal-overlay"
          onClick={() => {
            setPanel(null);
            setDetail(null);
          }}
        >
          <section
            className={'modal ' + (panel === 'cart' ? 'drawer' : '')}
            role="dialog"
            aria-modal="true"
            aria-label={detail?.name || panel || ''}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => {
                setPanel(null);
                setDetail(null);
              }}
            >
              <X size={21} />
            </button>
            {detail && (
              <div className="detail">
                <img src={detail.image} alt={detail.name} />
                <span className="eyebrow">SOURCED WITH CARE</span>
                <h2>{detail.name}</h2>
                <p>
                  Carefully selected for its natural flavour and quality. A wholesome addition to
                  your everyday kitchen, packed fresh by {brand}.
                </p>
                <p>
                  {detail.pack} · HSN {detail.hsn}
                  {detail.stock > 0 ? ` · ${detail.stock} packs available` : ' · Out of stock'}
                </p>
                <h2>
                  {money(detail.price)}{' '}
                  {detail.mrp > detail.price && <del>{money(detail.mrp)}</del>}
                </h2>
                {stepper(detail)}
                <p className="muted">Store in a cool, dry place. GST included.</p>
              </div>
            )}
            {panel === 'cart' && (
              <>
                <span className="eyebrow">A BASKET OF GOODNESS</span>
                <h2>
                  Your cart <span className="muted">({count})</span>
                </h2>
                {count ? (
                  <>
                    <div className="delivery-progress">
                      <Truck size={19} />
                      {freeDeliveryUnlocked
                        ? 'You’ve unlocked free delivery!'
                        : `Add ${money(freeAbove - (summary?.subtotal || 0))} for free delivery`}
                    </div>
                    <div className="cart-items">
                      {products
                        .filter((p) => cart[p.id])
                        .map((p) => (
                          <div className="cart-item" key={p.id}>
                            <img src={p.image} alt="" />
                            <div>
                              <strong>{p.name}</strong>
                              <small>{p.pack}</small>
                              <b>{money(p.price * cart[p.id])}</b>
                            </div>
                            {stepper(p)}
                          </div>
                        ))}
                    </div>
                    {!live && (
                      <div className="coupon">
                        <input
                          placeholder="Coupon code · try WELCOME10"
                          aria-label="Coupon code"
                          value={coupon}
                          onChange={(e) => setCoupon(e.target.value)}
                        />
                        <button
                          onClick={() => {
                            if (coupon.toUpperCase() === 'WELCOME10') {
                              setApplied(coupon);
                              setMessage('10% off applied, up to ₹100');
                            } else setMessage('That coupon is not valid');
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    {summary && (
                      <div className="totals">
                        <p>
                          Subtotal <span>{money(summary.subtotal)}</span>
                        </p>
                        <p>
                          Delivery{' '}
                          <span>{summary.delivery ? money(summary.delivery) : 'FREE'}</span>
                        </p>
                        {summary.discount > 0 && (
                          <p>
                            Savings <span>−{money(summary.discount)}</span>
                          </p>
                        )}
                        <p className="total">
                          Total <span>{money(summary.total)}</span>
                        </p>
                        <small>Includes {money(summary.tax)} GST</small>
                      </div>
                    )}
                    <button className="primary full" onClick={() => setPanel('checkout')}>
                      Continue to checkout <ArrowRight size={17} />
                    </button>
                  </>
                ) : (
                  <div className="empty">
                    <ShoppingBag size={42} />
                    <h3>Good things await</h3>
                    <p>Fill your basket with everyday goodness.</p>
                    <button
                      className="primary"
                      onClick={() => {
                        setPanel(null);
                        scrollShop();
                      }}
                    >
                      Start shopping
                    </button>
                  </div>
                )}
              </>
            )}
            {panel === 'checkout' && (
              <>
                <span className="eyebrow">ONE LAST STEP</span>
                <h2>Fresh essentials, on their way.</h2>
                <p className="demo-notice">
                  {live
                    ? 'Your order will be saved with the store. Please check your phone number, address and delivery slot.'
                    : 'Demo checkout. No payment is collected and no delivery is scheduled.'}
                </p>
                <form onSubmit={checkout} className="form">
                  <div className="form-row">
                    <label>
                      Your name
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder="Full name"
                        autoComplete="name"
                      />
                    </label>
                    <label>
                      Mobile number
                      <input
                        name="phone"
                        type="tel"
                        pattern="[6-9][0-9]{9}"
                        required
                        placeholder="10-digit mobile number"
                        autoComplete="tel-national"
                      />
                    </label>
                  </div>
                  <label>
                    Delivery address
                    <textarea
                      name="address"
                      required
                      minLength={10}
                      maxLength={500}
                      placeholder="House / shop number, street, landmark"
                      autoComplete="street-address"
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Pincode
                      <input
                        name="pincode"
                        required
                        pattern={PINCODE_PATTERN}
                        title={PINCODE_HINT}
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={6}
                        defaultValue={
                          location.match(/[1-9][0-9]{5}/)?.[0] || (live ? '' : '190001')
                        }
                        onChange={(e) => setCheckoutPin(e.target.value)}
                      />
                    </label>
                    <label>
                      Delivery slot
                      <select
                        name="slot"
                        required
                        value={selectedSlot}
                        onChange={(event) => setSelectedSlot(event.target.value)}
                        disabled={live && (slotsLoading || !!storeError || !store?.slots.length)}
                        aria-describedby={live ? 'delivery-slot-status' : undefined}
                      >
                        {live ? (
                          <>
                            <option value="" disabled>
                              {slotsLoading
                                ? 'Loading delivery slots…'
                                : !store?.slots.length
                                  ? 'No delivery slots available'
                                  : 'Choose delivery slot'}
                            </option>
                            {store?.slots.map((slot) => (
                              <option key={slot.id} value={slot.id}>
                                {slot.label}
                              </option>
                            ))}
                          </>
                        ) : (
                          <>
                            <option>Today, 4 PM – 7 PM</option>
                            <option>Tomorrow, 9 AM – 12 PM</option>
                            <option>Tomorrow, 4 PM – 7 PM</option>
                          </>
                        )}
                      </select>
                    </label>
                  </div>
                  {live && (
                    <div id="delivery-slot-status" role="status">
                      {slotsLoading ? (
                        <p className="muted">Checking available delivery times…</p>
                      ) : storeError ? (
                        <p className="demo-notice">
                          Unable to refresh delivery slots. Try again before ordering.
                        </p>
                      ) : !store?.slots.length ? (
                        <p className="demo-notice">
                          No delivery slots are available right now. The store may need to add
                          slots, or existing slots are full or past their cut-off. Please try
                          refreshing or contact the store.
                        </p>
                      ) : (
                        <p className="muted">Choose one of the available delivery times.</p>
                      )}
                      <button
                        type="button"
                        className="text-link"
                        disabled={slotsLoading}
                        onClick={() => void loadStore(true)}
                      >
                        Refresh delivery slots
                      </button>
                      {!slotsLoading && !store?.slots.length && support && (
                        <a className="text-link" style={{ marginLeft: 16 }} href={support.href}>
                          Contact store
                        </a>
                      )}
                    </div>
                  )}
                  {live &&
                    checkoutPin.length === 6 &&
                    !store?.zones.some((zone) => zone.pincode === checkoutPin) && (
                      <p className="demo-notice" role="status">
                        This pincode is valid, but delivery is not currently available there.
                        Available areas:{' '}
                        {store?.zones.map((zone) => zone.pincode).join(', ') || 'being configured'}.
                      </p>
                    )}
                  <fieldset>
                    <legend>Payment method</legend>
                    {(live && !store?.onlinePayments
                      ? ['COD']
                      : ['COD', 'UPI', 'Card', 'Netbanking']
                    ).map((m) => (
                      <label
                        className={'payment-option ' + (payment === m ? 'checked' : '')}
                        key={m}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={m}
                          checked={payment === m}
                          onChange={() => setPayment(m)}
                        />
                        {m === 'COD' ? 'Cash on delivery' : m}
                        <small>
                          {m === 'COD'
                            ? 'Pay when it arrives'
                            : live
                              ? store?.paymentTestMode
                                ? 'Razorpay test checkout'
                                : 'Secure Razorpay checkout'
                              : 'Requires live gateway configuration'}
                        </small>
                      </label>
                    ))}
                  </fieldset>
                  <div className="checkout-total">
                    Total to pay <strong>{money(summary?.total || 0)}</strong>
                  </div>
                  <button
                    disabled={
                      busy ||
                      !count ||
                      !summary ||
                      (live &&
                        (!store ||
                          !store.acceptingOrders ||
                          !!storeError ||
                          slotsLoading ||
                          !selectedSlot ||
                          !store.slots.some((slot) => slot.id === selectedSlot)))
                    }
                    className="primary full"
                  >
                    {busy ? 'Placing your order…' : live ? 'Place order' : 'Place demo order'}{' '}
                    <ArrowRight size={17} />
                  </button>
                  <small className="muted">
                    By placing an order, you agree to our <a href="/terms">terms</a> and{' '}
                    <a href="/refund-policy">cancellation and refund policy</a>.
                  </small>
                </form>
              </>
            )}
            {panel === 'location' && (
              <>
                <MapPin size={30} />
                <h2>Where should goodness arrive?</h2>
                <p>
                  {live
                    ? `Delivery in ${store?.district || 'Anantnag district'}. Available pincodes: ${store?.zones.map((z) => z.pincode).join(', ') || 'being configured'}.`
                    : 'Try any valid six-digit Indian pincode in this demo. Real delivery availability will be confirmed when the store goes live.'}
                </p>
                <form
                  className="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = new FormData(e.currentTarget).get('pincode');
                    if (live && !store?.zones.some((z) => z.pincode === v)) {
                      setMessage(
                        'This pincode is valid, but delivery is not currently available there.',
                      );
                      return;
                    }
                    setCheckoutPin(String(v));
                    setLocation(`PIN ${v}`);
                    setPanel(null);
                    setMessage('Delivery location updated');
                  }}
                >
                  <label>
                    Pincode
                    <input
                      name="pincode"
                      pattern={PINCODE_PATTERN}
                      title={PINCODE_HINT}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={6}
                      required
                      placeholder="192210"
                    />
                  </label>
                  <button className="primary">
                    Check & save location <ArrowRight size={16} />
                  </button>
                </form>
              </>
            )}
            {panel === 'account' && (
              <>
                <User size={30} />
                <h2>Welcome to your neighbourhood.</h2>
                <p>
                  {live
                    ? 'Track your latest order or update your delivery location.'
                    : 'Track your demo order or register your kirana to explore wholesale benefits.'}
                </p>
                <div className="account-options">
                  <button onClick={() => setPanel('location')}>
                    <MapPin /> Delivery location <ChevronRight />
                  </button>
                  <button onClick={() => setPanel('orders')}>
                    <Package />
                    My orders <ChevronRight />
                  </button>
                  <button onClick={() => setPanel('retailer')}>
                    <Building2 />
                    Register your business <ChevronRight />
                  </button>
                  <button
                    onClick={() => {
                      setOnlyWish(true);
                      setPanel(null);
                      scrollShop();
                    }}
                  >
                    <Heart />
                    Saved favourites ({wish.length}) <ChevronRight />
                  </button>
                </div>
                <p className="demo-notice">
                  {live
                    ? 'Orders placed on this device stay in this browser. Use Contact if you need help with an earlier order.'
                    : 'No account is created in this demonstration, and nothing here opens the admin dashboard.'}
                </p>
                {live && (
                  <p>
                    <a href="/contact">Contact the store</a>
                  </p>
                )}
              </>
            )}
            {panel === 'retailer' && live && (
              <>
                <span className="eyebrow">YOUR PARTNER IN GROWTH</span>
                <h2>Wholesale for shops in Anantnag.</h2>
                <div className="benefit-list">
                  <p>
                    <Check /> Bulk prices on larger quantities
                  </p>
                  <p>
                    <Check /> GST invoices for registered businesses
                  </p>
                  <p>
                    <Check /> Repeat orders for kirana shops we deliver to
                  </p>
                </div>
                <p>
                  Tell us your shop name and what you want to reorder. We confirm the price before
                  you pay.
                </p>
                <div className="account-options">
                  {support && (
                    <a href={support.href}>
                      <Phone /> Call {support.display} <ChevronRight />
                    </a>
                  )}
                  <a href="/contact">
                    <ArrowUpRight /> Contact the store <ChevronRight />
                  </a>
                </div>
              </>
            )}
            {panel === 'retailer' && !live && (
              <>
                <span className="eyebrow">YOUR PARTNER IN GROWTH</span>
                <h2>Big savings for your small business.</h2>
                <div className="benefit-list">
                  <p>
                    <Check /> Bulk pricing on 10+ bags
                  </p>
                  <p>
                    <Check /> Quick repeat orders & GST invoices
                  </p>
                  <p>
                    <Check /> Credit terms, subject to approval
                  </p>
                </div>
                <form
                  className="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    localStorage.setItem('gg-retailer', JSON.stringify(Object.fromEntries(f)));
                    setMessage(
                      'Demo business profile saved on this device. Approval requires a connected backend.',
                    );
                    setPanel(null);
                  }}
                >
                  <label>
                    Business name
                    <input name="business" required placeholder="Your shop’s name" />
                  </label>
                  <div className="form-row">
                    <label>
                      Owner name
                      <input name="owner" required />
                    </label>
                    <label>
                      Mobile number
                      <input name="phone" pattern="[6-9][0-9]{9}" required type="tel" />
                    </label>
                  </div>
                  <label>
                    GSTIN (optional)
                    <input
                      name="gstin"
                      pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]"
                      placeholder="15-character GSTIN"
                    />
                  </label>
                  <button className="primary">
                    Save demo registration <ArrowRight size={16} />
                  </button>
                  <small className="muted">
                    Demo registration stays on this device. No credit or wholesale approval is
                    granted.
                  </small>
                </form>
              </>
            )}
            {panel === 'orders' && (
              <>
                {order ? (
                  <>
                    <CheckCircle2 size={42} className="success" />
                    <h2>
                      {order.demo
                        ? 'Your demo order is placed!'
                        : order.status === 'CANCELLED'
                          ? 'Your order was cancelled.'
                          : order.paymentStatus === 'PENDING' || order.paymentStatus === 'FAILED'
                            ? 'Your order is awaiting payment.'
                            : 'Your order is placed!'}
                    </h2>
                    <p>Thank you for choosing a little everyday goodness.</p>
                    <div className="order-ref">
                      <small>ORDER NUMBER</small>
                      <strong>{order.id}</strong>
                      <span>
                        {money(order.total)} · {order.paymentStatus}
                      </span>
                    </div>
                    <div className="timeline">
                      {['Placed', 'Confirmed', 'Packed', 'Out for delivery', 'Delivered'].map(
                        (s, i) => (
                          <div
                            key={s}
                            className={
                              i <=
                              [
                                'PLACED',
                                'CONFIRMED',
                                'PACKED',
                                'OUT_FOR_DELIVERY',
                                'DELIVERED',
                              ].indexOf(order.status)
                                ? 'done'
                                : ''
                            }
                          >
                            <span>{i === 0 ? <Check size={13} /> : i + 1}</span>
                            {s}
                          </div>
                        ),
                      )}
                    </div>
                    <p className="demo-notice">
                      {order.demo
                        ? 'This is a demo receipt, not a tax invoice. Order status will not advance without a live order service.'
                        : order.status === 'CANCELLED' && order.paymentStatus === 'PAID'
                          ? 'Payment was received after cancellation. Please contact the store for a refund.'
                          : 'Your order is saved. This page checks the latest status automatically. Your receipt link is private; keep it safe.'}
                    </p>
                    {live &&
                      order.method?.startsWith('RAZORPAY') &&
                      order.paymentStatus !== 'PAID' &&
                      order.status !== 'CANCELLED' &&
                      order.payment && (
                        <button
                          className="primary full"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              if (await payOnline(order)) {
                                setCart({});
                                sessionStorage.removeItem('gg-checkout');
                              }
                            } catch (error) {
                              setMessage(
                                error instanceof Error ? error.message : 'Unable to open payment',
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Complete payment
                        </button>
                      )}
                    <button
                      className="secondary full"
                      onClick={() => {
                        const blob = new Blob(
                          [
                            `${brand} — ${order.demo ? 'DEMO ' : ''}RECEIPT\nOrder: ${order.id}\nTotal: ${money(order.total)}\nStatus: ${order.paymentStatus}\nNot a tax invoice.${order.demo ? ' No payment collected.' : ''}`,
                          ],
                          { type: 'text/plain' },
                        );
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `${order.id}.txt`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                      }}
                    >
                      <Download size={16} />
                      {order.demo ? 'Download demo receipt' : 'Download receipt'}
                    </button>
                  </>
                ) : (
                  <div className="empty">
                    <Package size={40} />
                    <h2>Your story starts here.</h2>
                    <p>No orders yet. Your first basket of goodness is a few taps away.</p>
                    <button
                      className="primary"
                      onClick={() => {
                        setPanel(null);
                        scrollShop();
                      }}
                    >
                      Explore essentials
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
