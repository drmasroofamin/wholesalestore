import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export function database({ quiet = false }: { quiet?: boolean } = {}) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  return (
    globalDb.prisma ??
    (globalDb.prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.DATABASE_POOL_MAX || (process.env.VERCEL ? '2' : '10')),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }),
      log: quiet ? [] : ['error'],
    }))
  );
}
