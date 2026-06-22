"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Input, Stack, Text } from "@chakra-ui/react";
import {
  useBarcodeVerify,
  type BarcodeVerifyResult,
  type BarcodeVerifyReason,
} from "@/entities/order";
import { appToaster } from "@/shared/ui/app-toaster";

export interface BarcodeScanRecord {
  id: string;
  timestamp: string;
  scannedCode: string;
  result: BarcodeVerifyResult;
}

export interface BarcodeScanVerifyProps {
  orderId?: string;
  onScanResult?: (record: BarcodeScanRecord) => void;
}

const REASON_MESSAGE: Record<BarcodeVerifyReason, string> = {
  not_found: "일치하는 주문을 찾을 수 없습니다.",
  ineligible_status: "출고 가능한 상태(배송준비/송장입력)가 아닙니다.",
  expected_mismatch: "선택한 주문과 다른 주문입니다.",
  multiple_matches: "동일 코드로 매칭되는 주문이 여러 건입니다.",
};

function makeRecordId(): string {
  return `${performance.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function BarcodeScanVerify({
  orderId,
  onScanResult,
}: BarcodeScanVerifyProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState("");
  const mutation = useBarcodeVerify();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const focusInput = (): void => {
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submit = (): void => {
    const code = value.trim();
    if (!code || mutation.isPending) return;

    mutation.mutate(
      { scannedCode: code, expectedOrderId: orderId },
      {
        onSuccess: (result) => {
          const record: BarcodeScanRecord = {
            id: makeRecordId(),
            timestamp: new Date().toISOString(),
            scannedCode: code,
            result,
          };
          onScanResult?.(record);

          if (result.matched && result.order) {
            const label =
              result.order.trackingNo ?? result.order.channelOrderId ?? code;
            appToaster.create({
              type: "success",
              title: "출고완료 전환됨",
              description: `${label} → 50(출고완료)`,
            });
          } else {
            const reasonMsg = result.reason
              ? REASON_MESSAGE[result.reason]
              : "검증에 실패했습니다.";
            appToaster.create({
              type: "error",
              title: "매칭 실패",
              description: `${code} — ${reasonMsg}`,
            });
          }

          setValue("");
          focusInput();
        },
        onError: (err) => {
          appToaster.create({
            type: "error",
            title: "요청 실패",
            description: err instanceof Error ? err.message : "네트워크 오류",
          });
          focusInput();
        },
      },
    );
  };

  return (
    <Box borderWidth="1px" borderRadius="md" p="4" bg="white">
      <Stack gap="3">
        <Flex justify="space-between" align="center">
          <Text fontWeight="semibold">바코드 스캔</Text>
          <Text fontSize="sm" color="gray.500">
            송장번호 또는 채널주문번호 스캔
          </Text>
        </Flex>
        <Flex gap="2">
          <Input
            ref={inputRef}
            value={value}
            placeholder="스캐너 입력 대기 중..."
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            disabled={mutation.isPending}
            autoComplete="off"
            spellCheck={false}
            size="lg"
          />
          <Button
            onClick={submit}
            loading={mutation.isPending}
            disabled={!value.trim()}
            colorPalette="blue"
            size="lg"
          >
            검증
          </Button>
        </Flex>
        <Text fontSize="xs" color="gray.500">
          ELIGIBLE: 배송준비(30) · 송장입력(35) · 출고대기(40) → 출고완료(50)
        </Text>
      </Stack>
    </Box>
  );
}
