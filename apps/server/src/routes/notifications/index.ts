import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { orders } from "../../db/schema";
import { NotificationService } from "../../services/NotificationService";

const sendBody = z.object({
  orderId: z.string().uuid().optional(),
  channel: z.enum(["sms", "kakao"]),
  template: z.string().min(1),
  recipient: z.string().min(1).optional(),
  body: z.string().optional(),
  variables: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

const listQuery = z.object({
  orderId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  const service = new NotificationService(app);

  // POST /api/notifications/send — SMS/카카오 단건 발송
  app.post(
    "/notifications/send",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = sendBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_BODY", details: parsed.error.flatten() });
      }
      const { orderId, channel, template, recipient, body, variables } =
        parsed.data;
      const userId = request.user.userId;

      let resolvedRecipient = recipient;
      if (!resolvedRecipient && orderId) {
        const [order] = await app.db
          .select({
            buyerMobile: orders.buyerMobile,
            buyerTel: orders.buyerTel,
          })
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);
        resolvedRecipient = order?.buyerMobile ?? order?.buyerTel ?? undefined;
      }
      if (!resolvedRecipient) {
        return reply.status(400).send({ error: "RECIPIENT_REQUIRED" });
      }

      const row = await service.send({
        userId,
        orderId: orderId ?? null,
        channel,
        template,
        recipient: resolvedRecipient,
        body,
        variables,
      });
      return row;
    },
  );

  // GET /api/notifications?orderId=... — 주문별/유저별 발송 이력
  app.get(
    "/notifications",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = listQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_QUERY", details: parsed.error.flatten() });
      }
      const userId = request.user.userId;
      if (parsed.data.orderId) {
        const items = await service.listByOrder(userId, parsed.data.orderId);
        return { items };
      }
      const items = await service.listByUser(userId, parsed.data.limit ?? 100);
      return { items };
    },
  );
}
