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
import { useTranslations } from "next-intl";
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

const STEPS = [
  { step: 1 as const, labelKey: "step1Label", descKey: "step1Description" },
  { step: 2 as const, labelKey: "step2Label", descKey: "step2Description" },
  { step: 3 as const, labelKey: "step3Label", descKey: "step3Description" },
] as const;

export function AdjustmentsPage(): React.JSX.Element {
  const t = useTranslations("pages.adminWarehousesAdjustments");
  const { warehouseId } = useSelectedWarehouseId();

  return (
    <Box p={6}>
      <Flex align="center" justify="space-between" mb={6}>
        <Heading size="lg">{t("title")}</Heading>
        <WarehouseSelector />
      </Flex>

      {warehouseId === null ? (
        <EmptyState
          title={t("selectWarehouseTitle")}
          description={t("selectWarehouseDescription")}
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
  const t = useTranslations("pages.adminWarehousesAdjustments");
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
        title={t("errors.capabilitiesTitle")}
        description={(capabilitiesQuery.error as Error).message}
        onRetry={() => capabilitiesQuery.refetch()}
      />
    );
  }
  if (locationsQuery.isError) {
    return (
      <ErrorState
        title={t("errors.locationsTitle")}
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
        title={t("errors.noCapabilityTitle")}
        description={t("errors.noCapabilityDescription")}
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
          title: t("toast.pendingTitle"),
          description: t("toast.pendingDescription"),
        });
      } else {
        appToaster.create({
          type: "success",
          title: t("toast.successTitle"),
          description: t("toast.successDescription", {
            sku: state.source.sku,
            quantity: state.destination.quantity,
          }),
        });
      }
      setConfirmOpen(false);
      reset();
    } catch (err) {
      appToaster.create({
        type: "error",
        title: t("toast.errorTitle"),
        description: (err as Error).message ?? t("toast.errorFallback"),
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
          <ArrowLeft size={14} /> {t("buttons.prev")}
        </Button>
        <Flex gap={2}>
          <Button variant="ghost" size="sm" onClick={reset}>
            {t("buttons.restart")}
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
              {t("buttons.next")} <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              variant="solid"
              colorPalette="blue"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={!canStep3Confirm || submitting}
            >
              <CheckCircle2 size={14} /> {t("buttons.confirm")}
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
  const t = useTranslations("pages.adminWarehousesAdjustments");
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
                {t(`steps.${s.labelKey}` as "steps.step1Label")}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {t(`steps.${s.descKey}` as "steps.step1Description")}
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
  const t = useTranslations("pages.adminWarehousesAdjustments");
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
          {t("step1.sourceLocationLabel")}
        </Text>
        <AdjustmentLocationPicker
          nodes={locationNodes}
          value={selectedLocation}
          onChange={handlePickLocation}
        />
      </Stack>
      <Stack gap={2}>
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          {t("step1.skuLotLabel")}
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
              {t("step1.pickLocationFirst")}
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
  const t = useTranslations("pages.adminWarehousesAdjustments");
  if (!source || !source.sku) {
    return (
      <EmptyState
        title={t("step2.sourceRequiredTitle")}
        description={t("step2.sourceRequiredDescription")}
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
          {t("step2.destLocationLabel")}
        </Text>
        <AdjustmentLocationPicker
          nodes={locationNodes}
          value={destination?.locationCode ?? null}
          onChange={handleLocation}
          excludeCode={source.locationCode}
          excludeReason={t("step2.excludeReason")}
        />
      </Stack>
      <Stack gap={3}>
        <Box>
          <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
            {t("step2.quantityLabel")}
          </Text>
          <Input
            type="number"
            size="sm"
            min={1}
            max={available}
            placeholder={t("step2.quantityPlaceholder")}
            value={destination?.quantity ? String(destination.quantity) : ""}
            onChange={(e) => handleQuantity(e.target.value)}
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            {t("step2.availableQty", { qty: available.toLocaleString() })}
          </Text>
          {tooMuch ? (
            <Flex align="center" gap={1} mt={1} color="red.600">
              <CircleAlert size={12} />
              <Text fontSize="xs">
                {t("step2.tooMuch")}
              </Text>
            </Flex>
          ) : null}
          {sameLoc ? (
            <Flex align="center" gap={1} mt={1} color="red.600">
              <CircleAlert size={12} />
              <Text fontSize="xs">
                {t("step2.sameLocation")}
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
            {t("step2.summaryLabel")}
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
  const t = useTranslations("pages.adminWarehousesAdjustments");
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
        title={t("step3.insufficientTitle")}
        description={t("step3.insufficientDescription")}
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
          label: t("step3.sourceLabel"),
          locationCode: source.locationCode,
          locationPath: sourcePath ?? undefined,
          sku: source.sku,
          lotCode: source.lotCode,
          before: sourceBefore,
          after: sourceAfter,
          tone: "decrease",
        }}
        destination={{
          label: t("step3.destLabel"),
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
            {t("step3.reasonCodeLabel")}
          </Text>
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              value={review.reasonCode}
              onChange={(e) => onChangeReview({ reasonCode: e.target.value })}
            >
              <option value="">{t("step3.selectPlaceholder")}</option>
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
            {t("step3.noteLabel")}
          </Text>
          <Textarea
            size="sm"
            placeholder={t("step3.notePlaceholder")}
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
  const t = useTranslations("pages.adminWarehousesAdjustments");
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
            <Dialog.Title>{t("confirmDialog.title")}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Stack gap={2}>
              <Text fontSize="sm" color="gray.700">
                {t("confirmDialog.description")}
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
                  {t("confirmDialog.quantityLine", {
                    qty: destination.quantity.toLocaleString(),
                  })}
                </Text>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {t("confirmDialog.reasonLine", { code: review.reasonCode })}
                  {review.note ? ` · ${review.note}` : ""}
                </Text>
              </Box>
              <Text fontSize="xs" color="gray.500">
                {t("confirmDialog.warning", { qty: destination.quantity })}
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
              {t("buttons.cancel")}
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
              {t("buttons.confirm")}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
