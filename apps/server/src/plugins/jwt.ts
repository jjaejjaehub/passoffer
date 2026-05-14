import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; email: string; name: string };
    user: { userId: string; email: string; name: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const jwtPlugin = fp(async function jwtPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: app.config.JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
      }

      const [row] = await app.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, request.user.userId))
        .limit(1);

      if (!row) {
        return reply
          .status(401)
          .send({ error: 'UNAUTHORIZED', message: '유효하지 않은 사용자입니다.' });
      }
    },
  );
});
