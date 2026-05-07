"use client";

import {
  Button,
  Grid,
  GridItem,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useRef } from "react";

import type { OptionAxisState } from "@/entities/product";
import { PRODUCT_OPTION_AXIS_PRESETS } from "@/shared/constants/qoo10OptionPresets";
import { appToaster } from "@/shared/ui/app-toaster";

interface OptionAxisFormProps {
  axes: OptionAxisState[];
  maxAxes: number;
  maxValues: number;
  onAxesChange: (axes: OptionAxisState[]) => void;
  onApply: (confirmedAxes: OptionAxisState[]) => void;
  applyLabel: string;
}

function createAxisId(): string {
  return `axis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function OptionAxisForm({
  axes,
  maxAxes,
  maxValues,
  onAxesChange,
  onApply,
  applyLabel,
}: OptionAxisFormProps): React.JSX.Element {
  const axisNameRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const canAddAxis = axes.length < maxAxes;
  const disableReason = `항목명은 최대 ${maxAxes}개까지 입력 가능합니다`;
  const axesWithFallback = axes.length > 0 ? axes : [];

  const setAxisName = (id: string, name: string): void => {
    onAxesChange(
      axesWithFallback.map((axis) =>
        axis.id === id ? { ...axis, name } : axis,
      ),
    );
  };

  // 타이핑 중에는 raw string만 유지하고, 적용 시 values를 확정한다.
  const setAxisRawValues = (id: string, raw: string): void => {
    onAxesChange(
      axesWithFallback.map((axis) =>
        axis.id === id ? { ...axis, _rawValues: raw } : axis,
      ),
    );
  };

  const clearAxisName = (id: string): void => {
    setAxisName(id, "");
    axisNameRefs.current[id]?.focus();
  };

  const clearAxisValues = (id: string): void => {
    onAxesChange(
      axesWithFallback.map((axis) =>
        axis.id === id ? { ...axis, _rawValues: "", values: [] } : axis,
      ),
    );
  };

  const removeAxis = (id: string): void => {
    onAxesChange(axesWithFallback.filter((axis) => axis.id !== id));
  };

  const addAxis = (name: string): void => {
    if (!canAddAxis) return;
    const next: OptionAxisState = {
      id: createAxisId(),
      name,
      values: [],
      _rawValues: "",
    };
    onAxesChange([...axesWithFallback, next]);
    requestAnimationFrame(() => {
      axisNameRefs.current[next.id]?.focus();
    });
  };

  const handlePresetClick = (name: string | null): void => {
    if (!canAddAxis) return;
    addAxis(name ?? "");
  };

  const handleApply = (): void => {
    const confirmed = axesWithFallback.map((axis) => {
      const nextValues = dedupe(
        axis._rawValues
          .split(",")
          .map((token) => token.trim())
          .filter((token) => token.length > 0),
      );
      return { ...axis, values: nextValues };
    });

    if (confirmed.some((axis) => axis.name.trim().length === 0)) {
      appToaster.create({ title: "항목명을 입력해주세요.", type: "warning" });
      return;
    }
    if (confirmed.some((axis) => axis.values.length === 0)) {
      appToaster.create({ title: "항목값을 입력해주세요.", type: "warning" });
      return;
    }
    if (confirmed.some((axis) => axis.values.length > maxValues)) {
      appToaster.create({
        title: `항목값은 최대 ${maxValues}개까지 입력 가능합니다.`,
        type: "warning",
      });
      return;
    }

    const names = confirmed.map((axis) => axis.name.trim());
    if (new Set(names).size !== names.length) {
      appToaster.create({ title: "항목명이 중복됩니다.", type: "warning" });
      return;
    }

    onAxesChange(confirmed);
    onApply(confirmed);
  };

  return (
    <VStack align="stretch" gap={3} mb={4}>
      <HStack flexWrap="wrap" gap={2} justify="space-between">
        <HStack flexWrap="wrap" gap={2}>
          {PRODUCT_OPTION_AXIS_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              size="xs"
              variant="outline"
              disabled={!canAddAxis}
              title={!canAddAxis ? disableReason : undefined}
              onClick={() => handlePresetClick(preset.nameValue)}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            size="xs"
            variant="outline"
            disabled={!canAddAxis}
            title={!canAddAxis ? disableReason : undefined}
            onClick={() => addAxis("")}
          >
            + 직접 추가
          </Button>
        </HStack>
      </HStack>

      {axesWithFallback.length > 0 ? (
        <Grid templateColumns="160px 1fr 40px" gap={3} alignItems="center">
          <GridItem>
            <Text fontSize="sm" color="gray.600">
              항목명
            </Text>
          </GridItem>
          <GridItem>
            <Text fontSize="sm" color="gray.600">
              항목값
            </Text>
          </GridItem>
          <GridItem />

          {axesWithFallback.map((axis) => (
            <GridItem key={axis.id} colSpan={3}>
              <Grid
                templateColumns="160px 1fr 40px"
                gap={3}
                alignItems="center"
              >
                <GridItem>
                  <HStack gap={1}>
                    <Input
                      ref={(el) => {
                        axisNameRefs.current[axis.id] = el;
                      }}
                      size="sm"
                      value={axis.name}
                      onChange={(event) =>
                        setAxisName(axis.id, event.target.value)
                      }
                      placeholder="항목명"
                    />
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => clearAxisName(axis.id)}
                    >
                      ✕
                    </Button>
                  </HStack>
                </GridItem>

                <GridItem>
                  <HStack gap={1}>
                    <Input
                      size="sm"
                      value={axis._rawValues}
                      onChange={(event) =>
                        setAxisRawValues(axis.id, event.target.value)
                      }
                      placeholder="값1,값2,값3"
                    />
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => clearAxisValues(axis.id)}
                    >
                      ✕
                    </Button>
                  </HStack>
                </GridItem>

                <GridItem>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => removeAxis(axis.id)}
                  >
                    ✕
                  </Button>
                </GridItem>
              </Grid>
            </GridItem>
          ))}
        </Grid>
      ) : null}

      <Button
        size="sm"
        variant="outline"
        alignSelf="flex-start"
        onClick={handleApply}
        display="none"
      >
        {applyLabel}
      </Button>
    </VStack>
  );
}
