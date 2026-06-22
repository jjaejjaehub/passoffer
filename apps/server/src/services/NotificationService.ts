import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import type { INotificationAdapter, NotificationChannel } from "@oms/types";
import { MockSmsAdapter } from "../adapters/notifications/MockSmsAdapter";
import { MockKakaoAdapter } from "../adapters/notifications/MockKakaoAdapter";
import { notificationEvents } from "../db/schema";

export interface SendNotificationInput {
  userId: string;
  orderId?: string | null;
  channel: NotificationChannel;
  template: string;
  recipient: string;
  body?: string;
  variables?: Record<string, string | number>;
}

function pickAdapter(channel: NotificationChannel): INotificationAdapter {
  return channel === "sms" ? new MockSmsAdapter() : new MockKakaoAdapter();
}

export class NotificationService {
  constructor(private readonly app: FastifyInstance) {}

  async send(input: SendNotificationInput) {
    const adapter = pickAdapter(input.channel);
    let sendResult;
    try {
      sendResult = await adapter.send({
        recipient: input.recipient,
        template: input.template,
        body: input.body,
        variables: input.variables,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      const [row] = await this.app.db
        .insert(notificationEvents)
        .values({
          userId: input.userId,
          orderId: input.orderId ?? null,
          channel: input.channel,
          template: input.template,
          recipient: input.recipient,
          payload: (input.variables ?? {}) as Record<string, unknown>,
          result: "error",
          errorMessage: message,
        })
        .returning();
      return row;
    }

    const [row] = await this.app.db
      .insert(notificationEvents)
      .values({
        userId: input.userId,
        orderId: input.orderId ?? null,
        channel: input.channel,
        template: input.template,
        recipient: input.recipient,
        payload: (input.variables ?? {}) as Record<string, unknown>,
        result: sendResult.result,
        errorMessage: sendResult.errorMessage,
        vendorMessageId: sendResult.vendorMessageId,
        renderedBody: sendResult.renderedBody,
      })
      .returning();
    return row;
  }

  async listByOrder(userId: string, orderId: string) {
    return this.app.db
      .select()
      .from(notificationEvents)
      .where(
        and(
          eq(notificationEvents.userId, userId),
          eq(notificationEvents.orderId, orderId),
        ),
      )
      .orderBy(desc(notificationEvents.sentAt));
  }

  async listByUser(userId: string, limit = 100) {
    return this.app.db
      .select()
      .from(notificationEvents)
      .where(eq(notificationEvents.userId, userId))
      .orderBy(desc(notificationEvents.sentAt))
      .limit(limit);
  }
}
