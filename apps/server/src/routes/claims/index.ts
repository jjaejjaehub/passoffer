import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ChannelService } from '../../services/ChannelService';

const claimsQuery = z.object({
  channelId: z.string().uuid(),
  startDate: z.string().regex(/^\d{8}$/),
  endDate: z.string().regex(/^\d{8}$/),
  claimStatus: z.string().optional(),
});

export async function claimRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/claims
  app.get('/claims', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = claimsQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_QUERY', details: parsed.error.flatten() });
    }

    const svc = new ChannelService(app, request.user.userId);
    const adapter = await svc.getAdapter(parsed.data.channelId);
    if (!adapter.getClaims) {
      return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 클레임 조회를 지원하지 않습니다.' });
    }
    const claims = await adapter.getClaims({
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      claimStatus: parsed.data.claimStatus,
    });
    return claims;
  });
}
