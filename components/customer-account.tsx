'use client';
import { useEffect, useState } from 'react';
import type { CustomerProfile, CustomerHistoryOrder, SavedAddress } from '@/lib/customer-types';
import { PINCODE_PATTERN, PINCODE_HINT } from '@/lib/pincode';
import { money } from '@/lib/catalog';
export async function customerApi(
  path: string,
  method = 'GET',
  body?: unknown,
  headers?: Record<string, string>,
) {
  const response = await fetch('/api/customer/' + path, {
    method,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load your account');
  return data;
}
export function CustomerAccount({
  customer,
  onCustomer,
  onContinue,
  onOrder,
  checkout = false,
}: {
  customer: CustomerProfile | null;
  onCustomer: (c: CustomerProfile | null) => void;
  onContinue: () => void;
  onOrder: (o: CustomerHistoryOrder) => void;
  checkout?: boolean;
}) {
  const [phone, setPhone] = useState(''),
    [challenge, setChallenge] = useState(''),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [resendAt, setResendAt] = useState(0),
    [seconds, setSeconds] = useState(0);
  const [editing, setEditing] = useState<SavedAddress | true | false>(false),
    [orders, setOrders] = useState<CustomerHistoryOrder[]>([]),
    [page, setPage] = useState(0),
    [hasMore, setHasMore] = useState(false),
    [historyError, setHistoryError] = useState(''),
    [historyLoading, setHistoryLoading] = useState(false);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  useEffect(() => {
    if (!customer || customer.needsProfile) return;
    let active = true;
    setHistoryError('');
    setHistoryLoading(true);
    customerApi('orders?page=' + page)
      .then((data) => {
        if (active) {
          setOrders((old) => (page ? [...old, ...data.orders] : data.orders));
          setHasMore(data.hasMore);
        }
      })
      .catch((e) => {
        if (active) setHistoryError(e.message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customer?.id, page, customer?.needsProfile]);
  async function send() {
    await run(async () => {
      const data = await customerApi('otp/request', 'POST', { phone });
      setChallenge(data.challengeId);
      setCode('');
      setResendAt(Date.now() + data.resendAfter * 1000);
    });
  }
  async function verify() {
    await run(async () => {
      const data = await customerApi('otp/verify', 'POST', { challengeId: challenge, code });
      // A guest purchase may be linked only with its private receipt and verified matching phone.
      try {
        const receipt = JSON.parse(localStorage.getItem('gg-order') || 'null');
        if (receipt?.receiptToken)
          await customerApi(
            'orders/claim',
            'POST',
            { id: receipt.id },
            { Authorization: 'Bearer ' + receipt.receiptToken },
          );
      } catch {}
      localStorage.removeItem('gg-order');
      onCustomer(data.customer);
      setPage(0);
      if (checkout && !data.customer.needsProfile) onContinue();
    });
  }
  if (!customer)
    return (
      <>
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h2>Sign in with your phone</h2>
        <p>Save your details and see your purchases on your next visit.</p>
        {!challenge ? (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label>
              Mobile number
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="10-digit Indian mobile number"
                maxLength={20}
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
          >
            <p>Enter the code sent to {phone}. It expires in 5 minutes.</p>
            <label>
              Verification code
              <input
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy || seconds > 0}
              onClick={() => void send()}
            >
              {seconds ? `Resend in ${seconds}s` : 'Resend code'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => {
                setChallenge('');
                setCode('');
              }}
            >
              Change phone number
            </button>
          </form>
        )}
        {error && (
          <p className="demo-notice" role="alert">
            {error}
          </p>
        )}
        <p className="muted">
          We use your verified number to protect your account. SMS charges may apply.
        </p>
      </>
    );
  const needsProfile = customer.needsProfile;
  const address =
    typeof editing === 'object' ? editing : needsProfile ? customer.addresses[0] : undefined;
  return (
    <>
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h2>{needsProfile ? 'Welcome! Add your details' : `Hello, ${customer.name}`}</h2>
      <p>Verified mobile: {customer.phone}</p>
      {(needsProfile || editing) && (
        <form
          key={address?.id || 'new'}
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(async () => {
              const saved = {
                ...(address ? { id: address.id } : {}),
                label: form.get('label'),
                line: form.get('line'),
                pincode: form.get('pincode'),
                isDefault: form.get('default') === 'on',
              };
              const data = needsProfile
                ? await customerApi('profile', 'PUT', { name: form.get('name'), address: saved })
                : await customerApi('addresses', 'POST', saved);
              onCustomer(data.customer);
              setEditing(false);
              if (checkout) onContinue();
            });
          }}
        >
          {needsProfile && (
            <label>
              Your name
              <input
                name="name"
                defaultValue={customer.name}
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            </label>
          )}
          <label>
            Address label
            <select name="label" defaultValue={address?.label || 'Home'}>
              <option>Home</option>
              <option>Shop</option>
              <option>Other</option>
            </select>
          </label>
          <label htmlFor="customer-address">
            Delivery address
            <textarea
              id="customer-address"
              name="line"
              autoComplete="street-address"
              defaultValue={address?.line}
              required
              minLength={10}
              maxLength={500}
              placeholder="House / shop number, street, landmark"
            />
          </label>
          <label>
            Pincode
            <input
              name="pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              pattern={PINCODE_PATTERN}
              title={PINCODE_HINT}
              maxLength={6}
              defaultValue={address?.pincode}
              required
            />
          </label>
          <label className="account-check">
            <input type="checkbox" name="default" defaultChecked={address?.isDefault ?? true} />
            Use as default address
          </label>
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save details'}
          </button>
          {!needsProfile && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          )}
        </form>
      )}
      {!needsProfile && !editing && (
        <>
          <h3>Saved addresses</h3>
          <div className="saved-addresses">
            {customer.addresses.map((a) => (
              <article key={a.id}>
                <strong>
                  {a.label}
                  {a.isDefault ? ' · Default' : ''}
                </strong>
                <p>
                  {a.line}
                  <br />
                  {a.pincode}
                </p>
                <button className="secondary" onClick={() => setEditing(a)}>
                  Edit address
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const data = await customerApi('addresses/' + a.id, 'DELETE');
                      onCustomer(data.customer);
                    })
                  }
                >
                  Remove address
                </button>
              </article>
            ))}
          </div>
          <button className="secondary full" onClick={() => setEditing(true)}>
            Add a new address
          </button>
          {checkout && (
            <button className="primary full" onClick={onContinue}>
              Continue to checkout
            </button>
          )}
          <h3>Your purchases</h3>
          {historyLoading && !orders.length ? (
            <p role="status">Loading your purchases…</p>
          ) : historyError ? (
            <p role="alert">{historyError}</p>
          ) : orders.length ? (
            orders.map((o) => (
              <article className="purchase-card" key={o.id}>
                <strong>{o.id}</strong>
                <p>
                  {new Date(o.createdAt).toLocaleDateString('en-IN')} ·{' '}
                  {o.status.replaceAll('_', ' ')}
                  <br />
                  {money(o.total)} · {o.paymentStatus.replaceAll('_', ' ')}
                </p>
                <p>{o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</p>
                <p>
                  {o.customerName}
                  <br />
                  {o.address}, {o.pincode}
                </p>
                <button className="secondary" onClick={() => onOrder(o)}>
                  View order & payment
                </button>
              </article>
            ))
          ) : (
            <p>No purchases yet. Orders you place while signed in will appear here.</p>
          )}
          {hasMore && (
            <button
              className="secondary"
              disabled={historyLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Load more purchases
            </button>
          )}
        </>
      )}
      {error && (
        <p className="demo-notice" role="alert">
          {error}
        </p>
      )}
      <button
        className="secondary full"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            await customerApi('logout', 'POST');
            localStorage.removeItem('gg-order');
            sessionStorage.removeItem('gg-checkout');
            onCustomer(null);
            setOrders([]);
            setChallenge('');
            setCode('');
          })
        }
      >
        Sign out
      </button>
    </>
  );
}
