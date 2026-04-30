import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fp from 'fastify-plugin';

export const corsPlugin = fp(async function corsPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCors, {
    origin: app.config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  });
});
