"use client";

import {
  Box,
  Button,
  Flex,
  Input,
  Select,
  Spinner,
  Text,
  Textarea,
  createListCollection,
} from "@chakra-ui/react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  useWarehouse,
  useWarehouseHealth,
  useWarehouseInventory,
  useWarehouseLocations,
  useInboundOrders,
  useWarehouseHistory,
  useCreateInboundOrder,
  useRequestAdjustment,
} from "@/entities/warehouse";
import { ROUTES } from "@/shared/config";
import { appToaster } from "@/shared/ui/app-toaster";
import type { LocationNode } from "@oms/types";

type Tab = "inventory" | "locations" | "inbound" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "inventory", label: "재고" },
  { id: "locations", label: "로케이션" },
  { id: "inbound", label: "입고" },
  { id: "history", label: "이력" },
];

const INBOUND_STATUS_LABEL: Record<string, string> = {
  pending_dispatch: "발송 대기",
  instructed: "지시 완료",
  received: "입고 완료",
  canceled: "취소",
};

const REASON_OPTIONS = [
  { label: "재고 조정", value: "stock_adjustment" },
  { label: "손상 처리", value: "damage" },
  { label: "분실 처리", value: "loss" },
  { label: "반품 입고", value: "return_inbound" },
  { label: "기타", value: "other" },
];

const reasonCollection = createListCollection({ items: REASON_OPTIONS });

function LocationTree({ nodes, depth = 0 }: { nodes: LocationNode[]; depth?: number }): React.JSX.Element {
  return (
    <>
      {nodes.map((node) => (
        <Box key={node.code}>
          <Flex
            align="center"
            gap={1}
            px={3}
            py={1.5}
            pl={3 + depth * 4}
            _hover={{ bg: "gray.50" }}
            borderBottomWidth="1px"
            borderColor="gray.100"
          >
            <Text fontSize="xs" color="gray.400" w="20px">
              {"└".repeat(depth > 0 ? 1 : 0)}
            </Text>
            <Text fontSize="sm" fontWeight={depth === 0 ? "medium" : "normal"} color="gray.700">
              {node.name}
            </Text>
            <Text fontSize="xs" color="gray.400" ml={2}>
              ({node.code})
            </Text>
            <Text fontSize="xs" color="gray.300" ml="auto">
              {node.fullPath}
            </Text>
          </Flex>
          {node.children && node.children.length > 0 && (
            <LocationTree nodes={node.children} depth={depth + 1} />
          )}
        </Box>
      ))}
    </>
  );
}

interface Props {
  id: string;
}

