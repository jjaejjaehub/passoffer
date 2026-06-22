import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MatchingRuleService } from '../../services/MatchingRuleService';

const listQuery = z.object({
  channelId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  autoLearned: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

const createBody = z.object({
  channelId: z.string().uuid(),
  channelItemCode: z.string().min(1),
  channelItemTitle: z.string().nullable().optional(),
  optionCode: z.string().nullable().optional(),
  optionName: z.string().nullable().optional(),
  skuId: z.string().uuid(),
  outputQty: z.number().int().positive().optional(),
  warehouseId: z.string().uuid().nullable().optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
  note: z.string().nullable().optional(),
});

const updateBody = z.object({
  channelItemTitle: z.string().nullable().optional(),
  optionCode: z.string().nullable().optional(),
  optionName: z.string().nullable().optional(),
  skuId: z.string().uuid().optional(),
  outputQty: z.number().int().positive().optional(),
  warehouseId: z.string().uuid().nullable().optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
  note: z.string().nullable().optional(),
});

const toggleBody = z.object({ isActive: z.boolean() });

const deleteManyBody = z.object({ ids: z.array(z.string().uuid()).min(1) });

const evaluateBody = z.object({
  channelId: z.string().uuid(),
  channelItemCode: z.string().min(1),
  channelItemTitle: z.string().nullable().optional(),
  optionCode: z.string().nullable().optional(),
  optionName: z.string().nullable().optional(),
});

export async function matchingRuleRoutes(app: FastifyInstance): Promise<void> {
  const getSvc = (userId: string) => new MatchingRuleService(app, userId);

  app.get('/matching-rules', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = listQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    return getSvc(request.user.userId).list(parsed.data);
  });

  app.get<{ Params: { id: string } }>(
    '/matching-rules/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const row = await getSvc(request.user.userId).getById(request.params.id);
      if (!row) return reply.status(404).send({ error: 'NOT_FOUND' });
      return row;
    },
  );

  app.post('/matching-rules', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = createBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    try {
      const created = await getSvc(request.user.userId).create(parsed.data);
      return reply.status(201).send(created);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        return reply.status(409).send({ error: 'DUPLICATE_RULE', message: msg });
      }
      return reply.status(400).send({ error: 'CREATE_FAILED', message: msg });
    }
  });

  app.put<{ Params: { id: string } }>(
    '/matching-rules/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = updateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      try {
        await getSvc(request.user.userId).update(request.params.id, parsed.data);
        return reply.status(204).send();
      } catch (err) {
        return reply.status(400).send({ error: 'UPDATE_FAILED', message: (err as Error).message });
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/matching-rules/:id/toggle',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = toggleBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      await getSvc(request.user.userId).toggle(request.params.id, parsed.data.isActive);
      return reply.status(204).send();
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/matching-rules/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      await getSvc(request.user.userId).delete(request.params.id);
      return reply.status(204).send();
    },
  );

  app.post('/matching-rules/delete-many', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = deleteManyBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    const deleted = await getSvc(request.user.userId).deleteMany(parsed.data.ids);
    return { deleted };
  });

  app.post('/matching-rules/evaluate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = evaluateBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    const result = await getSvc(request.user.userId).resolve(parsed.data);
    return { result };
  });
}
