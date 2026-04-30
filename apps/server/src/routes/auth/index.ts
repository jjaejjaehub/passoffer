import type { FastifyInstance } from 'fastify';
import { hash, compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { users } from '../../db/schema';

const signupBody = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().min(1, '이름을 입력해주세요'),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/auth/signup
  app.post('/auth/signup', async (request, reply) => {
    const parsed = signupBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password, name } = parsed.data;

    const [existing] = await app.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return reply.status(409).send({
        error: 'EMAIL_ALREADY_EXISTS',
        message: '이미 사용 중인 이메일입니다.',
      });
    }

    const passwordHash = await hash(password, 10);

    const [user] = await app.db
      .insert(users)
      .values({ email, passwordHash, name })
      .returning({ id: users.id, email: users.email, name: users.name });

    if (!user) {
      return reply.status(500).send({ error: 'SERVER_ERROR' });
    }

    const token = app.jwt.sign({ userId: user.id, email: user.email, name: user.name });

    return reply.status(201).send({ token, user });
  });

  // POST /api/auth/login
  app.post('/auth/login', async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST' });
    }

    const { email, password } = parsed.data;

    const [user] = await app.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.isActive) {
      return reply.status(401).send({
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    const token = app.jwt.sign({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  });

  // GET /api/auth/me
  app.get(
    '/auth/me',
    { preHandler: [app.authenticate] },
    async (request) => {
      return request.user;
    },
  );
}
