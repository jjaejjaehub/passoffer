import type {
  INotificationAdapter,
  NotificationChannel,
  NotificationVendor,
  NotificationSendInput,
  NotificationSendResult,
} from '@oms/types';

// ─── Mock SMS Adapter ──────────────────────────────────────────────
// 실제 SMS 발송 없이 80ms latency 시뮬레이션 + vendorMessageId 발급.

function renderTemplate(template: string, variables?: Record<string, string | number>): string {
  if (!variables) return template;
  return Object.entries(variables).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v)),
    template,
  );
}

export class MockSmsAdapter implements INotificationAdapter {
  readonly vendor: NotificationVendor = 'mock_sms';
  readonly channel: NotificationChannel = 'sms';

  async send(input: NotificationSendInput): Promise<NotificationSendResult> {
    await new Promise(r => setTimeout(r, 80));
    const renderedBody = renderTemplate(input.body ?? input.template, input.variables);
    const vendorMessageId = `SMS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      ok: true,
      vendorMessageId,
      result: 'ok',
      renderedBody,
      vendorResponse: { mock: true, recipient: input.recipient, length: renderedBody.length },
    };
  }
}
