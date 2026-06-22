"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { MessageSquare, X } from "lucide-react";

import {
  NOTIFICATION_TEMPLATES,
  type NotificationChannel,
  type NotificationTemplateDef,
  useSendNotification,
} from "@/entities/notification";
import { appToaster } from "@/shared/ui/app-toaster";

export interface SendNotificationModalProps {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  defaultRecipient?: string;
  defaultVariables?: Record<string, string>;
}

export function SendNotificationModal({
  open,
  onClose,
  orderId,
  defaultRecipient,
  defaultVariables,
}: SendNotificationModalProps): React.JSX.Element | null {
  const [channel, setChannel] = useState<NotificationChannel>("sms");
  const [templateKey, setTemplateKey] = useState<string>(
    NOTIFICATION_TEMPLATES.find((t) => t.channel === "sms")?.key ?? "",
  );
  const [recipient, setRecipient] = useState<string>(defaultRecipient ?? "");
  const [vars, setVars] = useState<Record<string, string>>(
    defaultVariables ?? {},
  );

  const filteredTemplates = useMemo(
    () => NOTIFICATION_TEMPLATES.filter((t) => t.channel === channel),
    [channel],
  );
  const template: NotificationTemplateDef | undefined = useMemo(
    () => NOTIFICATION_TEMPLATES.find((t) => t.key === templateKey),
    [templateKey],
  );

  const previewBody = useMemo(() => {
    if (!template) return "";
    let body = template.body;
    for (const v of template.variables) {
      const value = vars[v.name] ?? `{${v.name}}`;
      const token =
        template.channel === "sms" ? `{{${v.name}}}` : `#{${v.name}}`;
      body = body.split(token).join(value);
    }
    return body;
  }, [template, vars]);

  const mutation = useSendNotification();

  if (!open) return null;

  const onChannelChange = (next: NotificationChannel) => {
    setChannel(next);
    const first = NOTIFICATION_TEMPLATES.find((t) => t.channel === next);
    setTemplateKey(first?.key ?? "");
  };

  const submit = async () => {
    if (!template) {
      appToaster.create({ title: "템플릿을 선택하세요", type: "error" });
      return;
    }
    const finalRecipient = recipient.trim() || undefined;
    if (!finalRecipient && !orderId) {
      appToaster.create({ title: "수신번호를 입력하세요", type: "error" });
      return;
    }
    const missing = template.variables.find(
      (v) => !(vars[v.name] ?? "").trim(),
    );
    if (missing) {
      appToaster.create({
        title: `'${missing.label}' 변수를 입력하세요`,
        type: "error",
      });
      return;
    }
    try {
      const result = await mutation.mutateAsync({
        orderId,
        channel,
        template: template.key,
        recipient: finalRecipient,
        variables: vars,
      });
      const label =
        result.result === "ok" ? "발송 완료" : `발송 ${result.result}`;
      appToaster.create({
        title: label,
        description: result.errorMessage ?? result.vendorMessageId ?? undefined,
        type: result.result === "ok" ? "success" : "warning",
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "발송 실패";
      appToaster.create({ title: message, type: "error" });
    }
  };

  const submitting = mutation.isPending;

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={1000}
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: "calc(100% - 32px)", md: "520px" }}
        bg="white"
        zIndex={1001}
        borderRadius="xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.18)"
        display="flex"
        flexDirection="column"
        maxH="90vh"
        overflowY="auto"
      >
        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
        >
          <Flex align="center" gap={2}>
            <MessageSquare size={18} color="#3182ce" />
            <Box>
              <Text fontWeight="semibold" fontSize="md">
                SMS / 카카오 알림 발송
              </Text>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                모킹 어댑터 — 실제 발송 없이 이벤트 로깅
              </Text>
            </Box>
          </Flex>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              display: "flex",
              alignItems: "center",
              color: "#718096",
              background: "transparent",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              padding: 0,
            }}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </Flex>

        <Box px={5} py={4}>
          <VStack gap={4} align="stretch">
            <Box>
              <Text
                as="label"
                fontSize="sm"
                fontWeight="medium"
                color="gray.700"
                mb={1}
                display="block"
              >
                채널
              </Text>
              <HStack gap={2}>
                {(["sms", "kakao"] as const).map((c) => (
                  <Button
                    key={c}
                    type="button"
                    size="xs"
                    variant={channel === c ? "solid" : "outline"}
                    colorScheme={channel === c ? "blue" : "gray"}
                    onClick={() => onChannelChange(c)}
                  >
                    {c === "sms" ? "SMS" : "카카오 알림톡"}
                  </Button>
                ))}
              </HStack>
            </Box>

            <Box>
              <Text
                as="label"
                fontSize="sm"
                fontWeight="medium"
                color="gray.700"
                mb={1}
                display="block"
              >
                템플릿
              </Text>
              <select
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  fontSize: "14px",
                  color: "#1a202c",
                  backgroundColor: "white",
                }}
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
              >
                {filteredTemplates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Box>

            <Box>
              <Text
                as="label"
                fontSize="sm"
                fontWeight="medium"
                color="gray.700"
                mb={1}
                display="block"
              >
                수신 번호
              </Text>
              <Input
                size="sm"
                placeholder={
                  defaultRecipient ??
                  "010-xxxx-xxxx (생략 시 주문 정보에서 추출)"
                }
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </Box>

            {template && template.variables.length > 0 && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                  변수
                </Text>
                <VStack gap={2} align="stretch">
                  {template.variables.map((v) => (
                    <Flex key={v.name} align="center" gap={2}>
                      <Text fontSize="xs" color="gray.600" w="100px">
                        {v.label}
                      </Text>
                      <Input
                        size="xs"
                        placeholder={v.example}
                        value={vars[v.name] ?? ""}
                        onChange={(e) =>
                          setVars((p) => ({ ...p, [v.name]: e.target.value }))
                        }
                      />
                    </Flex>
                  ))}
                </VStack>
              </Box>
            )}

            <Box>
              <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
                미리보기
              </Text>
              <Textarea
                size="sm"
                value={previewBody}
                readOnly
                rows={4}
                bg="gray.50"
              />
            </Box>

            <HStack gap={2} justify="flex-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={submitting}
              >
                취소
              </Button>
              <Button
                type="button"
                colorScheme="blue"
                size="sm"
                loading={submitting}
                onClick={() => {
                  void submit();
                }}
              >
                발송
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </>
  );
}
