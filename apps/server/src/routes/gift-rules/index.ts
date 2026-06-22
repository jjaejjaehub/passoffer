import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GiftRuleService } from '../../services/GiftRuleService';

const CURRENCIES = [
  'KRW', 'JPY', 'USD', 'EUR', 'GBP', 'CNY',
  'TWD', 'HKD', 'SGD', 'AUD', 'CAD', 'THB',
] as const;

const channelFilterSchema = z
  .object({
    channelIds: z.array(z.string().uuid()).optional(),
  })
  .nullable();

const conditionPayloadSchema = z
  .object({
    skuIds: z.array(z.string().uuid()).optional(),
    categoryIds: z.array(z.string().uuid()).optional(),
  })
  .default({});

const listQuery = z.object({
  distributionMode: z.enum(['auto', 'manual']).optional(),
  conditionType: z.enum(['sku', 'category', 'amount', 'qty', 'all']).optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

const createBody = z.object({
  name: z.string().min(1),
  distributionMode: z.enum(['auto', 'manual']).optional(),
  channelFilter: channelFilterSchema.optional(),
  conditionType: z.enum(['sku', 'category', 'amount', 'qty', 'all']),
  conditionCurrency: z.enum(CURRENCIES).nullable().optional(),
  conditionMinAmount: z.number().nonnegative().nullable().optional(),
  conditionMinQty: z.number().int().nonnegative().nullable().optional(),
  conditionPayload: conditionPayloadSchema.optional(),
  giftSkuId: z.string().uuid(),
  giftQty: z.number().int().positive().optional(),
  maxApplyCount: z.number().int().positive().nullable().optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
  activeFrom: z.coerce.date().nullable().optional(),
  activeTo: z.coerce.date().nullable().optional(),
  note: z.string().nullable().optional(),
});

const updateBody = createBody.partial();

const toggleBody = z.object({ isActive: z.boolean() });

const deleteManyBody = z.object({ ids: z.array(z.string().uuid()).min(1) });

const distributeBody = z.object({
  orderIds: z.array(z.string().uuid()).min(1),
});

export async function giftRuleRoutes(app: FastifyInstance): Promise<void> {
  const getSvc = (userId: string) => new GiftRuleService(app, userId);

  app.get('/gift-rules', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = listQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    return getSvc(request.user.userId).list(parsed.data);
  });

  app.get<{ Params: { id: string } }>(
    '/gift-rules/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const row = await getSvc(request.user.userId).getById(request.params.id);
      if (!row) return reply.status(404).send({ error: 'NOT_FOUND' });
      return row;
    },
  );

  app.post('/gift-rules', { preHandler: [app.authenticate] }, async (request, reply) => {
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
      return reply.status(400).send({ error: 'CREATE_FAILED', message: msg });
    }
  });

  app.put<{ Params: { id: string } }>(
    '/gift-rules/:id',
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
    '/gift-rules/:id/toggle',
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
    '/gift-rules/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      await getSvc(request.user.userId).delete(request.params.id);
      return reply.status(204).send();
    },
  );

  app.post('/gift-rules/delete-many', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = deleteManyBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    const deleted = await getSvc(request.user.userId).deleteMany(parsed.data.ids);
    return { deleted };
  });

  app.post('/gift-rules/distribute', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = distributeBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    const result = await getSvc(request.user.userId).distributeManually(parsed.data.orderIds);
    return result;
  });
}
