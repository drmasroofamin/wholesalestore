import { loadEnvConfig } from '@next/env';
import { storeReadiness, REQUIRED_STORE_VARIABLES } from '../lib/readiness';
import { database } from '../lib/db';
import { closeRedis } from '../lib/security';
// Match the files read by `next dev`, including .env.local. Never print values.
const { loadedEnvFiles } = loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', {
  info: () => {},
  error: () => {
    console.error('An environment file could not be loaded. Check its formatting.');
  },
});
async function main() {
  let client: ReturnType<typeof database> | undefined;
  if (process.env.DATABASE_URL) {
    try {
      client = database({ quiet: true });
    } catch {}
  }
  try {
    const result = await storeReadiness();
    console.log(
      JSON.stringify(
        {
          ...result,
          environmentFiles: loadedEnvFiles.map((file) => file.path),
          configured: Object.fromEntries(
            REQUIRED_STORE_VARIABLES.map((name) => [name, !!process.env[name]?.trim()]),
          ),
        },
        null,
        2,
      ),
    );
    if (!result.ready) process.exitCode = 1;
  } finally {
    closeRedis();
    if (client) await client.$disconnect().catch(() => {});
  }
}
main().catch(() => {
  console.error('Diagnostic could not complete. No credential values were printed.');
  process.exitCode = 1;
});
