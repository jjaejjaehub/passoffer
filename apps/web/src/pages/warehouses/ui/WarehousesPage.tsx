"use client";

import {
  Box,
  Button,
  Flex,
  Input,
  Select,
  Spinner,
  Text,
  createListCollection,
} from "@chakra-ui/react";
import { Building2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  useWarehouses,
  useCreateWarehouse,
  useDeleteWarehouse,
  type CreateWarehouseInput,
} from "@/entities/warehouse";
import { ROUTES } from "@/shared/config";
import { appToaster } from "@/shared/ui/app-toaster";
import type { WMSVendor } from "@oms/types";

const VENDOR_OPTIONS: { label: string; value: WMSVendor }[] = [
  { label: "자체 운영", value: "self" },
  { label: "CJ 대한통운", value: "cj_logistics" },
  { label: "한진", value: "hanjin" },
  { label: "SFTP 배치", value: "sftp_batch" },
  { label: "커스텀", value: "custom" },
];

const VENDOR_LABEL: Record<WMSVendor, string> = {
  self: "자체 운영",
  cj_logistics: "CJ 대한통운",
  hanjin: "한진",
  sftp_batch: "SFTP 배치",
  custom: "커스텀",
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "운영중", color: "green.600" },
  INACTIVE: { label: "비활성", color: "gray.500" },
  PENDING: { label: "대기", color: "orange.500" },
};

const vendorCollection = createListCollection({ items: VENDOR_OPTIONS });

