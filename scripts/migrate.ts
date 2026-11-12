import { Pool } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function main() {
  const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL or DIRECT_DATABASE_URL is required');
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(674762092)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS "_GrainMigration" (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now())',
    );
    for (const name of (await readdir('prisma/migrations')).filter((n) => /^\d/.test(n)).sort()) {
      const sql = await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM "_GrainMigration" WHERE name=$1', [
        name,
      ]);
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum)
          throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO "_GrainMigration" (name,checksum) VALUES ($1,$2)', [
          name,
          checksum,
        ]);
        await client.query('COMMIT');
        console.log('Applied', name);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(674762092)').catch(() => {});
    client.release();
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : 'Migration failed');
  process.exitCode = 1;
});
