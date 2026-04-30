import type { FastifyInstance } from 'fastify';
import { ChannelService } from '../../services/ChannelService';

export async function inventoryRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/inventory?channelId=&pageSize=&after=&keyword=&status=
  app.get('/inventory', { preHandler: [app.authenticate] }, async (request, reply) => {
    const q = request.query as Record<string, string | undefined>;
    const channelId = q.channelId;
    if (!channelId) {
      return reply.status(400).send({ error: 'INVALID_QUERY', message: 'channelId is required' });
    }

    try {
      const svc = new ChannelService(app, request.user.userId);
      const adapter = await svc.getAdapter(channelId);
      if (!adapter.getInventory) {
        return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 재고 조회를 지원하지 않습니다.' });
      }
      const result = await adapter.getInventory({
        pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        after: q.after,
        keyword: q.keyword,
        status: q.status,
      });
      return result;
    } catch (err: unknown) {
      app.log.error(err);
      const message = err instanceof Error ? err.message : 'Inventory fetch failed';
      return reply.status(500).send({ error: 'INVENTORY_FETCH_FAILED', message });
    }
  });

  // POST /api/inventory/:channelId/adjust
  app.post<{ Params: { channelId: string } }>(
    '/inventory/:channelId/adjust',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const svc = new ChannelService(app, request.user.userId);
        const adapter = await svc.getAdapter(request.params.channelId);
        if (!adapter.adjustInventory) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 재고 조정을 지원하지 않습니다.' });
        }
        const body = request.body as { inventoryItemId?: string; newQuantity?: number; currentQuantity?: number };
        if (!body.inventoryItemId || body.newQuantity == null || body.currentQuantity == null) {
          return reply.status(400).send({ error: 'INVALID_BODY', message: 'inventoryItemId, newQuantity, currentQuantity are required' });
        }
        await adapter.adjustInventory({
          inventoryItemId: body.inventoryItemId,
          newQuantity: body.newQuantity,
          currentQuantity: body.currentQuantity,
        });
        return { ok: true };
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'Inventory adjust failed';
        return reply.status(500).send({ error: 'ADJUST_FAILED', message });
      }
    },
  );
}
