import { liveMode, liveSettings } from './live-config';
import { database } from './db';
import { redis } from './security';
export const REQUIRED_STORE_VARIABLES = [
  'APP_ORIGIN',
  'STORE_NAME',
  'STORE_PHONE',
  'DATABASE_URL',
  'REDIS_URL',
  'SESSION_SECRET',
  'ADMIN_PASSWORD_HASH',
] as const;
export type ReadinessCheck = { ok: boolean; code: string };
export function safeFailureCode(error: unknown): string {
  const e = error as {
    code?: unknown;
    message?: unknown;
    cause?: { code?: unknown };
    meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } };
  };
  for (const code of [e?.meta?.driverAdapterError?.cause?.originalCode, e?.cause?.code, e?.code])
    if (
      typeof code === 'string' &&
      /^(P\d{4}|[0-9A-Z]{5}|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|SELF_SIGNED_CERT_IN_CHAIN|DEPTH_ZERO_SELF_SIGNED_CERT|CERT_HAS_EXPIRED)$/.test(
        code,
      )
    )
      return code;
  if (typeof e?.message === 'string' && /^(WRONGPASS|NOAUTH|ERR AUTH)/.test(e.message))
    return 'AUTHENTICATION_FAILED';
  return 'CONNECTION_FAILED';
}
export async function storeReadiness() {
  let configuration: ReadinessCheck;
  const missing = REQUIRED_STORE_VARIABLES.filter((name) => !process.env[name]?.trim());
  try {
    liveSettings();
    configuration = { ok: true, code: 'OK' };
  } catch {
    configuration = { ok: false, code: missing.length ? 'MISSING_SETTINGS' : 'INVALID_SETTINGS' };
  }
  const [postgres, cache] = await Promise.all([
    (async (): Promise<ReadinessCheck> => {
      if (!process.env.DATABASE_URL) return { ok: false, code: 'NOT_CONFIGURED' };
      try {
        await database().$queryRaw`SELECT 1`;
        return { ok: true, code: 'OK' };
      } catch (error) {
        return { ok: false, code: safeFailureCode(error) };
      }
    })(),
    (async (): Promise<ReadinessCheck> => {
      if (!process.env.REDIS_URL) return { ok: false, code: 'NOT_CONFIGURED' };
      if (!/^rediss?:\/\//.test(process.env.REDIS_URL))
        return { ok: false, code: 'INVALID_URL_PROTOCOL' };
      try {
        await redis().ping();
        return { ok: true, code: 'OK' };
      } catch (error) {
        return { ok: false, code: safeFailureCode(error) };
      }
    })(),
  ]);
  return {
    mode: liveMode() ? 'live' : 'demo',
    ready: configuration.ok && postgres.ok && cache.ok,
    checks: { configuration, database: postgres, redis: cache },
  };
}
