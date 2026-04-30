"use client";

import {
  Box,
  Button,
  Dialog,
  Flex,
  Grid,
  Heading,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";
import { EmptyState, LoadingState, ErrorState, appToaster } from "@/shared/ui";
import {
  AdjustmentBeforeAfterPanel,
  AdjustmentLocationPicker,
  AdjustmentSkuLotPicker,
  WarehouseSelector,
  useSelectedWarehouseId,
} from "@/widgets/admin-warehouses";
import {
  useWarehouseCapabilities,
  useWarehouseInventory,
  useWarehouseLocations,
} from "@/entities/warehouse/api/warehouseQueries";
import { useRequestAdjustment } from "@/entities/warehouse/api/warehouseMutations";
import {
  INITIAL_WIZARD_STATE,
  buildReasonOptions,
  type DestinationInput,
  type ReviewInput,
  type SourceSelection,
  type WizardState,
  type WizardStep,
} from "@/entities/stock-movement";
import type {
  AdjustmentRequest,
  InventoryRow,
  LocationNode,
} from "@oms/types";

const STEPS: { step: WizardStep; label: string; description: string }[] = [
  { step: 1, label: "출발 선택", description: "로케이션과 SKU/LOT" },
  { step: 2, label: "도착 입력", description: "도착 로케이션과 수량" },
  { step: 3, label: "검토 및 확정", description: "Before/After 미리보기" },
];

export function AdjustmentsPage(): React.JSX.Element {
  const { warehouseId } = useSelectedWarehouseId();

  return (
    <Box p={6}>
      <Flex align="center" justify="space-between" mb={6}>
        <Heading size="lg">재고 이동/조정</Heading>
        <WarehouseSelector />
      </Flex>

      {warehouseId === null ? (
        <EmptyState
          title="창고를 선택해주세요"
          description="우측 상단에서 창고를 선택하면 조정 마법사를 시작할 수 있습니다."
        />
      ) : (
        <AdjustmentWizard warehouseId={warehouseId} />
      )}
    </Box>
  );
}

interface AdjustmentWizardProps {
  warehouseId: string;
}

function AdjustmentWizard({ warehouseId }: AdjustmentWizardProps): ReactElement {
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const capabilitiesQuery = useWarehouseCapabilities(warehouseId);
  const locationsQuery = useWarehouseLocations(warehouseId);

  const requestAdjustment = useRequestAdjustment(warehouseId);

  if (capabilitiesQuery.isLoading || locationsQuery.isLoading) {
    return <LoadingState rows={4} />;
  }
  if (capabilitiesQuery.isError) {
    return (
      <ErrorState
        title="창고 정보를 불러오지 못했습니다"
        description={(capabilitiesQuery.error as Error).message}
        onRetry={() => capabilitiesQuery.refetch()}
      />
    );
  }
  if (locationsQuery.isError) {
    return (
      <ErrorState
        title="로케이션을 불러오지 못했습니다"
        description={(locationsQuery.error as Error).message}
        onRetry={() => locationsQuery.refetch()}
      />
    );
  }

  const capabilities = capabilitiesQuery.data;
  const locationNodes = locationsQuery.data ?? [];

  if (!capabilities) {
    return (
      <EmptyState
        title="창고 능력 정보를 사용할 수 없습니다"
        description="창고 데이터를 다시 불러와 주세요."
      />
    );
  }

  const reasonOptions = buildReasonOptions(
    capabilities.capabilities.reasonCodeMapping,
  );

  const goNext = (): void => {
    setState((prev) => ({
      ...prev,
      step: Math.min(3, prev.step + 1) as WizardStep,
    }));
  };

  const goPrev = (): void => {
    setState((prev) => ({
      ...prev,
      step: Math.max(1, prev.step - 1) as WizardStep,
    }));
  };

  const reset = (): void => {
    setState(INITIAL_WIZARD_STATE);
  };

  const setSource = (source: SourceSelection | null): void => {
    setState((prev) => ({ ...prev, source }));
  };

  const setDestination = (
    destination: DestinationInput | null,
  ): void => {
    setState((prev) => ({ ...prev, destination }));
  };

  const setReview = (review: Partial<ReviewInput>): void => {
    setState((prev) => ({ ...prev, review: { ...prev.review, ...review } }));
  };

  const canStep1Continue = state.source !== null;
  const canStep2Continue =
    state.source !== null &&
    state.destination !== null &&
    state.destination.locationCode !== state.source.locationCode &&
    state.destination.quantity > 0 &&
    state.destination.quantity <=
      state.source.inventoryRow.quantity -
        state.source.inventoryRow.reservedQuantity;
  const canStep3Confirm =
    canStep2Continue &&
    state.review.reasonCode.trim().length > 0;

  const handleConfirm = async (): Promise<void> => {
    if (!state.source || !state.destination) return;
    setSubmitting(true);
    try {
      const sourceReq: AdjustmentRequest = {
        sku: state.source.sku,
        delta: -state.destination.quantity,
        reasonCode: state.review.reasonCode,
        locationCode: state.source.locationCode,
        note: state.review.note || undefined,
      };
      const destReq: AdjustmentRequest = {
        sku: state.source.sku,
        delta: state.destination.quantity,
        reasonCode: state.review.reasonCode,
        locationCode: state.destination.locationCode,
        note: state.review.note || undefined,
      };

      const sourceResp = await requestAdjustment.mutateAsync(sourceReq);
      const destResp = await requestAdjustment.mutateAsync(destReq);

      const anyPending =
        sourceResp.status === "pending_external" ||
        destResp.status === "pending_external";

      if (anyPending) {
        appToaster.create({
          type: "info",
          title: "외부 WMS 처리 대기",
          description:
            "벤더 시스템에서 처리 중입니다. 동기화 후 재고에 반영됩니다.",
        });
      } else {
        appToaster.create({
          type: "success",
          title: "재고 이동 완료",
          description: `${state.source.sku} ${state.destination.quantity}개를 이동했습니다.`,
        });
      }
      setConfirmOpen(false);
      reset();
    } catch (err) {
      appToaster.create({
        type: "error",
        title: "재고 이동 실패",
        description: (err as Error).message ?? "다시 시도해 주세요.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap={6}>
      <StepperHeader currentStep={state.step} />

      {state.step === 1 ? (
        <Step1SourceSelect
          warehouseId={warehouseId}
          locationNodes={locationNodes}
          source={state.source}
          onChangeSource={setSource}
        />
      ) : null}

      {state.step === 2 ? (
        <Step2Destination
          locationNodes={locationNodes}
          source={state.source}
          destination={state.destination}
          onChangeDestination={setDestination}
        />
      ) : null}

      {state.step === 3 ? (
        <Step3Review
          source={state.source}
          destination={state.destination}
          review={state.review}
          reasonOptions={reasonOptions}
          locationNodes={locationNodes}
          onChangeReview={setReview}
        />
      ) : null}

      <Flex justify="space-between" pt={2}>
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={state.step === 1}
        >
          <ArrowLeft size={14} /> 이전
        </Button>
        <Flex gap={2}>
          <Button variant="ghost" size="sm" onClick={reset}>
            처음부터
          </Button>
          {state.step < 3 ? (
            <Button
              variant="solid"
              colorPalette="blue"
              size="sm"
              onClick={goNext}
              disabled={
                state.step === 1
                  ? !canStep1Continue
                  : !canStep2Continue
              }
            >
              다음 <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              variant="solid"
              colorPalette="blue"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={!canStep3Confirm || submitting}
            >
              <CheckCircle2 size={14} /> 확정
            </Button>
          )}
        </Flex>
      </Flex>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!submitting) setConfirmOpen(open);
        }}
        source={state.source}
        destination={state.destination}
        review={state.review}
        submitting={submitting}
        onConfirm={handleConfirm}
      />
    </Stack>
  );
}

interface StepperHeaderProps {
  currentStep: WizardStep;
}

function StepperHeader({ currentStep }: StepperHeaderProps): ReactElement {
  return (
    <Flex
      align="center"
      gap={3}
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={3}
    >
      {STEPS.map((s, idx) => {
        const isActive = s.step === currentStep;
        const isComplete = s.step < currentStep;
        return (
          <Flex key={s.step} align="center" gap={3} flex="1">
            <Flex
              align="center"
              justify="center"
              w="32px"
              h="32px"
              borderRadius="full"
              bg={isActive ? "blue.500" : isComplete ? "green.500" : "gray.200"}
              color={isActive || isComplete ? "white" : "gray.700"}
              fontSize="sm"
              fontWeight="bold"
            >
              {isComplete ? <CheckCircle2 size={16} /> : s.step}
            </Flex>
            <Box>
              <Text
                fontSize="sm"
                fontWeight={isActive ? "bold" : "medium"}
                color={isActive ? "blue.700" : "gray.700"}
              >
                {s.label}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {s.description}
              </Text>
            </Box>
            {idx < STEPS.length - 1 ? (
              <Box
                flex="1"
                h="1px"
                bg={isComplete ? "green.300" : "gray.200"}
                mx={2}
              />
            ) : null}
          </Flex>
        );
      })}
    </Flex>
  );
}

interface Step1Props {
  warehouseId: string;
  locationNodes: LocationNode[];
  source: SourceSelection | null;
  onChangeSource: (s: SourceSelection | null) => void;
}

function Step1SourceSelect({
  warehouseId,
  locationNodes,
  source,
  onChangeSource,
}: Step1Props): ReactElement {
  const selectedLocation = source?.locationCode ?? null;

  const inventoryQuery = useWarehouseInventory(
    warehouseId,
    selectedLocation ? { locationId: selectedLocation } : undefined,
  );

  const inventoryRows: InventoryRow[] = useMemo(() => {
    if (!selectedLocation) return [];
    return inventoryQuery.data ?? [];
  }, [inventoryQuery.data, selectedLocation]);

  const handlePickLocation = (code: string): void => {
    if (source && source.locationCode === code) return;
    onChangeSource({
      locationCode: code,
      sku: "",
      lotCode: null,
      inventoryRow: undefined as unknown as InventoryRow,
    });
  };

  const handlePickRow = (row: InventoryRow): void => {
    if (!selectedLocation) return;
    onChangeSource({
      locationCode: selectedLocation,
      sku: row.sku,
      lotCode: row.lotCode ?? null,
      inventoryRow: row,
    });
  };

  return (
    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
      <Stack gap={2}>
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          1. 출발 로케이션
        </Text>
        <AdjustmentLocationPicker
          nodes={locationNodes}
          value={selectedLocation}
          onChange={handlePickLocation}
        />
      </Stack>
      <Stack gap={2}>
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          2. SKU / LOT 선택
        </Text>
        {!selectedLocation ? (
          <Box
            p={6}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            bg="gray.50"
            textAlign="center"
          >
            <Text fontSize="sm" color="gray.500">
              먼저 출발 로케이션을 선택해 주세요.
            </Text>
          </Box>
        ) : (
          <AdjustmentSkuLotPicker
            rows={inventoryRows}
            isLoading={inventoryQuery.isLoading}
            selected={
              source && source.sku
                ? { sku: source.sku, lotCode: source.lotCode }
                : null
            }
            onSelect={handlePickRow}
          />
        )}
      </Stack>
    </Grid>
  );
}

interface Step2Props {
  locationNodes: LocationNode[];
  source: SourceSelection | null;
  destination: DestinationInput | null;
  onChangeDestination: (d: DestinationInput | null) => void;
}

function Step2Destination({
  locationNodes,
  source,
  destination,
  onChangeDestination,
}: Step2Props): ReactElement {
  if (!source || !source.sku) {
    return (
      <EmptyState
        title="출발 정보가 필요합니다"
        description="이전 단계에서 출발 로케이션과 SKU/LOT을 선택해 주세요."
      />
    );
  }

  const available =
    source.inventoryRow.quantity - source.inventoryRow.reservedQuantity;

  const handleLocation = (code: string): void => {
    onChangeDestination({
      locationCode: code,
      quantity: destination?.quantity ?? 0,
    });
  };

  const handleQuantity = (v: string): void => {
    const n = Number(v);
    if (Number.isNaN(n)) return;
    onChangeDestination({
      locationCode: destination?.locationCode ?? "",
      quantity: Math.max(0, Math.floor(n)),
    });
  };

  const tooMuch =
    destination !== null && destination.quantity > available;
  const sameLoc =
    destination !== null && destination.locationCode === source.locationCode;

  return (
    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
      <Stack gap={2}>
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          도착 로케이션
        </Text>
        <AdjustmentLocationPicker
          nodes={locationNodes}
          value={destination?.locationCode ?? null}
          onChange={handleLocation}
          excludeCode={source.locationCode}
          excludeReason="출발 로케이션과 동일할 수 없습니다"
        />
      </Stack>
      <Stack gap={3}>
        <Box>
          <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
            이동 수량
          </Text>
          <Input
            type="number"
            size="sm"
            min={1}
            max={available}
            placeholder="이동할 수량을 입력하세요"
            value={destination?.quantity ? String(destination.quantity) : ""}
            onChange={(e) => handleQuantity(e.target.value)}
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            가용 수량 {available.toLocaleString()}
          </Text>
          {tooMuch ? (
            <Flex align="center" gap={1} mt={1} color="red.600">
              <CircleAlert size={12} />
              <Text fontSize="xs">
                가용 수량을 초과합니다.
              </Text>
            </Flex>
          ) : null}
          {sameLoc ? (
            <Flex align="center" gap={1} mt={1} color="red.600">
              <CircleAlert size={12} />
              <Text fontSize="xs">
                도착 로케이션이 출발과 같습니다.
              </Text>
            </Flex>
          ) : null}
        </Box>

        <Box
          p={3}
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          bg="gray.50"
        >
          <Text fontSize="xs" color="gray.500" mb={1}>
            선택 요약
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            {source.locationCode} → {destination?.locationCode ?? "?"}
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            {source.sku}
            {source.lotCode ? ` · LOT ${source.lotCode}` : ""}
          </Text>
        </Box>
      </Stack>
    </Grid>
  );
}

interface Step3Props {
  source: SourceSelection | null;
  destination: DestinationInput | null;
  review: ReviewInput;
  reasonOptions: { value: string; label: string }[];
  locationNodes: LocationNode[];
  onChangeReview: (review: Partial<ReviewInput>) => void;
}

function Step3Review({
  source,
  destination,
  review,
  reasonOptions,
  locationNodes,
  onChangeReview,
}: Step3Props): ReactElement {
  const sourceCode = source?.locationCode ?? "";
  const destCode = destination?.locationCode ?? "";

  const sourcePath = useMemo(
    () => (sourceCode ? findPath(locationNodes, sourceCode) : null),
    [locationNodes, sourceCode],
  );
  const destPath = useMemo(
    () => (destCode ? findPath(locationNodes, destCode) : null),
    [locationNodes, destCode],
  );

  if (!source || !source.sku || !destination) {
    return (
      <EmptyState
        title="검토할 정보가 부족합니다"
        description="이전 단계로 돌아가 주세요."
      />
    );
  }

  const sourceBefore = source.inventoryRow.quantity;
  const sourceAfter = sourceBefore - destination.quantity;

  const destBefore = 0;
  const destAfter = destBefore + destination.quantity;

  return (
    <Stack gap={4}>
      <AdjustmentBeforeAfterPanel
        delta={destination.quantity}
        source={{
          label: "출발 (감소)",
          locationCode: source.locationCode,
          locationPath: sourcePath ?? undefined,
          sku: source.sku,
          lotCode: source.lotCode,
          before: sourceBefore,
          after: sourceAfter,
          tone: "decrease",
        }}
        destination={{
          label: "도착 (증가)",
          locationCode: destination.locationCode,
          locationPath: destPath ?? undefined,
          sku: source.sku,
          lotCode: source.lotCode,
          before: destBefore,
          after: destAfter,
          tone: "increase",
        }}
      />

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
        <Box>
          <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
            사유 코드
          </Text>
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              value={review.reasonCode}
              onChange={(e) => onChangeReview({ reasonCode: e.target.value })}
            >
              <option value="">선택하세요</option>
              {reasonOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
        <Box>
          <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
            메모 (선택)
          </Text>
          <Textarea
            size="sm"
            placeholder="조정 메모를 입력하세요"
            value={review.note}
            onChange={(e) => onChangeReview({ note: e.target.value })}
          />
        </Box>
      </Grid>
    </Stack>
  );
}

function findPath(nodes: LocationNode[], code: string): string | null {
  for (const n of nodes) {
    if (n.code === code) return n.fullPath;
    if (n.children) {
      const found = findPath(n.children, code);
      if (found) return found;
    }
  }
  return null;
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: SourceSelection | null;
  destination: DestinationInput | null;
  review: ReviewInput;
  submitting: boolean;
  onConfirm: () => Promise<void>;
}

function ConfirmDialog({
  open,
  onOpenChange,
  source,
  destination,
  review,
  submitting,
  onConfirm,
}: ConfirmDialogProps): ReactElement | null {
  if (!source || !destination) return null;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(d: { open: boolean }) => onOpenChange(d.open)}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="md" role="alertdialog">
          <Dialog.Header>
            <Dialog.Title>재고 이동 확정</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Stack gap={2}>
              <Text fontSize="sm" color="gray.700">
                아래 내용으로 재고 이동을 확정합니다.
              </Text>
              <Box
                p={3}
                bg="gray.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <Text fontSize="sm" fontFamily="mono">
                  {source.locationCode} → {destination.locationCode}
                </Text>
                <Text fontSize="sm" fontFamily="mono">
                  {source.sku}
                  {source.lotCode ? ` · LOT ${source.lotCode}` : ""}
                </Text>
                <Text fontSize="sm" fontFamily="mono">
                  수량 {destination.quantity.toLocaleString()}
                </Text>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  사유 {review.reasonCode}
                  {review.note ? ` · ${review.note}` : ""}
                </Text>
              </Box>
              <Text fontSize="xs" color="gray.500">
                실행 시 출발 로케이션 -{destination.quantity}, 도착 로케이션 +
                {destination.quantity} 두 번의 조정 요청이 전송됩니다.
              </Text>
            </Stack>
          </Dialog.Body>
          <Dialog.Footer gap={2}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="solid"
              colorPalette="blue"
              size="sm"
              onClick={() => void onConfirm()}
              disabled={submitting}
              loading={submitting}
            >
              확정
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
