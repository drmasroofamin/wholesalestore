import { defineConfig } from '@playwright/test';
import base from './playwright.config';
const baseURL = process.env.LIVE_TEST_BASE_URL;
if (!baseURL)
  throw new Error('Set LIVE_TEST_BASE_URL to your isolated live-mode verification server');
if (
  !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname) &&
  process.env.ALLOW_STAGING_E2E !== 'true'
)
  throw new Error(
    'For a remote staging server, explicitly set ALLOW_STAGING_E2E=true. Never run this on a customer production store.',
  );
export default defineConfig({
  ...base,
  testDir: './tests/live-browser',
  workers: 1,
  use: { ...base.use, baseURL },
});
