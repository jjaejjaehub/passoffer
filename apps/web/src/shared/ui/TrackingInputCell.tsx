"use client";

import type React from "react";
import type { BoxProps } from "@chakra-ui/react";
import {
  Box,
  HStack,
  IconButton,
  Input,
  NativeSelectField,
  NativeSelectRoot,
  Text,
} from "@chakra-ui/react";
import { Check, Lock, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CarrierId } from "@/entities/order";
import type { ChannelId } from "@/shared/config";

type CellMode = "locked" | "editing" | "saved";

interface TrackingInputCellProps extends BoxProps {
  orderId: string;
  channelId: ChannelId;
  shipDate: string | null;
  existingCarrierId?: CarrierId | null;
  existingTrackingNumber?: string | null;
  onSave: (data: {
    carrierId: CarrierId;
    trackingNumber: string;
  }) => Promise<{ success: boolean }>;
  onCancel: () => void;
}

const CARRIER_LABELS: Record<CarrierId, string> = {
  cj: "CJ대한통운",
  lotte: "롯데택배",
  hanjin: "한진택배",
  epost: "우체국",
  etc: "기타",
};

export function TrackingInputCell({
  orderId,
  channelId,
  shipDate,
  existingCarrierId,
  existingTrackingNumber,
  onSave,
  onCancel,
  ...rest
}: TrackingInputCellProps): React.JSX.Element {
  const [mode, setMode] = useState<CellMode>(() => {
    if (existingTrackingNumber) return "saved";
    if (!shipDate) return "locked";
    return "editing";
  });
  const [carrierId, setCarrierId] = useState<CarrierId | "">(
    existingCarrierId ?? "",
  );
  const [trackingNumber, setTrackingNumber] = useState<string>(
    existingTrackingNumber ?? "",
  );

  useEffect(() => {
    if (!shipDate && mode !== "locked") {
      setMode("locked");
    }
    if (shipDate && mode === "locked" && !existingTrackingNumber) {
      setMode("editing");
    }
  }, [shipDate, mode, existingTrackingNumber]);

  const isEditable = mode === "editing";

  const isValid = useMemo(() => {
    return Boolean(carrierId && trackingNumber.trim().length > 4);
  }, [carrierId, trackingNumber]);

  const handleCarrierChange: React.ChangeEventHandler<HTMLSelectElement> =
    useCallback((event) => {
      const value = event.target.value as CarrierId | "";
      setCarrierId(value);
    }, []);

  const handleTrackingChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      setTrackingNumber(event.target.value);
    }, []);

  const handleSave = useCallback(async () => {
    if (!carrierId || !isValid) return;
    const result = await onSave({
      carrierId,
      trackingNumber: trackingNumber.trim(),
    });
    if (result.success) {
      setMode("saved");
    }
  }, [carrierId, trackingNumber, isValid, onSave]);

  const handleCancel = useCallback(() => {
    setCarrierId(existingCarrierId ?? "");
    setTrackingNumber(existingTrackingNumber ?? "");
    setMode(existingTrackingNumber ? "saved" : shipDate ? "editing" : "locked");
    onCancel();
  }, [existingCarrierId, existingTrackingNumber, shipDate, onCancel]);

  if (mode === "locked") {
    return (
      <Box {...rest}>
        <HStack gap={1} color="gray.300" fontSize="xs">
          <Lock size={12} />
          <Text>발송 예정일 먼저</Text>
        </HStack>
      </Box>
    );
  }

  if (mode === "saved" && existingCarrierId && existingTrackingNumber) {
    return (
      <Box {...rest}>
        <HStack gap={2} fontSize="xs">
          <Box
            px={2}
            py={1}
            borderWidth="1px"
            borderRadius="full"
            borderColor="gray.200"
            bg="gray.50"
          >
            {CARRIER_LABELS[existingCarrierId]}
          </Box>
          <Text fontFamily="mono" color="gray.800">
            {existingTrackingNumber}
          </Text>
        </HStack>
      </Box>
    );
  }

  return (
    <Box {...rest}>
      <HStack gap={2}>
        <NativeSelectRoot size="sm" width="110px">
          <NativeSelectField
            fontSize="xs"
            value={carrierId}
            placeholder="택배사"
            onChange={handleCarrierChange}
          >
            {(Object.keys(CARRIER_LABELS) as CarrierId[]).map((id) => (
              <option key={id} value={id}>
                {CARRIER_LABELS[id]}
              </option>
            ))}
          </NativeSelectField>
        </NativeSelectRoot>
        <Input
          id={`tracking-input-${orderId}`}
          size="sm"
          fontSize="xs"
          value={trackingNumber}
          onChange={handleTrackingChange}
          placeholder="운송장 번호"
          disabled={!isEditable || !carrierId}
        />
        <IconButton
          aria-label="운송장 저장"
          size="xs"
          disabled={!isValid}
          onClick={handleSave}
        >
          <Check size={12} />
        </IconButton>
        <IconButton
          aria-label="취소"
          size="xs"
          variant="ghost"
          onClick={handleCancel}
        >
          <X size={12} />
        </IconButton>
      </HStack>
    </Box>
  );
}
