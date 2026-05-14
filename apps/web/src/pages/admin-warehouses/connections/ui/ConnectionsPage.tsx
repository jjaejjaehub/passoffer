"use client";

import {
  Box,
  Button,
  Dialog,
  Drawer,
  Flex,
  HStack,
  Input,
  Separator,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { WMSCapabilities, WMSVendor } from "@oms/types";
import { CheckCircle, Plus, Trash2, Wifi, XCircle } from "lucide-react";
import { useState } from "react";
import {
  type CreateWarehouseInput,
  useCreateWarehouse,
  useDeleteWarehouse,
} from "@/entities/warehouse/api/warehouseMutations";
import {
  useWarehouseHealth,
  useWarehouses,
  type WarehouseRecord,
} from "@/entities/warehouse/api/warehouseQueries";
import { appToaster } from "@/shared/ui/app-toaster";
import { ConnectionStatusDot } from "@/shared/ui/ConnectionStatusDot";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingState } from "@/shared/ui/LoadingState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { VendorBadge } from "@/shared/ui/VendorBadge";

const STATUS_TONE = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  PENDING: "warning",
} as const;

const STATUS_LABEL = {
  ACTIVE: "운영중",
  INACTIVE: "비활성",
  PENDING: "대기",
} as const;

const VENDOR_OPTIONS: { label: string; value: WMSVendor; desc: string }[] = [
  { label: "자체 운영", value: "self", desc: "직접 운영하는 자체 창고" },
  { label: "CJ 대한통운", value: "cj_logistics", desc: "CJ 대한통운 WMS 연동" },
  { label: "한진", value: "hanjin", desc: "한진 물류 WMS 연동" },
  { label: "SFTP 배치", value: "sftp_batch", desc: "SFTP 파일 기반 배치 연동" },
  { label: "커스텀", value: "custom", desc: "직접 구현 어댑터 사용" },
];

const CAPABILITY_LABELS: { key: keyof WMSCapabilities; label: string }[] = [
  { key: "supportsRealtimeStock", label: "실시간 재고 조회" },
  { key: "supportsLotTracking", label: "로트 추적" },
  { key: "supportsLocationTree", label: "로케이션 트리" },
  { key: "supportsBatchInbound", label: "배치 입고" },
  { key: "supportsRowLevelAdjustment", label: "행 단위 재고 조정" },
  { key: "supportsCrossWarehouseTransfer", label: "창고 간 이전" },
];

function CapabilityRow({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <HStack gap={2}>
      {enabled ? (
        <CheckCircle size={14} color="var(--chakra-colors-green-500)" />
      ) : (
        <XCircle size={14} color="var(--chakra-colors-gray-300)" />
      )}
      <Text fontSize="sm" color={enabled ? "gray.700" : "gray.400"}>
        {label}
      </Text>
    </HStack>
  );
}

