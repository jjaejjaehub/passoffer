"use client";

import {
  Box,
  Button,
  Dialog,
  Flex,
  Input,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";

import {
  useGoodsInventory,
  useSaveInventoryOptions,
  useUpdateSimpleQty,
} from "@/entities/product";
import type { InventoryOptionItem } from "@/entities/product";
import type { Qoo10GoodsInventoryRow } from "@/shared/api/qoo10/goodsInventoryTypes";
import type { Product } from "@oms/types";
import { appToaster } from "@/shared/ui/app-toaster";

// ──────────────────────────────────────────────────────────────────────────────
// Combo inventory editor
// ──────────────────────────────────────────────────────────────────────────────

function buildOptionLabel(row: Qoo10GoodsInventoryRow): string {
  const parts: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const name = row[`Name${i}` as keyof Qoo10GoodsInventoryRow] as string;
    const val = row[`Value${i}` as keyof Qoo10GoodsInventoryRow] as string;
    if (name && val) {
      parts.push(`${name}: ${val}`);
    }
  }
  return parts.join(" / ") || row.ItemTypeCode || "-";
}

function rowsToOptionItems(rows: Qoo10GoodsInventoryRow[]): InventoryOptionItem[] {
  return rows.map((row) => ({
    Name1: row.Name1,
    Value1: row.Value1,
    Name2: row.Name2,
    Value2: row.Value2,
    Name3: row.Name3,
    Value3: row.Value3,
    Name4: row.Name4,
    Value4: row.Value4,
    Name5: row.Name5,
    Value5: row.Value5,
    Price: row.Price,
    Qty: row.Qty,
    ItemTypeCode: row.ItemTypeCode,
  }));
}

interface ComboEditorProps {
  itemCode: string;
  sellerCode: string;
  rows: Qoo10GoodsInventoryRow[];
  onSuccess: () => void;
}