export function WarehousesPage(): React.JSX.Element {
  const { data: warehouses, isLoading, error } = useWarehouses();
  const createWarehouse = useCreateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateWarehouseInput>({
    code: "",
    name: "",
    vendor: "self",
  });

  const handleCreate = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      appToaster.create({ title: "코드와 이름을 입력하세요.", type: "error" });
      return;
    }
    try {
      await createWarehouse.mutateAsync(form);
      appToaster.create({ title: "창고가 생성되었습니다.", type: "success" });
      setShowForm(false);
      setForm({ code: "", name: "", vendor: "self" });
    } catch {
      appToaster.create({ title: "창고 생성에 실패했습니다.", type: "error" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`'${name}' 창고를 삭제하시겠습니까?`)) return;
    try {
      await deleteWarehouse.mutateAsync(id);
      appToaster.create({ title: "창고가 삭제되었습니다.", type: "success" });
    } catch {
      appToaster.create({ title: "창고 삭제에 실패했습니다.", type: "error" });
    }
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      {/* 헤더 */}
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text fontSize="xl" fontWeight="bold" color="gray.900">
            창고 관리
          </Text>
          <Text fontSize="sm" color="gray.500" mt={0.5}>
            WMS 연동 창고를 등록하고 재고·입고·이력을 관리합니다.
          </Text>
        </Box>
        <Button
          size="sm"
          colorScheme="blue"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus size={14} style={{ marginRight: 4 }} />
          창고 추가
        </Button>
      </Flex>

      {/* 창고 추가 폼 */}
      {showForm && (
        <Box
          mb={6}
          p={4}
          borderWidth="1px"
          borderColor="blue.200"
          borderRadius="md"
          bg="blue.50"
        >
          <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={3}>
            새 창고 등록
          </Text>
          <Flex gap={3} flexWrap="wrap">
            <Input
              size="sm"
              placeholder="창고 코드 (예: WH-SEOUL)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              w="180px"
              bg="white"
            />
            <Input
              size="sm"
              placeholder="창고 이름"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              w="220px"
              bg="white"
            />
            <Select.Root
              collection={vendorCollection}
              size="sm"
              value={[form.vendor]}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, vendor: v.value[0] as WMSVendor }))
              }
              w="160px"
            >
              <Select.Control bg="white" borderRadius="md">
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {vendorCollection.items.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
            <Button
              size="sm"
              colorScheme="blue"
              loading={createWarehouse.isPending}
              onClick={handleCreate}
            >
              등록
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              취소
            </Button>
          </Flex>
        </Box>
      )}

      {/* 로딩 */}
      {isLoading && (
        <Flex justify="center" py={12}>
          <Spinner size="md" color="blue.500" />
        </Flex>
      )}

      {/* 에러 */}
      {error && (
        <Flex justify="center" py={12}>
          <Text color="red.500" fontSize="sm">
            창고 목록을 불러오지 못했습니다.
          </Text>
        </Flex>
      )}

      {/* 빈 상태 */}
      {!isLoading && !error && warehouses?.length === 0 && (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={16}
          gap={3}
        >
          <Building2 size={40} color="var(--chakra-colors-gray-300)" />
          <Text color="gray.500" fontSize="sm">
            등록된 창고가 없습니다.
          </Text>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            첫 창고 추가하기
          </Button>
        </Flex>
      )}

      {/* 창고 목록 테이블 */}
      {!isLoading && !error && (warehouses?.length ?? 0) > 0 && (
        <Box
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          overflow="hidden"
        >
          <Box as="table" w="100%" style={{ borderCollapse: "collapse" }}>
            <Box as="thead" bg="gray.50">
              <Box as="tr">
                {["코드", "이름", "벤더", "동기화 모드", "상태", "마지막 동기화", ""].map(
                  (col) => (
                    <Box
                      key={col}
                      as="th"
                      px={4}
                      py={3}
                      textAlign="left"
                      fontSize="xs"
                      fontWeight="medium"
                      color="gray.500"
                      borderBottomWidth="1px"
                      borderColor="gray.200"
                    >
                      {col}
                    </Box>
                  ),
                )}
              </Box>
            </Box>
            <Box as="tbody">
              {warehouses?.map((wh) => {
                const badge = STATUS_BADGE[wh.status] ?? { label: wh.status, color: "gray.500" };
                return (
                  <Box
                    key={wh.id}
                    as="tr"
                    _hover={{ bg: "gray.50" }}
                    borderBottomWidth="1px"
                    borderColor="gray.100"
                  >
                    <Box as="td" px={4} py={3} fontSize="sm" fontWeight="medium" color="gray.700">
                      {wh.code}
                    </Box>
                    <Box as="td" px={4} py={3} fontSize="sm" color="gray.900">
                      <Link
                        href={ROUTES.warehouseDetail(wh.id)}
                        style={{ color: "var(--chakra-colors-blue-600)", textDecoration: "none" }}
                      >
                        {wh.name}
                      </Link>
                    </Box>
                    <Box as="td" px={4} py={3} fontSize="sm" color="gray.600">
                      {VENDOR_LABEL[wh.vendor] ?? wh.vendor}
                    </Box>
                    <Box as="td" px={4} py={3} fontSize="sm" color="gray.500">
                      {wh.syncMode}
                    </Box>
                    <Box as="td" px={4} py={3}>
                      <Text
                        as="span"
                        fontSize="xs"
                        fontWeight="medium"
                        color={badge.color}
                        px={2}
                        py={0.5}
                        borderRadius="full"
                        bg={badge.color.replace("600", "50").replace("500", "50")}
                      >
                        {badge.label}
                      </Text>
                    </Box>
                    <Box as="td" px={4} py={3} fontSize="xs" color="gray.400">
                      {wh.lastSyncAt
                        ? new Date(wh.lastSyncAt).toLocaleString("ko-KR")
                        : "—"}
                    </Box>
                    <Box as="td" px={4} py={3}>
                      <Flex gap={2} justify="flex-end">
                        <Link href={ROUTES.warehouseDetail(wh.id)}>
                          <Button size="xs" variant="outline" colorScheme="blue">
                            상세
                          </Button>
                        </Link>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          loading={deleteWarehouse.isPending}
                          onClick={() => handleDelete(wh.id, wh.name)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </Flex>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
