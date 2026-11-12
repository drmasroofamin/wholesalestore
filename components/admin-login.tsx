'use client';
import { useState } from 'react';
import { Wheat, ShieldCheck } from 'lucide-react';
export default function AdminLogin() {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <main className="wrap" style={{ maxWidth: 440, padding: '70px 0' }}>
      <a className="brand" href="/">
        <Wheat />
        <div>
          grain<span>&</span>good
        </div>
      </a>
      <h1 style={{ fontSize: 36 }}>Merchant sign-in</h1>
      <p>Secure access to orders and inventory.</p>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const password = new FormData(e.currentTarget).get('password');
          try {
            const response = await fetch('/api/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Sign-in failed');
            window.location.assign('/admin/live');
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Sign-in failed');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Admin password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={200}
            required
          />
        </label>
        {error && (
          <p role="alert" className="demo-notice">
            {error}
          </p>
        )}
        <button disabled={busy} className="primary">
          {busy ? 'Signing in…' : 'Sign in'}
          <ShieldCheck size={17} />
        </button>
      </form>
      <p className="muted">
        Use the password you configured for this store. There is no default password.
      </p>
    </main>
  );
}