function ComboEditor({ itemCode, sellerCode, rows, onSuccess }: ComboEditorProps) {
  const [editedQtys, setEditedQtys] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((r, i) => [i, String(r.Qty)])),
  );

  const { mutate: saveInventory, isPending } = useSaveInventoryOptions(itemCode, "qoo10");

  function handleQtyChange(idx: number, val: string) {
    setEditedQtys((prev) => ({ ...prev, [idx]: val }));
  }

  function handleSave() {
    const items = rowsToOptionItems(rows).map((item, idx) => ({
      ...item,
      Qty: Number(editedQtys[idx] ?? item.Qty),
    }));

    saveInventory(items, {
      onSuccess: () => {
        appToaster.create({
          title: "저장 완료",
          description: "조합형 재고가 저장되었습니다.",
          type: "success",
        });
        onSuccess();
      },
    });
  }

  return (
    <Stack gap={4}>
      <Text fontSize="sm" color="gray.600">
        조합형 옵션 재고를 수정합니다. 판매자 상품코드: {sellerCode || "-"}
      </Text>
      <Box overflowX="auto">
        <Box
          as="table"
          w="100%"
          fontSize="sm"
          style={{ borderCollapse: "separate", borderSpacing: 0 }}
        >
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              <Box as="th" px={3} py={2} textAlign="left" fontSize="xs" color="gray.500">
                옵션
              </Box>
              <Box as="th" px={3} py={2} textAlign="right" fontSize="xs" color="gray.500" w="100px">
                가격
              </Box>
              <Box as="th" px={3} py={2} textAlign="center" fontSize="xs" color="gray.500" w="100px">
                수량
              </Box>
            </Box>
          </Box>
          <Box as="tbody">
            {rows.map((row, idx) => (
              <Box
                key={row.ItemTypeCode || idx}
                as="tr"
                borderTopWidth="1px"
                borderColor="gray.100"
              >
                <Box as="td" px={3} py={2} fontSize="xs" color="gray.700">
                  {buildOptionLabel(row)}
                </Box>
                <Box as="td" px={3} py={2} textAlign="right" fontSize="xs" color="gray.700">
                  {row.Price.toLocaleString()}
                </Box>
                <Box as="td" px={3} py={2} textAlign="center">
                  <Input
                    size="sm"
                    type="number"
                    min={0}
                    value={editedQtys[idx] ?? String(row.Qty)}
                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                    textAlign="right"
                    w="80px"
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <Flex justify="flex-end" gap={2}>
        <Button
          type="button"
          variant="solid"
          colorPalette="gray"
          bg="gray.900"
          color="white"
          _hover={{ bg: "gray.800" }}
          size="sm"
          loading={isPending}
          onClick={handleSave}
        >
          저장
        </Button>
      </Flex>
    </Stack>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Simple / no-option qty editor
// ──────────────────────────────────────────────────────────────────────────────

interface SimpleEditorProps {
  itemCode: string;
  sellerCode: string;
  currentQty: number;
  onSuccess: () => void;
}

function SimpleEditor({ itemCode, sellerCode, currentQty, onSuccess }: SimpleEditorProps) {
  const [qty, setQty] = useState(String(currentQty));
  const { mutateAsync, isPending, error } = useUpdateSimpleQty();

  async function handleSave() {
    const newQty = parseInt(qty, 10);
    if (isNaN(newQty) || newQty < 0) {
      return;
    }
    try {
      await mutateAsync({ itemCode, sellerCode, newQty });
      appToaster.create({
        title: "저장 완료",
        description: "재고 수량이 수정되었습니다.",
        type: "success",
      });
      onSuccess();
    } catch {
      // error is shown below via `error` state
    }
  }

  return (
    <Stack gap={4}>
      <Text fontSize="sm" color="gray.600">
        단순 재고 수량을 수정합니다. 판매자 상품코드: {sellerCode || "-"}
      </Text>
      <Box>
        <Text fontSize="sm" mb={1} color="gray.700">
          재고 수량
        </Text>
        <Input
          type="number"
          min={0}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          size="md"
          w="160px"
        />
        {error ? (
          <Text fontSize="xs" color="red.600" mt={1}>
            {error}
          </Text>
        ) : null}
      </Box>
      <Flex justify="flex-end">
        <Button
          type="button"
          variant="solid"
          colorPalette="gray"
          bg="gray.900"
          color="white"
          _hover={{ bg: "gray.800" }}
          size="sm"
          loading={isPending}
          onClick={() => { void handleSave(); }}
        >
          저장
        </Button>
      </Flex>
    </Stack>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main modal
// ──────────────────────────────────────────────────────────────────────────────

export interface EditInventoryModalProps {
  item: Product | null;
  currentQty: number | undefined;
  onClose: () => void;
  onSaveSuccess?: (itemCode: string) => void;
}

export function EditInventoryModal({
  item,
  currentQty,
  onClose,
  onSaveSuccess,
}: EditInventoryModalProps): React.JSX.Element {
  const isOpen = item !== null;
  const itemCode = item?.id ?? "";
  const sellerCode = item?.sellerCode ?? "";

  const { rows, isLoading, error } = useGoodsInventory(itemCode, sellerCode);

  const isCombo = rows.length > 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(d) => { if (!d.open) onClose(); }} size="lg">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>재고 수정 — {itemCode}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body pb={6}>
            {isLoading ? (
              <Flex justify="center" py={8}>
                <Spinner color="gray.400" />
              </Flex>
            ) : error ? (
              <Box
                bg="red.50"
                borderWidth="1px"
                borderColor="red.200"
                borderRadius="md"
                px={4}
                py={3}
              >
                <Text fontSize="sm" color="red.700">
                  {error.message}
                </Text>
              </Box>
            ) : isCombo ? (
              <ComboEditor
                itemCode={itemCode}
                sellerCode={sellerCode}
                rows={rows}
                onSuccess={() => {
                  onSaveSuccess?.(itemCode);
                  onClose();
                }}
              />
            ) : (
              <SimpleEditor
                itemCode={itemCode}
                sellerCode={sellerCode}
                currentQty={currentQty ?? 0}
                onSuccess={() => {
                  onSaveSuccess?.(itemCode);
                  onClose();
                }}
              />
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
