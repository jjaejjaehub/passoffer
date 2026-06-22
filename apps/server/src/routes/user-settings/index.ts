import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  DEFAULT_USER_ORDER_SETTINGS,
  userSettings,
  type UserOrderSettings,
} from "../../db/schema";

const orderSettingsBody = z.object({
  lookbackDays: z.number().int().min(1).max(365).optional(),
  autoMatchSku: z.boolean().optional(),
  dispatchDelayThresholdDays: z.number().int().min(0).max(60).optional(),
  bundleKey: z.array(z.string().min(1)).min(1).max(8).optional(),
});

function mergeOrderSettings(
  saved: Partial<UserOrderSettings> | undefined,
): UserOrderSettings {
  return {
    ...DEFAULT_USER_ORDER_SETTINGS,
    ...(saved ?? {}),
    bundleKey: saved?.bundleKey ?? [...DEFAULT_USER_ORDER_SETTINGS.bundleKey],
  } satisfies UserOrderSettings;
}

export async function userSettingsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/user-settings/orders
  app.get(
    "/user-settings/orders",
    { preHandler: [app.authenticate] },
    async (request) => {
      const userId = request.user.userId;
      const rows = await app.db
        .select({ orders: userSettings.orders })
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
      return mergeOrderSettings(
        rows[0]?.orders as Partial<UserOrderSettings> | undefined,
      );
    },
  );

  // PUT /api/user-settings/orders
  app.put(
    "/user-settings/orders",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = orderSettingsBody.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: "INVALID_REQUEST", details: parsed.error.flatten() });
      }
      const userId = request.user.userId;

      const rows = await app.db
        .select({ orders: userSettings.orders })
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      const current = mergeOrderSettings(
        rows[0]?.orders as Partial<UserOrderSettings> | undefined,
      );
      const next: UserOrderSettings = {
        lookbackDays: parsed.data.lookbackDays ?? current.lookbackDays,
        autoMatchSku: parsed.data.autoMatchSku ?? current.autoMatchSku,
        dispatchDelayThresholdDays:
          parsed.data.dispatchDelayThresholdDays ??
          current.dispatchDelayThresholdDays,
        bundleKey: parsed.data.bundleKey ?? current.bundleKey,
      };

      if (rows.length === 0) {
        await app.db.insert(userSettings).values({ userId, orders: next });
      } else {
        await app.db
          .update(userSettings)
          .set({ orders: next, updatedAt: new Date() })
          .where(eq(userSettings.userId, userId));
      }

      return next;
    },
  );
}
