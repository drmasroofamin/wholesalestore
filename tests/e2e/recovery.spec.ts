import { test, expect } from '@playwright/test';

test('standalone recovery works when application JavaScript cannot load', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: /Everyday essentials/ }).waitFor();
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.evaluate(async () => {
    localStorage.setItem('gg-cart', JSON.stringify({ basmati: 1 }));
    await caches.open('unrelated-recovery-test');
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  // Simulate a broken client bundle: the React cleanup effect cannot execute.
  await page.route('**/_next/**/*.js*', (route) => route.abort());
  await page.route('**/__broken-client', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<h1>App could not load</h1><script src="/_next/static/chunks/missing.js"></script>',
    }),
  );
  await page.goto('/__broken-client');
  await expect(page.getByRole('heading', { name: 'App could not load' })).toBeVisible();
  await page.evaluate(async () => {
    await caches.open('grain-good-stale-recovery');
  });
  expect(
    await page.evaluate(async () => (await caches.keys()).includes('grain-good-stale-recovery')),
  ).toBe(true);
  await page.goto('/reset.html');
  await expect(page.getByRole('status')).toContainText('Old app files removed');
  const state = await page.evaluate(async () => ({
    registrations: (await navigator.serviceWorker.getRegistrations()).length,
    keys: await caches.keys(),
    cart: localStorage.getItem('gg-cart'),
  }));
  expect(state.registrations).toBe(0);
  expect(state.keys.some((key) => key.startsWith('grain-good-'))).toBe(false);
  expect(state.keys).toContain('unrelated-recovery-test');
  expect(JSON.parse(state.cart || '{}')).toEqual({ basmati: 1 });
  await page.unroute('**/_next/**/*.js*');
  await page.getByRole('link', { name: 'Return to the store' }).click();
  await page.getByRole('button', { name: /My cart/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Premium Basmati Rice');
});
