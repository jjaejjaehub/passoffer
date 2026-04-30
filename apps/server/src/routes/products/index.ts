import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ChannelService } from '../../services/ChannelService';

const productsQuery = z.object({
  channelId: z.string().uuid(),
  itemStatus: z.union([z.string(), z.array(z.string())]).optional(),
  page: z.string().optional(),
  mergeAll: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  offset: z.string().optional().transform((v) => (v !== undefined ? Number(v) : undefined)),
  pageSize: z.string().optional().transform((v) => (v !== undefined ? Number(v) : undefined)),
});

export async function productRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/products
  app.get('/products', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = productsQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_QUERY', details: parsed.error.flatten() });
    }

    const svc = new ChannelService(app, request.user.userId);
    const adapter = await svc.getAdapter(parsed.data.channelId);
    if (!adapter.getProducts) {
      return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 상품 조회를 지원하지 않습니다.' });
    }
    const products = await adapter.getProducts({
      itemStatus: parsed.data.itemStatus,
      page: parsed.data.page,
      mergeAll: parsed.data.mergeAll,
      offset: parsed.data.offset,
      pageSize: parsed.data.pageSize,
    });
    return products;
  });

  // GET /api/products/:channelId/:itemCode
  app.get<{ Params: { channelId: string; itemCode: string } }>(
    '/products/:channelId/:itemCode',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const svc = new ChannelService(app, request.user.userId);
        const adapter = await svc.getAdapter(request.params.channelId);
        if (!adapter.getProductDetail) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 상품 상세 조회를 지원하지 않습니다.' });
        }
        const product = await adapter.getProductDetail(request.params.itemCode);
        return { product };
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'Product not found';
        return reply.status(404).send({ error: 'NOT_FOUND', message });
      }
    },
  );

  // POST /api/products/:channelId
  app.post<{ Params: { channelId: string } }>(
    '/products/:channelId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const svc = new ChannelService(app, request.user.userId);
        const adapter = await svc.getAdapter(request.params.channelId);
        if (!adapter.registerProduct) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 상품 등록을 지원하지 않습니다.' });
        }
        const result = await adapter.registerProduct(request.body);
        return result;
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'Product registration failed';
        return reply.status(500).send({ error: 'REGISTER_FAILED', message });
      }
    },
  );

  // PUT /api/products/:channelId/:itemCode
  app.put<{ Params: { channelId: string; itemCode: string } }>(
    '/products/:channelId/:itemCode',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const svc = new ChannelService(app, request.user.userId);
        const adapter = await svc.getAdapter(request.params.channelId);
        if (!adapter.updateProduct) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 상품 수정을 지원하지 않습니다.' });
        }
        const result = await adapter.updateProduct(request.params.itemCode, request.body);
        return result;
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'Product update failed';
        return reply.status(500).send({ error: 'UPDATE_FAILED', message });
      }
    },
  );

  // PATCH /api/products/:channelId/:itemCode/status
  app.patch<{ Params: { channelId: string; itemCode: string }; Body: { status: string } }>(
    '/products/:channelId/:itemCode/status',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { status } = request.body as { status?: string };
        if (!status) {
          return reply.status(400).send({ error: 'INVALID_BODY', message: 'status is required' });
        }
        const svc = new ChannelService(app, request.user.userId);
        const adapter = await svc.getAdapter(request.params.channelId);
        if (!adapter.updateProductStatus) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 상품 상태 변경을 지원하지 않습니다.' });
        }
        await adapter.updateProductStatus(request.params.itemCode, status);
        return { ok: true };
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'Status update failed';
        return reply.status(500).send({ error: 'STATUS_UPDATE_FAILED', message });
      }
    },
  );

  // POST /api/products/:channelId/:itemCode/unlist
  app.post<{ Params: { channelId: string; itemCode: string }; Body: { unlist: boolean } }>(
    '/products/:channelId/:itemCode/unlist',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { unlist } = request.body as { unlist?: boolean };
        if (typeof unlist !== 'boolean') {
          return reply.status(400).send({ error: 'INVALID_BODY', message: 'unlist (boolean) is required' });
        }
        const svc = new ChannelService(app, request.user.userId);
        const adapter = await svc.getAdapter(request.params.channelId);
        if (!adapter.unlistProduct) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 unlist를 지원하지 않습니다.' });
        }
        await adapter.unlistProduct(Number(request.params.itemCode), unlist);
        return { success: true };
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'Unlist failed';
        return reply.status(500).send({ error: 'UNLIST_FAILED', message });
      }
    },
  );

  // DELETE /api/products/:channelId/:itemCode
  app.delete<{ Params: { channelId: string; itemCode: string } }>(
    '/products/:channelId/:itemCode',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const svc = new ChannelService(app, request.user.userId);
        const adapter = await svc.getAdapter(request.params.channelId);
        if (!adapter.deleteProduct) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 상품 삭제를 지원하지 않습니다.' });
        }
        const result = await adapter.deleteProduct(request.params.itemCode);
        return result;
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'Product delete failed';
        return reply.status(500).send({ error: 'DELETE_FAILED', message });
      }
    },
  );
}
