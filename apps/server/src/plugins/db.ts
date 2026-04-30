import type { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle>;
  }
}

export const dbPlugin = fp(async function dbPlugin(app: FastifyInstance): Promise<void> {
  const pool = new Pool({ connectionString: app.config.DATABASE_URL });

  const db = drizzle(pool, { schema });
  app.decorate('db', db);

  app.addHook('onClose', async () => {
    await pool.end();
  });
});