export function WarehouseDetailPage({ id }: Props): React.JSX.Element {
  const [tab, setTab] = useState<Tab>("inventory");

  const { data: warehouse, isLoading: whLoading } = useWarehouse(id);
  const { data: health } = useWarehouseHealth(id);

  // 재고 탭
  const { data: inventory, isLoading: invLoading } = useWarehouseInventory(id, undefined);

  // 로케이션 탭
  const { data: locations, isLoading: locLoading } = useWarehouseLocations(id);

  // 입고 탭
  const { data: inboundOrders, isLoading: inbLoading } = useInboundOrders(id);
  const createInbound = useCreateInboundOrder(id);
  const [inboundForm, setInboundForm] = useState({
    expectedAt: "",
    sku: "",
    quantity: "",
    note: "",
  });

  // 이력 탭
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [histRange, setHistRange] = useState({ startDate: monthAgo, endDate: today });
  const { data: history, isLoading: histLoading } = useWarehouseHistory(id, histRange);

  // 재고 조정
  const requestAdj = useRequestAdjustment(id);
  const [adjForm, setAdjForm] = useState({
    sku: "",
    delta: "",
    reasonCode: "stock_adjustment",
    note: "",
  });
  const [showAdjForm, setShowAdjForm] = useState(false);

  const handleCreateInbound = async () => {
    if (!inboundForm.expectedAt || !inboundForm.sku || !inboundForm.quantity) {
      appToaster.create({ title: "예정일, SKU, 수량을 입력하세요.", type: "error" });
      return;
    }
    try {
      await createInbound.mutateAsync({
        expectedAt: inboundForm.expectedAt,
        items: [{ sku: inboundForm.sku, quantity: Number(inboundForm.quantity) }],
        note: inboundForm.note || undefined,
      });
      appToaster.create({ title: "입고 지시가 등록되었습니다.", type: "success" });
      setInboundForm({ expectedAt: "", sku: "", quantity: "", note: "" });
    } catch {
      appToaster.create({ title: "입고 지시 등록에 실패했습니다.", type: "error" });
    }
  };

  const handleAdjust = async () => {
    if (!adjForm.sku || !adjForm.delta) {
      appToaster.create({ title: "SKU와 조정량을 입력하세요.", type: "error" });
      return;
    }
    try {
      await requestAdj.mutateAsync({
        sku: adjForm.sku,
        delta: Number(adjForm.delta),
        reasonCode: adjForm.reasonCode,
        note: adjForm.note || undefined,
      });
      appToaster.create({ title: "재고 조정이 요청되었습니다.", type: "success" });
      setAdjForm({ sku: "", delta: "", reasonCode: "stock_adjustment", note: "" });
      setShowAdjForm(false);
    } catch {
      appToaster.create({ title: "재고 조정에 실패했습니다.", type: "error" });
    }
  };

  if (whLoading) {
    return (
      <Flex justify="center" align="center" h="50vh">
        <Spinner size="md" color="blue.500" />
      </Flex>
    );
  }

  if (!warehouse) {
    return (
      <Flex justify="center" align="center" h="50vh" direction="column" gap={3}>
        <Text color="gray.500">창고를 찾을 수 없습니다.</Text>
        <Link href={ROUTES.warehouses}>
          <Button size="sm" variant="outline">목록으로</Button>
        </Link>
      </Flex>
    );
  }

  const healthColor =
    health?.status === "connected"
      ? "green.500"
      : health?.status === "degraded"
        ? "orange.500"
        : "red.400";

  return (
    <Box p={6} maxW="1200px" mx="auto">
      {/* 뒤로가기 + 헤더 */}
      <Flex align="center" gap={3} mb={2}>
        <Link href={ROUTES.warehouses} style={{ textDecoration: "none" }}>
          <Button size="xs" variant="ghost" color="gray.500">
            <ArrowLeft size={14} />
          </Button>
        </Link>
        <Text fontSize="xl" fontWeight="bold" color="gray.900">
          {warehouse.name}
        </Text>
        <Text fontSize="sm" color="gray.400">
          {warehouse.code}
        </Text>
      </Flex>

      {/* 창고 메타 */}
      <Flex gap={6} mb={6} flexWrap="wrap">
        <Box>
          <Text fontSize="xs" color="gray.400" mb={0.5}>벤더</Text>
          <Text fontSize="sm" color="gray.700">{warehouse.vendor}</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.400" mb={0.5}>동기화 모드</Text>
          <Text fontSize="sm" color="gray.700">{warehouse.syncMode}</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.400" mb={0.5}>상태</Text>
          <Text fontSize="sm" color="gray.700">{warehouse.status}</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.400" mb={0.5}>연결 상태</Text>
          <Flex align="center" gap={1.5}>
            <Box w={2} h={2} borderRadius="full" bg={healthColor} />
            <Text fontSize="sm" color="gray.700">
              {health?.status ?? "확인 중..."}
            </Text>
            {health?.latencyMs !== undefined && (
              <Text fontSize="xs" color="gray.400">
                ({health.latencyMs}ms)
              </Text>
            )}
          </Flex>
        </Box>
        {warehouse.lastSyncAt && (
          <Box>
            <Text fontSize="xs" color="gray.400" mb={0.5}>마지막 동기화</Text>
            <Text fontSize="sm" color="gray.700">
              {new Date(warehouse.lastSyncAt).toLocaleString("ko-KR")}
            </Text>
          </Box>
        )}
      </Flex>

      {/* 탭 */}
      <Flex gap={1} mb={4} borderBottomWidth="1px" borderColor="gray.200">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant="ghost"
            onClick={() => setTab(t.id)}
            color={tab === t.id ? "blue.600" : "gray.500"}
            fontWeight={tab === t.id ? "medium" : "normal"}
            borderRadius="none"
            pb={2}
            boxShadow={tab === t.id ? "0 2px 0 var(--chakra-colors-blue-500)" : "none"}
          >
            {t.label}
          </Button>
        ))}
      </Flex>

      {/* ── 재고 탭 ── */}
      {tab === "inventory" && (
        <Box>
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              SKU별 재고 현황
            </Text>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setShowAdjForm((v) => !v)}
            >
              재고 조정
            </Button>
          </Flex>

          {showAdjForm && (
            <Box mb={4} p={4} borderWidth="1px" borderColor="orange.200" borderRadius="md" bg="orange.50">
              <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={3}>재고 조정</Text>
              <Flex gap={3} flexWrap="wrap">
                <Input
                  size="sm" placeholder="SKU" value={adjForm.sku} w="180px" bg="white"
                  onChange={(e) => setAdjForm((f) => ({ ...f, sku: e.target.value }))}
                />
                <Input
                  size="sm" placeholder="조정량 (음수: 감소)" value={adjForm.delta} w="160px" bg="white"
                  type="number"
                  onChange={(e) => setAdjForm((f) => ({ ...f, delta: e.target.value }))}
                />
                <Select.Root
                  collection={reasonCollection} size="sm" value={[adjForm.reasonCode]}
                  onValueChange={(v) => setAdjForm((f) => ({ ...f, reasonCode: v.value[0] }))}
                  w="160px"
                >
                  <Select.Control bg="white" borderRadius="md">
                    <Select.Trigger><Select.ValueText /></Select.Trigger>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {reasonCollection.items.map((item) => (
                        <Select.Item key={item.value} item={item}>{item.label}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
                <Input
                  size="sm" placeholder="메모 (선택)" value={adjForm.note} w="200px" bg="white"
                  onChange={(e) => setAdjForm((f) => ({ ...f, note: e.target.value }))}
                />
                <Button size="sm" colorScheme="orange" loading={requestAdj.isPending} onClick={handleAdjust}>
                  적용
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAdjForm(false)}>취소</Button>
              </Flex>
            </Box>
          )}

          {invLoading ? (
            <Flex justify="center" py={8}><Spinner size="sm" /></Flex>
          ) : !inventory?.length ? (
            <Flex justify="center" py={8}>
              <Text fontSize="sm" color="gray.400">재고 데이터가 없습니다.</Text>
            </Flex>
          ) : (
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
              <Box as="table" w="100%" style={{ borderCollapse: "collapse" }}>
                <Box as="thead" bg="gray.50">
                  <Box as="tr">
                    {["SKU", "로케이션", "LOT", "수량", "예약 수량", "신선도", "동기화"].map((h) => (
                      <Box key={h} as="th" px={3} py={2.5} textAlign="left" fontSize="xs" fontWeight="medium" color="gray.500" borderBottomWidth="1px" borderColor="gray.200">
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box as="tbody">
                  {inventory.map((row, i) => (
                    <Box key={`${row.sku}-${i}`} as="tr" _hover={{ bg: "gray.50" }} borderBottomWidth="1px" borderColor="gray.100">
                      <Box as="td" px={3} py={2.5} fontSize="sm" fontWeight="medium" color="gray.700">{row.sku}</Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color="gray.600">{row.locationCode ?? "—"}</Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color="gray.500">{row.lotCode ?? "—"}</Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color="gray.900" fontWeight="medium">{row.quantity.toLocaleString()}</Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color="gray.500">{row.reservedQuantity.toLocaleString()}</Box>
                      <Box as="td" px={3} py={2.5} fontSize="xs" color={row.freshness === "fresh" ? "green.500" : row.freshness === "stale" ? "orange.500" : "gray.400"}>
                        {row.freshness}
                      </Box>
                      <Box as="td" px={3} py={2.5} fontSize="xs" color="gray.400">
                        {new Date(row.fetchedAt).toLocaleString("ko-KR")}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* ── 로케이션 탭 ── */}
      {tab === "locations" && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={3}>
            창고 로케이션 구조
          </Text>
          {locLoading ? (
            <Flex justify="center" py={8}><Spinner size="sm" /></Flex>
          ) : !locations?.length ? (
            <Flex justify="center" py={8}>
              <Text fontSize="sm" color="gray.400">로케이션 데이터가 없습니다.</Text>
            </Flex>
          ) : (
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
              <LocationTree nodes={locations} />
            </Box>
          )}
        </Box>
      )}

      {/* ── 입고 탭 ── */}
      {tab === "inbound" && (
        <Box>
          <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={3}>입고 지시 등록</Text>
          <Box mb={5} p={4} borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50">
            <Flex gap={3} flexWrap="wrap">
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>예정일</Text>
                <Input
                  type="date" size="sm" value={inboundForm.expectedAt} w="160px" bg="white"
                  onChange={(e) => setInboundForm((f) => ({ ...f, expectedAt: e.target.value }))}
                />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>SKU</Text>
                <Input
                  size="sm" placeholder="SKU" value={inboundForm.sku} w="180px" bg="white"
                  onChange={(e) => setInboundForm((f) => ({ ...f, sku: e.target.value }))}
                />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>수량</Text>
                <Input
                  type="number" size="sm" placeholder="수량" value={inboundForm.quantity} w="100px" bg="white"
                  onChange={(e) => setInboundForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>메모</Text>
                <Input
                  size="sm" placeholder="메모 (선택)" value={inboundForm.note} w="200px" bg="white"
                  onChange={(e) => setInboundForm((f) => ({ ...f, note: e.target.value }))}
                />
              </Box>
              <Flex align="flex-end">
                <Button size="sm" colorScheme="blue" loading={createInbound.isPending} onClick={handleCreateInbound}>
                  입고 지시
                </Button>
              </Flex>
            </Flex>
          </Box>

          {inbLoading ? (
            <Flex justify="center" py={8}><Spinner size="sm" /></Flex>
          ) : !inboundOrders?.length ? (
            <Flex justify="center" py={8}>
              <Text fontSize="sm" color="gray.400">입고 지시 내역이 없습니다.</Text>
            </Flex>
          ) : (
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
              <Box as="table" w="100%" style={{ borderCollapse: "collapse" }}>
                <Box as="thead" bg="gray.50">
                  <Box as="tr">
                    {["ID", "상태", "예정일", "벤더 참조", "생성일"].map((h) => (
                      <Box key={h} as="th" px={3} py={2.5} textAlign="left" fontSize="xs" fontWeight="medium" color="gray.500" borderBottomWidth="1px" borderColor="gray.200">
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box as="tbody">
                  {inboundOrders.map((order) => (
                    <Box key={order.id} as="tr" _hover={{ bg: "gray.50" }} borderBottomWidth="1px" borderColor="gray.100">
                      <Box as="td" px={3} py={2.5} fontSize="xs" color="gray.400" fontFamily="mono">
                        {order.id.slice(0, 8)}...
                      </Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color="gray.700">
                        {INBOUND_STATUS_LABEL[order.status] ?? order.status}
                      </Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color="gray.600">
                        {order.expectedAt ? new Date(order.expectedAt).toLocaleDateString("ko-KR") : "—"}
                      </Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color="gray.500">
                        {order.vendorRef ?? "—"}
                      </Box>
                      <Box as="td" px={3} py={2.5} fontSize="xs" color="gray.400">
                        {new Date(order.createdAt).toLocaleString("ko-KR")}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* ── 이력 탭 ── */}
      {tab === "history" && (
        <Box>
          <Flex align="flex-end" gap={3} mb={4} flexWrap="wrap">
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>시작일</Text>
              <Input
                type="date" size="sm" value={histRange.startDate} w="160px"
                onChange={(e) => setHistRange((r) => ({ ...r, startDate: e.target.value }))}
              />
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>종료일</Text>
              <Input
                type="date" size="sm" value={histRange.endDate} w="160px"
                onChange={(e) => setHistRange((r) => ({ ...r, endDate: e.target.value }))}
              />
            </Box>
            <Box>
              <Text fontSize="xs" color="transparent" mb={1}>조회</Text>
              <Button size="sm" variant="outline">
                <RefreshCw size={13} />
                조회
              </Button>
            </Box>
          </Flex>

          {histLoading ? (
            <Flex justify="center" py={8}><Spinner size="sm" /></Flex>
          ) : !history?.length ? (
            <Flex justify="center" py={8}>
              <Text fontSize="sm" color="gray.400">해당 기간의 이력이 없습니다.</Text>
            </Flex>
          ) : (
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
              <Box as="table" w="100%" style={{ borderCollapse: "collapse" }}>
                <Box as="thead" bg="gray.50">
                  <Box as="tr">
                    {["유형", "SKU", "수량", "사유 코드", "벤더 참조", "발생일시"].map((h) => (
                      <Box key={h} as="th" px={3} py={2.5} textAlign="left" fontSize="xs" fontWeight="medium" color="gray.500" borderBottomWidth="1px" borderColor="gray.200">
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box as="tbody">
                  {history.map((evt) => (
                    <Box key={evt.id} as="tr" _hover={{ bg: "gray.50" }} borderBottomWidth="1px" borderColor="gray.100">
                      <Box as="td" px={3} py={2.5} fontSize="xs" fontWeight="medium" color={
                        evt.type === "inbound" ? "blue.600"
                        : evt.type === "outbound" ? "red.500"
                        : evt.type === "adjustment" ? "orange.500"
                        : "gray.600"
                      }>
                        {evt.type}
                      </Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color="gray.700">{evt.sku}</Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color={evt.quantity > 0 ? "green.600" : "red.500"} fontWeight="medium">
                        {evt.quantity > 0 ? `+${evt.quantity}` : evt.quantity}
                      </Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color="gray.500">{evt.reasonCode ?? "—"}</Box>
                      <Box as="td" px={3} py={2.5} fontSize="sm" color="gray.400">{evt.vendorRef ?? "—"}</Box>
                      <Box as="td" px={3} py={2.5} fontSize="xs" color="gray.400">
                        {new Date(evt.occurredAt).toLocaleString("ko-KR")}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
