import { defineConfig } from '@playwright/test';
import base from './playwright.config';
const baseURL = process.env.CUSTOMER_TEST_BASE_URL;
if (!baseURL || !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname))
  throw new Error('Set CUSTOMER_TEST_BASE_URL to an isolated localhost account test server');
if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.includes('test'))
  throw new Error('Use an isolated DATABASE_URL whose database name contains test');
export default defineConfig({
  ...base,
  testDir: './tests/customer-browser',
  workers: 1,
  use: { ...base.use, baseURL },
});