function WarehouseDrawer({
  warehouse,
  onClose,
  onDeleted,
}: {
  warehouse: WarehouseRecord;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const deleteWarehouse = useDeleteWarehouse();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testingHealth, setTestingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    status: string;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  const health = useWarehouseHealth(testingHealth ? warehouse.id : undefined);

  const handleTestConnection = () => {
    setTestingHealth(true);
    setHealthResult(null);
  };

  if (testingHealth && !health.isLoading && health.data && !healthResult) {
    setHealthResult(health.data);
    setTestingHealth(false);
  }

  const handleDelete = async () => {
    try {
      await deleteWarehouse.mutateAsync(warehouse.id);
      appToaster.create({ title: "창고가 삭제되었습니다.", type: "success" });
      setConfirmOpen(false);
      onDeleted();
    } catch {
      appToaster.create({ title: "창고 삭제에 실패했습니다.", type: "error" });
    }
  };

  const caps = warehouse.capabilitiesJson;

  return (
    <>
      <Drawer.Root
        open
        placement="end"
        size="md"
        onOpenChange={(e) => {
          if (!e.open) onClose();
        }}
      >
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>{warehouse.name}</Drawer.Title>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            <Drawer.Body>
              <VStack align="stretch" gap={4}>
                <HStack gap={2}>
                  <VendorBadge vendor={warehouse.vendor} />
                  <Text fontSize="sm" color="gray.500">
                    {warehouse.code}
                  </Text>
                </HStack>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    동기화 모드
                  </Text>
                  <Text fontSize="sm">{warehouse.syncMode}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    상태
                  </Text>
                  <StatusBadge
                    tone={STATUS_TONE[warehouse.status]}
                    label={STATUS_LABEL[warehouse.status]}
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    마지막 동기화
                  </Text>
                  <Text fontSize="sm">
                    {warehouse.lastSyncAt
                      ? new Date(warehouse.lastSyncAt).toLocaleString("ko-KR")
                      : "—"}
                  </Text>
                </Box>

                <Separator />

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={3}>
                    지원 기능
                  </Text>
                  <VStack align="stretch" gap={2}>
                    {CAPABILITY_LABELS.map(({ key, label }) => {
                      const val = caps?.[key];
                      return (
                        <CapabilityRow
                          key={key}
                          label={label}
                          enabled={typeof val === "boolean" ? val : false}
                        />
                      );
                    })}
                    {caps?.locationDepth != null && (
                      <Text fontSize="sm" color="gray.500">
                        로케이션 깊이: {caps.locationDepth}단계
                      </Text>
                    )}
                  </VStack>
                </Box>

                <Separator />

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    연결 테스트
                  </Text>
                  <HStack gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTestConnection}
                      loading={health.isLoading && testingHealth}
                    >
                      <Wifi size={14} />
                      연결 테스트
                    </Button>
                    {healthResult && (
                      <ConnectionStatusDot
                        status={
                          healthResult.status as import("@oms/types").ConnectionStatus
                        }
                        showLabel
                      />
                    )}
                  </HStack>
                  {healthResult?.latencyMs != null && (
                    <Text fontSize="xs" color="gray.400" mt={1}>
                      응답 시간: {healthResult.latencyMs}ms
                    </Text>
                  )}
                  {healthResult?.message && (
                    <Text fontSize="xs" color="red.500" mt={1}>
                      {healthResult.message}
                    </Text>
                  )}
                </Box>
              </VStack>
            </Drawer.Body>
            <Drawer.Footer>
              <Button
                size="sm"
                colorPalette="red"
                variant="outline"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 size={14} />
                삭제
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>

      <Dialog.Root
        open={confirmOpen}
        onOpenChange={(e) => setConfirmOpen(e.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>창고 삭제</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                <Text as="span" fontWeight="semibold">
                  {warehouse.name}
                </Text>{" "}
                창고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOpen(false)}
              >
                취소
              </Button>
              <Button
                colorPalette="red"
                size="sm"
                loading={deleteWarehouse.isPending}
                onClick={handleDelete}
              >
                삭제
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
}

function AddWarehouseWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [selectedVendor, setSelectedVendor] = useState<WMSVendor>("self");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const createWarehouse = useCreateWarehouse();

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) {
      appToaster.create({ title: "코드와 이름을 입력하세요.", type: "error" });
      return;
    }
    try {
      await createWarehouse.mutateAsync({
        code,
        name,
        vendor: selectedVendor,
      } satisfies CreateWarehouseInput);
      appToaster.create({ title: "창고가 등록되었습니다.", type: "success" });
      onClose();
    } catch {
      appToaster.create({ title: "창고 등록에 실패했습니다.", type: "error" });
    }
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>새 창고 추가</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            {step === 0 && (
              <VStack align="stretch" gap={2}>
                <Text fontSize="sm" color="gray.600" mb={1}>
                  벤더를 선택하세요
                </Text>
                {VENDOR_OPTIONS.map((opt) => (
                  <Box
                    key={opt.value}
                    borderWidth="1px"
                    borderRadius="md"
                    p={3}
                    cursor="pointer"
                    borderColor={
                      selectedVendor === opt.value ? "blue.400" : "gray.200"
                    }
                    bg={selectedVendor === opt.value ? "blue.50" : "white"}
                    onClick={() => setSelectedVendor(opt.value)}
                  >
                    <HStack justify="space-between">
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">
                          {opt.label}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {opt.desc}
                        </Text>
                      </Box>
                      <VendorBadge vendor={opt.value} />
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}

            {step === 1 && (
              <VStack align="stretch" gap={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    창고 코드
                  </Text>
                  <Input
                    size="sm"
                    placeholder="예: WH-SEOUL-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    창고 이름
                  </Text>
                  <Input
                    size="sm"
                    placeholder="예: 서울 본창고"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Box>
              </VStack>
            )}

            {step === 2 && (
              <VStack align="stretch" gap={3}>
                <Text fontSize="sm" color="gray.600">
                  아래 정보로 창고를 등록합니다.
                </Text>
                <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                  <VStack align="stretch" gap={2}>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.500">
                        벤더
                      </Text>
                      <VendorBadge vendor={selectedVendor} />
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.500">
                        코드
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {code}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.500">
                        이름
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {name}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <HStack justify="space-between" w="full">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (step === 0) onClose();
                  else setStep((s) => s - 1);
                }}
              >
                {step === 0 ? "취소" : "이전"}
              </Button>
              <HStack gap={2}>
                <Text fontSize="xs" color="gray.400">
                  {step + 1} / 3
                </Text>
                {step < 2 ? (
                  <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                    다음
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    loading={createWarehouse.isPending}
                    onClick={handleSubmit}
                  >
                    등록
                  </Button>
                )}
              </HStack>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

export function ConnectionsPage(): React.JSX.Element {
  const { data: warehouses, isLoading, error, refetch } = useWarehouses();
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseRecord | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <PageHeader
        title="창고 연결 관리"
        actions={
          <Button
            size="sm"
            colorPalette="blue"
            onClick={() => setWizardOpen(true)}
          >
            <Plus size={14} />새 창고 추가
          </Button>
        }
      />

      {isLoading && <LoadingState rows={5} />}

      {!isLoading && error && (
        <ErrorState
          title="창고 목록을 불러오지 못했습니다."
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !error && warehouses?.length === 0 && (
        <EmptyState
          title="등록된 창고가 없습니다."
          description="새 창고를 추가하여 WMS 연결을 시작하세요."
          action={{
            label: "+ 새 창고 추가",
            onClick: () => setWizardOpen(true),
          }}
        />
      )}

      {!isLoading && !error && (warehouses?.length ?? 0) > 0 && (
        <Table.Root variant="outline" size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>창고코드</Table.ColumnHeader>
              <Table.ColumnHeader>이름</Table.ColumnHeader>
              <Table.ColumnHeader>벤더</Table.ColumnHeader>
              <Table.ColumnHeader>동기화</Table.ColumnHeader>
              <Table.ColumnHeader>상태</Table.ColumnHeader>
              <Table.ColumnHeader>마지막 동기화</Table.ColumnHeader>
              <Table.ColumnHeader>기능</Table.ColumnHeader>
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {warehouses?.map((wh) => {
              const caps = wh.capabilitiesJson;
              const enabledCount = caps
                ? CAPABILITY_LABELS.filter(({ key }) => caps[key] === true)
                    .length
                : 0;
              return (
                <Table.Row
                  key={wh.id}
                  cursor="pointer"
                  _hover={{ bg: "gray.50" }}
                  onClick={() => setSelectedWarehouse(wh)}
                >
                  <Table.Cell fontWeight="medium" color="gray.700">
                    {wh.code}
                  </Table.Cell>
                  <Table.Cell>{wh.name}</Table.Cell>
                  <Table.Cell>
                    <VendorBadge vendor={wh.vendor} />
                  </Table.Cell>
                  <Table.Cell color="gray.500" fontSize="xs">
                    {wh.syncMode}
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge
                      tone={STATUS_TONE[wh.status]}
                      label={STATUS_LABEL[wh.status]}
                    />
                  </Table.Cell>
                  <Table.Cell fontSize="xs" color="gray.400">
                    {wh.lastSyncAt
                      ? new Date(wh.lastSyncAt).toLocaleString("ko-KR")
                      : "—"}
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="xs" color="gray.500">
                      {enabledCount}/{CAPABILITY_LABELS.length}개
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWarehouse(wh);
                      }}
                    >
                      상세
                    </Button>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}

      {selectedWarehouse && (
        <WarehouseDrawer
          warehouse={selectedWarehouse}
          onClose={() => setSelectedWarehouse(null)}
          onDeleted={() => setSelectedWarehouse(null)}
        />
      )}

      {wizardOpen && (
        <AddWarehouseWizard onClose={() => setWizardOpen(false)} />
      )}
    </Box>
  );
}
