import Fastify from 'fastify';
import { envPlugin } from './plugins/env';
import { dbPlugin } from './plugins/db';
import { corsPlugin } from './plugins/cors';
import { jwtPlugin } from './plugins/jwt';
import { authRoutes } from './routes/auth/index';
import { channelRoutes } from './routes/channels/index';
import { orderRoutes } from './routes/orders/index';
import { productRoutes } from './routes/products/index';
import { claimRoutes } from './routes/claims/index';
import { inventoryRoutes } from './routes/inventory/index';
import { qoo10Routes } from './routes/qoo10/index';
import { masterProductRoutes } from './routes/master-products/index';
import { warehouseRoutes } from './routes/warehouses/index';

const app = Fastify({ logger: { level: 'info' } });

async function main() {
  // 플러그인 등록 순서: env → cors → db → jwt
  await app.register(envPlugin);
  await app.register(corsPlugin);
  await app.register(dbPlugin);
  await app.register(jwtPlugin);

  // 헬스체크
  app.get('/health', async () => {
    return { status: 'ok', ts: new Date().toISOString() };
  });

  // API 라우트
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(channelRoutes, { prefix: '/api' });
  await app.register(orderRoutes, { prefix: '/api' });
  await app.register(productRoutes, { prefix: '/api' });
  await app.register(claimRoutes, { prefix: '/api' });
  await app.register(inventoryRoutes, { prefix: '/api' });
  await app.register(qoo10Routes, { prefix: '/api' });
  await app.register(masterProductRoutes, { prefix: '/api' });
  await app.register(warehouseRoutes, { prefix: '/api' });

  const port = app.config.PORT ?? 4000;
  await app.listen({ port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
