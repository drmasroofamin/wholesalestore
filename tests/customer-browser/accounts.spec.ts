import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { database } from '../../lib/db';
import { createVerifiedCustomerSession } from '../../lib/customer-auth';
import { changeOrderStatus } from '../../lib/live-orders';
const db = database();
test.afterAll(async () => {
  await db.$disconnect();
});
test('first-time details, saved address checkout, and purchase history persist after OTP sign-in again', async ({
  page,
  browser,
}) => {
  const phone = '9' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  let sends = 0,
    verifications = 0;
  await page.route('**/api/customer/otp/request', async (route) => {
    expect(route.request().postDataJSON().phone).toBe(phone);
    sends++;
    await route.fulfill({
      json: {
        challengeId: '00000000-0000-4000-a000-000000000001',
        expiresIn: 300,
        resendAfter: 60,
      },
    });
  });
  // Only the browser fixture intercepts OTP delivery. Production has no bypass.
  await page.route('**/api/customer/otp/verify', async (route) => {
    expect(route.request().postDataJSON().code).toBe('123456');
    verifications++;
    const session = await createVerifiedCustomerSession(phone, db);
    await route.fulfill({
      json: { customer: session.customer },
      headers: {
        'Set-Cookie': `gg-customer=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
      },
    });
  });
  const login = async () => {
    await page.getByLabel('Mobile number', { exact: true }).fill(phone);
    await page.getByRole('button', { name: 'Send OTP', exact: true }).click();
    await page.getByLabel('Verification code').fill('123456');
    await page.getByRole('button', { name: 'Verify & sign in' }).click();
  };
  await page.goto('/');
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await login();
  await expect(page.getByRole('heading', { name: 'Welcome! Add your details' })).toBeVisible();
  await page.getByLabel('Your name').fill('Account Browser Customer');
  await page
    .getByRole('textbox', { name: 'Delivery address', exact: true })
    .fill('Saved browser test address, Anantnag');
  await page.getByLabel('Pincode', { exact: true }).fill('192210');
  await page.getByRole('button', { name: 'Save details', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hello, Account Browser Customer' }),
  ).toBeVisible();
  await expect(page.locator('.saved-addresses')).toContainText(
    'Saved browser test address, Anantnag',
  );
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('textbox', { name: 'Search products' }).fill('Basmati');
  await page.getByRole('button', { name: 'ADD', exact: true }).click();
  await page.getByRole('button', { name: 'Increase quantity', exact: true }).click();
  await page.getByRole('button', { name: 'OK, go to cart' }).click();
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(page.getByLabel('Your name')).toHaveValue('Account Browser Customer');
  await expect(page.getByLabel('Mobile number', { exact: true })).toHaveValue(phone);
  await expect(page.getByRole('textbox', { name: 'Delivery address', exact: true })).toHaveValue(
    'Saved browser test address, Anantnag',
  );
  await expect(page.getByLabel('Pincode', { exact: true })).toHaveValue('192210');
  await expect(page.getByRole('combobox', { name: 'Delivery slot', exact: true })).toBeEnabled();
  await page
    .getByRole('combobox', { name: 'Delivery slot', exact: true })
    .selectOption({ index: 1 });
  const placing = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/orders' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  const result = await placing;
  expect(result.status()).toBe(201);
  const receipt = await result.json();
  try {
    await expect(page.getByRole('heading', { name: 'Your order is placed!' })).toBeVisible();
    await page.getByRole('button', { name: 'All purchases & saved addresses' }).click();
    await expect(page.locator('.purchase-card')).toContainText(receipt.id);
    await expect(page.locator('.purchase-card')).toContainText('₹1,298');
    await expect(page.locator('.purchase-card')).toContainText('2 × Premium Basmati Rice');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in with your phone' })).toBeVisible();
    expect((await page.request.get('/api/customer/orders')).status()).toBe(401);
    await login();
    await expect(
      page.getByRole('heading', { name: 'Hello, Account Browser Customer' }),
    ).toBeVisible();
    await expect(page.getByLabel('Your name')).toHaveCount(0);
    await expect(page.locator('.purchase-card')).toContainText(receipt.id);
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Hello, Account Browser Customer' }),
    ).toBeVisible();
    await expect(page.locator('.saved-addresses')).toContainText('192210');
    await expect(page.locator('.purchase-card')).toContainText(receipt.id);
    expect(sends).toBe(2);
    expect(verifications).toBe(2);
    // Independent customer session cannot see this order or address.
    const other = await createVerifiedCustomerSession(
      '9' + randomBytes(6).readUIntBE(0, 6).toString().slice(-9).padStart(9, '0'),
      db,
    );
    const outsider = await browser.newContext();
    await outsider.addCookies([
      { name: 'gg-customer', value: other.token, url: process.env.CUSTOMER_TEST_BASE_URL! },
    ]);
    const history = await outsider.request.get(
      new URL('/api/customer/orders', process.env.CUSTOMER_TEST_BASE_URL!).href,
    );
    expect((await history.json()).orders).toEqual([]);
    const forbidden = await outsider.request.get(
      new URL('/api/orders/' + receipt.id, process.env.CUSTOMER_TEST_BASE_URL!).href,
    );
    expect(forbidden.status()).toBe(404);
    await outsider.close();
  } finally {
    await changeOrderStatus(receipt.id, 'CANCELLED', false, db);
  }
});
