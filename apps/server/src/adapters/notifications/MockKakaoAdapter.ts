import type {
  INotificationAdapter,
  NotificationChannel,
  NotificationVendor,
  NotificationSendInput,
  NotificationSendResult,
} from "@oms/types";

// ─── Mock 카카오 알림톡 Adapter ─────────────────────────────────────
// 실제 카카오 비즈메시지 API 호출 없이 80ms latency 시뮬레이션.

function renderTemplate(
  template: string,
  variables?: Record<string, string | number>,
): string {
  if (!variables) return template;
  return Object.entries(variables).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`#\\{${k}\\}`, "g"), String(v)),
    template,
  );
}

export class MockKakaoAdapter implements INotificationAdapter {
  readonly vendor: NotificationVendor = "mock_kakao";
  readonly channel: NotificationChannel = "kakao";

  async send(input: NotificationSendInput): Promise<NotificationSendResult> {
    await new Promise((r) => setTimeout(r, 80));
    const renderedBody = renderTemplate(
      input.body ?? input.template,
      input.variables,
    );
    const vendorMessageId = `KAKAO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      ok: true,
      vendorMessageId,
      result: "ok",
      renderedBody,
      vendorResponse: {
        mock: true,
        recipient: input.recipient,
        templateKey: input.template,
      },
    };
  }
}
