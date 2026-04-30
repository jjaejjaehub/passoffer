import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const fakeApp = {
  db,
  config: { ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET, DATABASE_URL: process.env.DATABASE_URL },
  log: { warn: (...a: unknown[]) => console.log('[warn]', ...a), error: (...a: unknown[]) => console.log('[error]', ...a), info: (...a: unknown[]) => console.log('[info]', ...a) },
} as unknown as import('fastify').FastifyInstance;
const userId = '178a6913-3cbf-4290-b47b-ab866a92fe14';
const { ChannelService } = await import('../src/services/ChannelService');
const svc = new ChannelService(fakeApp, userId);
const adapter = await svc.getAdapter('1c467612-cd58-4f0c-9a5b-e541397432ce');
console.log('[adapter] keys:', Object.keys(adapter));
console.log('[adapter.pushVariantStock?]', typeof adapter.pushVariantStock);
if (adapter.pushVariantStock) {
  await adapter.pushVariantStock('gid://shopify/Product/14960024322411', '53146870514027', 99);
  console.log('[push OK]');
}
await pool.end();
