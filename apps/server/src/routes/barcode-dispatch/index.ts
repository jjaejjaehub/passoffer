import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { OrderService } from "../../services/OrderService";

const verifyBodySchema = z.object({
  scannedCode: z.string().min(1),
  expectedOrderId: z.string().uuid().optional(),
});

export async function barcodeDispatchRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post(
    "/barcode-dispatch/verify",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = verifyBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_body", detail: parsed.error.flatten() });
      }
      const userId = request.user.userId;
      const svc = new OrderService(app);
      const result = await svc.barcodeVerifyAndDispatch({
        userId,
        scannedCode: parsed.data.scannedCode,
        expectedOrderId: parsed.data.expectedOrderId,
      });
      return reply.send(result);
    },
  );
}
