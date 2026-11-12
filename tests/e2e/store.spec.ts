import { test, expect } from '@playwright/test';
test('search, favourites, cart and demo checkout', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Everyday essentials/ })).toBeVisible();
  const search = page.getByRole('textbox', { name: 'Search products' });
  await search.fill('Basmati');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save Premium Basmati Rice', exact: true }).click();
  await page.getByRole('button', { name: 'ADD', exact: true }).click();
  await search.fill('');
  await expect(page.locator('.product-card')).toHaveCount(9);
  await page.getByRole('button', { name: /My cart/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Premium Basmati Rice');
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await page.getByLabel('Your name').fill('Test Customer');
  await page.getByLabel('Mobile number', { exact: true }).fill('9876543210');
  await page.getByLabel('Delivery address').fill('12 Test Street, Srinagar');
  await page.getByLabel('Pincode', { exact: true }).fill('192210');
  await page.getByRole('button', { name: 'Place demo order' }).click();
  await expect(page.getByRole('heading', { name: 'Your demo order is placed!' })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('₹688');
  await page.reload();
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'My orders', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your demo order is placed!' })).toBeVisible();
});
test('glucose biscuit is listed at five rupees and can be added to the cart', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('textbox', { name: 'Search products' });
  await search.fill('Glucose');
  const card = page.locator('.product-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Glucose Biscuit');
  await expect(card).toContainText('₹5');
  await page.getByRole('button', { name: 'ADD', exact: true }).click();
  await page.getByRole('button', { name: /My cart/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Glucose Biscuit');
  await expect(page.getByRole('dialog')).toContainText('₹44');
  await expect(page.getByRole('dialog')).toContainText('₹39');
});
test('category filter, detail and responsive layout', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('.categories')
    .getByRole('button', { name: /Pulses & dals/ })
    .click();
  await expect(page.locator('.product-card')).toHaveCount(3);
  await page.locator('.product-title').filter({ hasText: 'Unpolished Toor Dal' }).click();
  await expect(page.getByRole('dialog')).toContainText('1 kg · HSN 0713');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});
test('admin filters and session-only order updates', async ({ page }, testInfo) => {
  await page.goto('/admin');
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page
    .locator('.admin-sidebar')
    .getByRole('button', { name: 'Orders', exact: false })
    .click();
  await page.getByRole('textbox', { name: 'Search orders' }).fill('GG-1046');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'GG-1046', exact: true }).click();
  await page.getByLabel('Order status').selectOption('Confirmed');
  await expect(page.getByRole('dialog').getByLabel('Order status')).toHaveValue('Confirmed');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('tbody')).toContainText('Confirmed');
});

test('catalogue remains usable offline after service worker warmup', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator('.product-card')).toHaveCount(9);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Everyday essentials/ })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search products' }).fill('moong');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await context.setOffline(false);
});

test('192210 can be selected as the delivery location without a browser format error', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delivery location' }).click();
  await page.getByLabel('Pincode', { exact: true }).fill('192210');
  await page.getByRole('button', { name: 'Check & save location' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .locator('.product-card')
    .first()
    .getByRole('button', { name: 'ADD', exact: true })
    .click();
  await page.getByRole('button', { name: /My cart/ }).click();
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(page.getByLabel('Pincode', { exact: true })).toHaveValue('192210');
});
