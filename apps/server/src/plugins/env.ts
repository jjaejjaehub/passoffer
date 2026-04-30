import type { FastifyInstance } from 'fastify';
import fastifyEnv from '@fastify/env';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      DATABASE_URL: string;
      ENCRYPTION_SECRET: string;
      JWT_SECRET: string;
      CORS_ORIGIN: string;
      PORT: number;
      NODE_ENV: string;
      REDIS_URL?: string;
    };
  }
}

const schema = {
  type: 'object',
  required: ['DATABASE_URL', 'ENCRYPTION_SECRET', 'JWT_SECRET', 'CORS_ORIGIN'],
  properties: {
    DATABASE_URL: { type: 'string' },
    ENCRYPTION_SECRET: { type: 'string', minLength: 32 },
    JWT_SECRET: { type: 'string', minLength: 32 },
    CORS_ORIGIN: { type: 'string' },
    PORT: { type: 'integer', default: 4000 },
    NODE_ENV: { type: 'string', default: 'development' },
    REDIS_URL: { type: 'string' },
  },
};

export const envPlugin = fp(async function envPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyEnv, { schema, dotenv: true });
});
