import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('saved COD order can be managed in admin and tracked by the customer', async ({
  page,
  browser,
}) => {
  const password = process.env.TEST_ADMIN_PASSWORD_FILE
    ? await readFile(process.env.TEST_ADMIN_PASSWORD_FILE, 'utf8')
    : process.env.TEST_ADMIN_PASSWORD;
  if (!password)
    throw new Error(
      'Supply an admin password for this isolated test server through TEST_ADMIN_PASSWORD_FILE',
    );
  await page.goto('/admin/login');
  await page.getByLabel('Admin password').fill(password.trim());
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/live/);
  await page
    .locator('.filter-pills')
    .getByRole('button', { name: 'Delivery zones', exact: true })
    .click();
  await page.getByRole('button', { name: 'Generate delivery slots' }).click();
  await expect(page.getByRole('status')).toContainText('delivery slots created');
  const shop = await page.context().newPage();
  await shop.goto('/');
  await expect(shop.getByRole('status').first()).toContainText('Anantnag district');
  await shop.getByRole('button', { name: 'Account', exact: true }).click();
  await shop.getByRole('dialog').getByRole('button', { name: 'Delivery location' }).click();
  await shop.getByLabel('Pincode', { exact: true }).fill('192210');
  await shop.getByRole('button', { name: 'Check & save location' }).click();
  await shop.getByRole('textbox', { name: 'Search products' }).fill('Basmati');
  await shop.getByRole('button', { name: 'ADD', exact: true }).click();
  await shop.getByRole('button', { name: /My cart/ }).click();
  await shop.getByRole('button', { name: 'Continue to checkout' }).click();
  await shop.getByLabel('Your name').fill('Browser Verification Customer');
  await shop.getByLabel('Mobile number', { exact: true }).fill('9999999999');
  await shop.getByLabel('Delivery address').fill('Verification only, test address in Anantnag');
  await expect(shop.getByLabel('Pincode', { exact: true })).toHaveValue('192210');
  await shop.getByLabel('Delivery slot').selectOption({ index: 1 });
  const response = shop.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/orders' && r.request().method() === 'POST',
  );
  await shop.getByRole('button', { name: 'Place order', exact: true }).click();
  const result = await response;
  const receipt = await result.json();
  expect(result.status(), JSON.stringify(receipt)).toBe(201);
  expect(receipt.demo).toBe(false);
  expect(receipt.total).toBe(64900);
  await expect(shop.getByRole('heading', { name: 'Your order is placed!' })).toBeVisible();
  await page.locator('.filter-pills').getByRole('button', { name: 'Orders', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search saved orders' }).fill(receipt.id);
  await page.getByRole('button', { name: receipt.id, exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Verification only, test address in Anantnag',
  );
  await page.locator('#next-status').selectOption('CONFIRMED');
  await page.getByRole('button', { name: 'Save order status' }).click();
  await expect(page.getByRole('dialog').locator('select')).toHaveValue('');
  await shop.reload();
  await shop.getByRole('button', { name: 'Account', exact: true }).click();
  await shop.getByRole('dialog').getByRole('button', { name: 'My orders', exact: true }).click();
  await expect(shop.locator('.timeline .done').last()).toContainText('Confirmed');
  const anonymous = await browser.newContext();
  const denied = await anonymous.request.get(
    new URL('/api/admin/orders', process.env.LIVE_TEST_BASE_URL!).href,
  );
  expect(denied.status()).toBe(401);
  const privateReceipt = await anonymous.request.get(
    new URL('/api/orders/' + receipt.id, process.env.LIVE_TEST_BASE_URL!).href,
  );
  expect(privateReceipt.status()).toBe(403);
  await anonymous.close();
  // These are verification orders. Cancel them instead of dispatching anything.
  await page.locator('#next-status').selectOption('CANCELLED');
  await page.getByRole('button', { name: 'Save order status' }).click();
  await expect(page.getByRole('dialog')).toContainText('Cancelled by merchant');
});
