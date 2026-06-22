"use client";

import {
  Badge,
  Box,
  Button,
  HStack,
  Input,
  Table,
  Text,
} from "@chakra-ui/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { InventoryOptionItem, OptionAxisState } from "@/entities/product";
import {
  cartesianProduct,
  deserializeInventoryOptions,
  getInventoryItemId,
  inventoryItemsToAxes,
  serializeInventoryOptions,
} from "@/shared/lib/qoo10OptionSerializer";
import { appToaster } from "@/shared/ui/app-toaster";
import { BulkUpdateBar } from "./BulkUpdateBar";
import { OptionAxisForm } from "./OptionAxisForm";

export interface RegisterInventoryOptionsFieldProps {
  value: string;
  onChange: (next: string) => void;
  isDisabled?: boolean;
}

type InventoryEditableField =
  | "Price"
  | "Qty"
  | "ItemTypeCode"
  | "Value1"
  | "Value2"
  | "Value3";

type EditingCell = {
  id: string;
  field: InventoryEditableField;
} | null;

type DraftInventoryRow = {
  values: string[];
  Price: number;
  Qty: number;
  ItemTypeCode: string;
};

const INVENTORY_MAX_AXES = 3;
const INVENTORY_MAX_VALUES = 20;
const INVENTORY_MAX_ROWS = 1000;

function getInventoryValueByIndex(
  item: InventoryOptionItem,
  axisIndex: number,
): string {
  if (axisIndex === 0) return item.Value1;
  if (axisIndex === 1) return item.Value2;
  if (axisIndex === 2) return item.Value3;
  if (axisIndex === 3) return item.Value4;
  if (axisIndex === 4) return item.Value5;
  return "";
}

function getInventoryKey(item: InventoryOptionItem): string {
  return [item.Value1, item.Value2, item.Value3, item.Value4, item.Value5].join(
    "__",
  );
}

function setInventoryField(
  item: InventoryOptionItem,
  field: InventoryEditableField,
  value: string,
): InventoryOptionItem {
  if (field === "Price") {
    const num = Number(value);
    return { ...item, Price: Number.isFinite(num) ? num : 0 };
  }
  if (field === "Qty") {
    const num = Number(value);
    return { ...item, Qty: Number.isFinite(num) ? num : 0 };
  }
  if (field === "ItemTypeCode") return { ...item, ItemTypeCode: value };
  if (field === "Value1") return { ...item, Value1: value };
  if (field === "Value2") return { ...item, Value2: value };
  return { ...item, Value3: value };
}

export function RegisterInventoryOptionsField({
  value,
  onChange,
  isDisabled = false,
}: RegisterInventoryOptionsFieldProps): React.JSX.Element {
  const [axes, setAxes] = useState<OptionAxisState[]>([]);
  const [formAxes, setFormAxes] = useState<OptionAxisState[]>([]);
  const [appliedAxes, setAppliedAxes] = useState<boolean>(false);
  const [sourceTableItems, setSourceTableItems] = useState<
    InventoryOptionItem[] | null
  >(null);
  const [overrides, setOverrides] = useState<
    Record<string, { Price: number; Qty: number; ItemTypeCode: string }>
  >({});
  // axes 기반 테이블에서 수동으로 제거된 행 key 집합
  const [deletedKeys, setDeletedKeys] = useState<Set<string>>(new Set());
  // cartesianProduct 외부에서 수동으로 추가된 행
  const [manualRows, setManualRows] = useState<InventoryOptionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [bulkQty, setBulkQty] = useState<string>("");
  const [draftRow, setDraftRow] = useState<DraftInventoryRow | null>(null);

  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState<string>("");

  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);
  const skipNextBlurCommitRef = useRef<boolean>(false);
  const lastEmittedRef = useRef<string | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useLayoutEffect(() => {
    if (value === lastEmittedRef.current) {
      return;
    }
    lastEmittedRef.current = value;

    const items = deserializeInventoryOptions(value);
    if (items.length === 0) {
      setAxes([]);
      setFormAxes([]);
      setOverrides({});
      setSourceTableItems(null);
    } else {
      const initialAxes = inventoryItemsToAxes(items).slice(
        0,
        INVENTORY_MAX_AXES,
      );
      setAxes(initialAxes);
      setFormAxes(initialAxes);
      const nextOverrides: Record<
        string,
        { Price: number; Qty: number; ItemTypeCode: string }
      > = {};
      for (const item of items) {
        nextOverrides[getInventoryKey(item)] = {
          Price: item.Price,
          Qty: item.Qty,
          ItemTypeCode: item.ItemTypeCode,
        };
      }
      setOverrides(nextOverrides);
      setSourceTableItems(items);
    }
    setAppliedAxes(false);
    setDeletedKeys(new Set());
    setManualRows([]);
    setSelectedIds({});
    setDraftRow(null);
    setEditingCell(null);
    setEditValue("");
  }, [value]);

  const tableItems = useMemo<InventoryOptionItem[]>(() => {
    if (!appliedAxes && sourceTableItems !== null) {
      return sourceTableItems;
    }
    return cartesianProduct(axes.slice(0, INVENTORY_MAX_AXES));
  }, [appliedAxes, axes, sourceTableItems]);

  const displayItems = useMemo<InventoryOptionItem[]>(() => {
    const base = tableItems
      .filter((item) => !deletedKeys.has(getInventoryKey(item)))
      .map((item) => {
        const itemKey = getInventoryKey(item);
        const override = overrides[itemKey];
        if (!override) return item;
        return { ...item, ...override };
      });

    return [...base, ...manualRows];
  }, [deletedKeys, manualRows, overrides, tableItems]);

  useEffect(() => {
    const validKeys = new Set(
      displayItems.map((item) => getInventoryKey(item)),
    );
    setOverrides((prev) => {
      const next: Record<
        string,
        { Price: number; Qty: number; ItemTypeCode: string }
      > = {};
      for (const [key, value] of Object.entries(prev)) {
        if (validKeys.has(key)) next[key] = value;
      }
      // 동일 키 집합이면 새 객체를 반환하지 않음 → overrides 참조 고정 → displayItems 루프 방지
      if (Object.keys(next).length === Object.keys(prev).length) {
        return prev;
      }
      return next;
    });
  }, [displayItems]);

  useEffect(() => {
    if (isDisabled) {
      return;
    }
    if (displayItems.length === 0) {
      if (value !== "") {
        lastEmittedRef.current = "";
        onChangeRef.current("");
      }
      return;
    }
    try {
      const serialized = serializeInventoryOptions(displayItems);
      if (serialized !== value) {
        lastEmittedRef.current = serialized;
        onChangeRef.current(serialized);
      }
    } catch {
      // 직렬화 불가 상태에서는 폼 값을 건드리지 않음
    }
  }, [displayItems, isDisabled, value]);

  const rowIds = useMemo(
    () => displayItems.map((item, index) => getInventoryItemId(item, index)),
    [displayItems],
  );

  const selectedCount = rowIds.reduce(
    (count, id) => (selectedIds[id] ? count + 1 : count),
    0,
  );

  const isAllSelected = rowIds.length > 0 && selectedCount === rowIds.length;

  const isIndeterminate = selectedCount > 0 && selectedCount < rowIds.length;

  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    headerCheckboxRef.current.indeterminate = isIndeterminate;
  }, [isIndeterminate]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const id of rowIds) {
      next[id] = true;
    }
    setSelectedIds(next);
  };

  const handleBulkUpdate = (): void => {
    if (bulkPrice === "" && bulkQty === "") return;
    if (selectedCount === 0) return;

    const parsedPrice: number | undefined =
      bulkPrice !== ""
        ? (() => {
            const n = Number(bulkPrice);
            return Number.isFinite(n) ? n : 0;
          })()
        : undefined;
    const parsedQty: number | undefined =
      bulkQty !== ""
        ? (() => {
            const n = Number(bulkQty);
            return Number.isFinite(n) ? n : 0;
          })()
        : undefined;

    setOverrides((prev) => {
      const next: Record<
        string,
        { Price: number; Qty: number; ItemTypeCode: string }
      > = {
        ...prev,
      };
      for (let index = 0; index < displayItems.length; index += 1) {
        const row = displayItems[index];
        const rowId = getInventoryItemId(row, index);
        if (!selectedIds[rowId]) continue;
        const key = getInventoryKey(row);
        const existing = next[key];
        const basePrice = existing?.Price ?? row.Price;
        const baseQty = existing?.Qty ?? row.Qty;
        const baseItemTypeCode = existing?.ItemTypeCode ?? row.ItemTypeCode;
        next[key] = {
          Price: parsedPrice !== undefined ? parsedPrice : basePrice,
          Qty: parsedQty !== undefined ? parsedQty : baseQty,
          ItemTypeCode: baseItemTypeCode,
        };
      }
      return next;
    });

    setBulkPrice("");
    setBulkQty("");
  };

  const startEdit = (
    rowIndex: number,
    field: InventoryEditableField,
    value: string | number,
  ) => {
    if (isDisabled) return;
    setEditingCell({ id: String(rowIndex), field });
    setEditValue(String(value));
  };

  const cancelEdit = () => {
    skipNextBlurCommitRef.current = true;
    setEditingCell(null);
    setEditValue("");
  };

  const commitEdit = () => {
    const cell = editingCell;
    if (!cell) return;
    if (isDisabled) return;

    skipNextBlurCommitRef.current = true;

    const trimmed = editValue.trim();

    const rowIndex = Number(cell.id);
    const target = displayItems[rowIndex];
    if (!target) return;
    const oldKey = getInventoryKey(target);

    if (
      cell.field === "Price" ||
      cell.field === "Qty" ||
      cell.field === "ItemTypeCode"
    ) {
      const next = setInventoryField(
        target,
        cell.field,
        cell.field === "ItemTypeCode" ? trimmed : editValue,
      );
      setOverrides((prev) => ({
        ...prev,
        [oldKey]: {
          Price: next.Price,
          Qty: next.Qty,
          ItemTypeCode: next.ItemTypeCode,
        },
      }));
    } else {
      const axisIndex =
        cell.field === "Value1" ? 0 : cell.field === "Value2" ? 1 : 2;
      const prevValue = getInventoryValueByIndex(target, axisIndex);

      if (prevValue === trimmed) {
        setEditingCell(null);
        setEditValue("");
        return;
      }

      const oldItemKey = getInventoryKey(target);

      const newItem: InventoryOptionItem = {
        ...target,
        ...(axisIndex === 0
          ? { Value1: trimmed }
          : axisIndex === 1
            ? { Value2: trimmed }
            : { Value3: trimmed }),
      };
      const newItemKey = getInventoryKey(newItem);

      // axes에 새 value 추가 (기존 value 유지)
      const currentAxes = axes;
      const nextAxes = currentAxes.map((axis, idx) => {
        if (idx !== axisIndex) return axis;
        if (axis.values.includes(trimmed)) return axis;
        const nextValues = [...axis.values, trimmed];
        return {
          ...axis,
          values: nextValues,
          _rawValues: nextValues.join(", "),
        };
      });

      // 새로 생기는 카르테시안 행 전부 차단 (newItemKey 포함)
      // newItem은 manualRows로만 표시하기 때문에 base에 있으면 안 됨
      const prevCartesianKeys = new Set(
        cartesianProduct(currentAxes).map((item) => getInventoryKey(item)),
      );
      const nextCartesianKeys = new Set(
        cartesianProduct(nextAxes).map((item) => getInventoryKey(item)),
      );
      const keysToBlock = new Set<string>();
      for (const key of nextCartesianKeys) {
        if (!prevCartesianKeys.has(key)) {
          keysToBlock.add(key); // newItemKey도 포함해서 전부 차단
        }
      }
      const newItemAlreadyInBase = prevCartesianKeys.has(newItemKey);

      setAxes(nextAxes);
      setFormAxes(nextAxes);
      setAppliedAxes(true);

      setDeletedKeys((prev) => {
        const next = new Set(prev);
        next.add(oldItemKey); // 수정 전 행 숨김
        for (const key of keysToBlock) {
          next.add(key); // 새로 생긴 카르테시안 행 전부 차단
        }
        if (newItemAlreadyInBase) {
          next.delete(newItemKey); // base에 있으면 숨김 해제
        }
        return next;
      });

      // overrides: 수정 전 행의 Price/Qty/ItemTypeCode를 수정 후 행으로 이전
      setOverrides((prev) => {
        const next = { ...prev };
        const oldOverride = prev[oldItemKey];
        delete next[oldItemKey];
        if (oldOverride) next[newItemKey] = oldOverride;
        return next;
      });

      if (!newItemAlreadyInBase) {
        // manualRows: 중복 제거 후 추가
        setManualRows((prev) => {
          const filtered = prev.filter(
            (item) => getInventoryKey(item) !== newItemKey,
          );
          return [...filtered, newItem];
        });
      }
    }

    setEditingCell(null);
    setEditValue("");
  };

  const applyAxes = (confirmedAxes: OptionAxisState[]): void => {
    // OptionAxisForm에서 확정된 values 기준으로만 추가 검증
    const nextCount = confirmedAxes.reduce(
      (acc, axis) => acc * axis.values.length,
      1,
    );
    if (nextCount > INVENTORY_MAX_ROWS) {
      appToaster.create({
        title: `${INVENTORY_MAX_ROWS}개를 초과하는 조합은 생성할 수 없습니다.`,
        type: "warning",
      });
      return;
    }
    setAxes(confirmedAxes);
    setAppliedAxes(true);
    setDeletedKeys(new Set());
    setManualRows([]);
  };

  const handleDeleteSelected = (idsOverride?: string[]): void => {
    const selectedIdList =
      idsOverride ??
      Object.keys(selectedIds).filter((id) => selectedIds[id] === true);
    if (selectedIdList.length === 0) return;

    const keysToDelete = new Set<string>();
    displayItems.forEach((item, i) => {
      const id = getInventoryItemId(item, i);
      if (selectedIdList.includes(id)) {
        keysToDelete.add(getInventoryKey(item));
      }
    });

    setDeletedKeys((prev) => {
      const next = new Set(prev);
      for (const key of keysToDelete) {
        next.add(key);
      }
      return next;
    });

    setManualRows((prev) =>
      prev.filter((item) => !keysToDelete.has(getInventoryKey(item))),
    );

    const remainingItems = displayItems.filter(
      (item) => !keysToDelete.has(getInventoryKey(item)),
    );

    const survivingValuesByAxis: Record<string, Set<string>> = {};
    remainingItems.forEach((item) => {
      ([1, 2, 3, 4, 5] as const).forEach((n) => {
        const name = item[`Name${n}` as keyof InventoryOptionItem] as string;
        const value = item[`Value${n}` as keyof InventoryOptionItem] as string;
        if (!name || !value) return;
        if (!survivingValuesByAxis[name]) {
          survivingValuesByAxis[name] = new Set<string>();
        }
        survivingValuesByAxis[name].add(value);
      });
    });

    const nextAxes = axes
      .map((axis) => {
        const survivedValues = axis.values.filter(
          (v) => survivingValuesByAxis[axis.name]?.has(v) ?? false,
        );
        return {
          ...axis,
          values: survivedValues,
          _rawValues: survivedValues.join(", "),
        };
      })
      .filter((axis) => axis.values.length > 0);

    const axesChanged =
      nextAxes.length !== axes.length ||
      nextAxes.some(
        (axis, i) =>
          axis.values.length !== axes[i].values.length ||
          axis.values.some((v, j) => v !== axes[i].values[j]),
      );

    if (axesChanged) {
      setAxes(nextAxes);
      setFormAxes(nextAxes);
      setAppliedAxes(true);
    }
    setSelectedIds({});
  };

  const deleteSingle = (item: InventoryOptionItem, index: number): void => {
    handleDeleteSelected([getInventoryItemId(item, index)]);
  };

  const addDraft = (): void => {
    const values = Array.from({ length: Math.max(axes.length, 1) }, () => "");
    setDraftRow({ values, Price: 0, Qty: 0, ItemTypeCode: "" });
  };

  const commitDraft = (): void => {
    if (!draftRow) return;
    const newItem: InventoryOptionItem = {
      Name1: axes[0]?.name ?? "",
      Value1: draftRow.values[0] ?? "",
      Name2: axes[1]?.name ?? "",
      Value2: draftRow.values[1] ?? "",
      Name3: axes[2]?.name ?? "",
      Value3: draftRow.values[2] ?? "",
      Name4: axes[3]?.name ?? "",
      Value4: draftRow.values[3] ?? "",
      Name5: axes[4]?.name ?? "",
      Value5: draftRow.values[4] ?? "",
      Price: draftRow.Price,
      Qty: draftRow.Qty,
      ItemTypeCode: draftRow.ItemTypeCode,
    };

    const nextAxes = axes.map((axis, idx) => {
      const newValue = draftRow.values[idx] ?? "";
      if (!newValue || axis.values.includes(newValue)) return axis;
      const nextValues = [...axis.values, newValue];
      return {
        ...axis,
        values: nextValues,
        _rawValues: nextValues.join(", "),
      };
    });

    const prevKeys = new Set(
      cartesianProduct(axes).map((item) => getInventoryKey(item)),
    );

    const nextCartesian = cartesianProduct(nextAxes);
    const nextKeys = new Set(
      nextCartesian.map((item) => getInventoryKey(item)),
    );

    const newlyAddedKeys = new Set<string>();
    for (const key of nextKeys) {
      if (!prevKeys.has(key)) {
        newlyAddedKeys.add(key);
      }
    }

    const keysToBlock = new Set<string>(newlyAddedKeys);

    setAxes(nextAxes);
    setFormAxes(nextAxes);
    setAppliedAxes(true);

    setDeletedKeys((prev) => {
      const next = new Set(prev);
      for (const key of keysToBlock) {
        next.add(key);
      }
      return next;
    });

    setManualRows((prev) => [...prev, newItem]);
    setDraftRow(null);
  };

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      bg="white"
      p={5}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Text fontSize="lg" fontWeight="semibold">
          조합형 옵션
        </Text>
        <Badge colorPalette={displayItems.length === 0 ? "gray" : "green"}>
          {displayItems.length === 0 ? "없음" : "설정됨"}
        </Badge>
      </Box>

      <Text fontSize="xs" color="gray.500" mb={4}>
        항목별 더블클릭 시 입력란 활성 · Enter로 적용
      </Text>

      <Box
        pointerEvents={isDisabled ? "none" : "auto"}
        opacity={isDisabled ? 0.65 : 1}
      >
        <OptionAxisForm
          axes={formAxes}
          maxAxes={INVENTORY_MAX_AXES}
          maxValues={INVENTORY_MAX_VALUES}
          onAxesChange={setFormAxes}
          onApply={applyAxes}
          applyLabel="↓ 옵션 목록으로 적용"
        />
      </Box>

      <BulkUpdateBar
        selectedCount={selectedCount}
        actions={[
          {
            label: "선택항목 삭제",
            onClick: () => handleDeleteSelected(),
            disabled: isDisabled || selectedCount === 0,
          },
          {
            label: "+ 옵션목록 추가",
            onClick: addDraft,
            disabled: isDisabled,
          },
        ]}
      />

      {selectedCount > 0 ? (
        <HStack flexWrap="wrap" alignItems="center" gap={3} mb={3}>
          <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap">
            옵션가격
          </Text>
          <Input
            type="number"
            size="sm"
            placeholder="0"
            value={bulkPrice}
            disabled={isDisabled}
            onChange={(e) => setBulkPrice(e.target.value)}
            w="100px"
            minW="0"
            h="28px"
            minH="28px"
          />
          <Text fontSize="sm" color="gray.600">
            円
          </Text>
          <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap">
            재고수량
          </Text>
          <Input
            type="number"
            size="sm"
            placeholder="0"
            value={bulkQty}
            disabled={isDisabled}
            onChange={(e) => setBulkQty(e.target.value)}
            w="100px"
            minW="0"
            h="28px"
            minH="28px"
          />
          <Text fontSize="sm" color="gray.600">
            개
          </Text>
          <Button
            type="button"
            size="sm"
            colorPalette="blue"
            disabled={isDisabled || (bulkPrice === "" && bulkQty === "")}
            onClick={handleBulkUpdate}
          >
            선택항목 일괄적용
          </Button>
        </HStack>
      ) : null}

      {displayItems.length === 0 && draftRow === null ? (
        <Box
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          p={4}
          bg="gray.50"
        >
          <Text fontSize="sm" color="gray.600">
            등록된 조합형 옵션이 없습니다.
          </Text>
        </Box>
      ) : (
        <Box
          overflowX="auto"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
        >
          <Table.Root size="sm" style={{ tableLayout: "fixed" }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader w="44px" p={0} verticalAlign="middle">
                  <Box
                    h="28px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </Box>
                </Table.ColumnHeader>
                {axes.length > 0 ? (
                  axes.map((axis) => (
                    <Table.ColumnHeader
                      key={axis.id}
                      minW="80px"
                      w="80px"
                      p={0}
                      verticalAlign="middle"
                    >
                      <Box px={2} h="28px" display="flex" alignItems="center">
                        {axis.name}
                      </Box>
                    </Table.ColumnHeader>
                  ))
                ) : (
                  <Table.ColumnHeader
                    minW="80px"
                    w="80px"
                    p={0}
                    verticalAlign="middle"
                  >
                    <Box px={2} h="28px" display="flex" alignItems="center">
                      옵션값
                    </Box>
                  </Table.ColumnHeader>
                )}
                <Table.ColumnHeader
                  minW="80px"
                  w="80px"
                  p={0}
                  verticalAlign="middle"
                >
                  <Box
                    px={2}
                    h="28px"
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                  >
                    옵션가격
                  </Box>
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  minW="80px"
                  w="80px"
                  p={0}
                  verticalAlign="middle"
                >
                  <Box px={2} h="28px" display="flex" alignItems="center">
                    재고수량
                  </Box>
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  minW="120px"
                  w="120px"
                  p={0}
                  verticalAlign="middle"
                >
                  <Box px={2} h="28px" display="flex" alignItems="center">
                    판매자옵션코드
                  </Box>
                </Table.ColumnHeader>
                <Table.ColumnHeader w="60px" p={0} verticalAlign="middle">
                  <Box
                    h="28px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    삭제
                  </Box>
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {displayItems.map((row, rowIndex) => {
                const rowId = getInventoryItemId(row, rowIndex);
                const priceEditing =
                  editingCell?.id === String(rowIndex) &&
                  editingCell?.field === "Price";
                const qtyEditing =
                  editingCell?.id === String(rowIndex) &&
                  editingCell?.field === "Qty";
                const codeEditing =
                  editingCell?.id === String(rowIndex) &&
                  editingCell?.field === "ItemTypeCode";

                return (
                  <Table.Row key={rowId}>
                    <Table.Cell w="44px" p={0} verticalAlign="middle">
                      <Box
                        h="28px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds[rowId] === true}
                          onChange={() => toggleSelect(rowId)}
                          disabled={isDisabled}
                        />
                      </Box>
                    </Table.Cell>

                    {axes.length > 0 ? (
                      axes.map((axis, axisIndex) => {
                        const field: InventoryEditableField =
                          axisIndex === 0
                            ? "Value1"
                            : axisIndex === 1
                              ? "Value2"
                              : "Value3";
                        const isEditing =
                          editingCell?.id === String(rowIndex) &&
                          editingCell?.field === field;
                        const value = getInventoryValueByIndex(row, axisIndex);
                        return (
                          <Table.Cell
                            key={`${rowId}_${axis.id}`}
                            minW="80px"
                            w="80px"
                            p={0}
                            verticalAlign="middle"
                          >
                            {isEditing ? (
                              <Input
                                size="sm"
                                autoFocus
                                value={editValue}
                                onChange={(event) =>
                                  setEditValue(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") commitEdit();
                                  if (event.key === "Escape") cancelEdit();
                                }}
                                onBlur={commitEdit}
                                w="100%"
                                minW="0"
                                h="28px"
                                minH="28px"
                              />
                            ) : (
                              <Box
                                cursor="text"
                                _hover={{ bg: "gray.50" }}
                                px={2}
                                borderRadius="sm"
                                h="28px"
                                minH="28px"
                                onDoubleClick={() =>
                                  startEdit(rowIndex, field, value)
                                }
                              >
                                {value}
                              </Box>
                            )}
                          </Table.Cell>
                        );
                      })
                    ) : (
                      <Table.Cell
                        minW="80px"
                        w="80px"
                        p={0}
                        verticalAlign="middle"
                      >
                        <Box
                          px={2}
                          h="28px"
                          minH="28px"
                          display="flex"
                          alignItems="center"
                        >
                          {row.Value1 || "-"}
                        </Box>
                      </Table.Cell>
                    )}

                    <Table.Cell
                      minW="80px"
                      w="80px"
                      p={0}
                      verticalAlign="middle"
                      textAlign="right"
                    >
                      {priceEditing ? (
                        <Input
                          size="sm"
                          autoFocus
                          value={editValue}
                          disabled={isDisabled}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          onBlur={() => {
                            if (skipNextBlurCommitRef.current) {
                              skipNextBlurCommitRef.current = false;
                              return;
                            }
                            commitEdit();
                          }}
                          w="100%"
                          minW="0"
                          h="28px"
                          minH="28px"
                        />
                      ) : (
                        <Box
                          cursor="text"
                          _hover={{ bg: "gray.50" }}
                          px={2}
                          borderRadius="sm"
                          h="28px"
                          minH="28px"
                          display="flex"
                          alignItems="center"
                          justifyContent="flex-end"
                          onDoubleClick={() =>
                            startEdit(rowIndex, "Price", row.Price)
                          }
                        >
                          {`¥${row.Price.toLocaleString("ja-JP")}`}
                        </Box>
                      )}
                    </Table.Cell>

                    <Table.Cell
                      minW="80px"
                      w="80px"
                      p={0}
                      verticalAlign="middle"
                    >
                      {qtyEditing ? (
                        <Input
                          size="sm"
                          autoFocus
                          value={editValue}
                          disabled={isDisabled}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          onBlur={() => {
                            if (skipNextBlurCommitRef.current) {
                              skipNextBlurCommitRef.current = false;
                              return;
                            }
                            commitEdit();
                          }}
                          w="100%"
                          minW="0"
                          h="28px"
                          minH="28px"
                        />
                      ) : (
                        <Box
                          cursor="text"
                          _hover={{ bg: "gray.50" }}
                          px={2}
                          borderRadius="sm"
                          h="28px"
                          minH="28px"
                          display="flex"
                          alignItems="center"
                          onDoubleClick={() =>
                            startEdit(rowIndex, "Qty", row.Qty)
                          }
                        >
                          {row.Qty.toLocaleString("ja-JP")}
                        </Box>
                      )}
                    </Table.Cell>

                    <Table.Cell
                      minW="120px"
                      w="120px"
                      p={0}
                      verticalAlign="middle"
                    >
                      {codeEditing ? (
                        <Input
                          size="sm"
                          autoFocus
                          value={editValue}
                          disabled={isDisabled}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          onBlur={() => {
                            if (skipNextBlurCommitRef.current) {
                              skipNextBlurCommitRef.current = false;
                              return;
                            }
                            commitEdit();
                          }}
                          w="100%"
                          minW="0"
                          h="28px"
                          minH="28px"
                        />
                      ) : (
                        <Box
                          cursor="text"
                          _hover={{ bg: "gray.50" }}
                          px={2}
                          borderRadius="sm"
                          h="28px"
                          minH="28px"
                          display="flex"
                          alignItems="center"
                          onDoubleClick={() =>
                            startEdit(
                              rowIndex,
                              "ItemTypeCode",
                              row.ItemTypeCode,
                            )
                          }
                        >
                          {row.ItemTypeCode.trim().length > 0
                            ? row.ItemTypeCode
                            : "—"}
                        </Box>
                      )}
                    </Table.Cell>
                    <Table.Cell w="60px" p={0} verticalAlign="middle">
                      <Box
                        h="28px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => deleteSingle(row, rowIndex)}
                        >
                          삭제
                        </Button>
                      </Box>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
              {draftRow ? (
                <Table.Row bg="blue.50">
                  <Table.Cell w="44px" p={0} verticalAlign="middle" />
                  {axes.length > 0 ? (
                    axes.map((axis, axisIndex) => (
                      <Table.Cell
                        key={`draft_${axis.id}`}
                        minW="80px"
                        w="80px"
                        p={0}
                        verticalAlign="middle"
                      >
                        <Input
                          size="sm"
                          value={draftRow.values[axisIndex] ?? ""}
                          onChange={(event) =>
                            setDraftRow((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    values: prev.values.map((v, i) =>
                                      i === axisIndex ? event.target.value : v,
                                    ),
                                  }
                                : prev,
                            )
                          }
                          w="100%"
                          minW="0"
                          h="28px"
                          minH="28px"
                        />
                      </Table.Cell>
                    ))
                  ) : (
                    <Table.Cell
                      minW="80px"
                      w="80px"
                      p={0}
                      verticalAlign="middle"
                    >
                      <Input
                        size="sm"
                        value={draftRow.values[0] ?? ""}
                        onChange={(event) =>
                          setDraftRow((prev) =>
                            prev
                              ? { ...prev, values: [event.target.value] }
                              : prev,
                          )
                        }
                        w="100%"
                        minW="0"
                        h="28px"
                        minH="28px"
                      />
                    </Table.Cell>
                  )}
                  <Table.Cell
                    minW="80px"
                    w="80px"
                    p={0}
                    verticalAlign="middle"
                    textAlign="right"
                  >
                    <Input
                      size="sm"
                      value={String(draftRow.Price)}
                      onChange={(event) =>
                        setDraftRow((prev) =>
                          prev
                            ? {
                                ...prev,
                                Price: Number.isFinite(
                                  Number(event.target.value),
                                )
                                  ? Number(event.target.value)
                                  : 0,
                              }
                            : prev,
                        )
                      }
                      w="100%"
                      minW="0"
                      h="28px"
                      minH="28px"
                    />
                  </Table.Cell>
                  <Table.Cell minW="80px" w="80px" p={0} verticalAlign="middle">
                    <Input
                      size="sm"
                      value={String(draftRow.Qty)}
                      onChange={(event) =>
                        setDraftRow((prev) =>
                          prev
                            ? {
                                ...prev,
                                Qty: Number.isFinite(Number(event.target.value))
                                  ? Number(event.target.value)
                                  : 0,
                              }
                            : prev,
                        )
                      }
                      w="100%"
                      minW="0"
                      h="28px"
                      minH="28px"
                    />
                  </Table.Cell>
                  <Table.Cell
                    minW="120px"
                    w="120px"
                    p={0}
                    verticalAlign="middle"
                  >
                    <Input
                      size="sm"
                      value={draftRow.ItemTypeCode}
                      onChange={(event) =>
                        setDraftRow((prev) =>
                          prev
                            ? { ...prev, ItemTypeCode: event.target.value }
                            : prev,
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitDraft();
                      }}
                      w="100%"
                      minW="0"
                      h="28px"
                      minH="28px"
                    />
                  </Table.Cell>
                  <Table.Cell w="60px" p={0} verticalAlign="middle">
                    <HStack>
                      <Button size="xs" variant="outline" onClick={commitDraft}>
                        적용
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setDraftRow(null)}
                      >
                        취소
                      </Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ) : null}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      <Text fontSize="xs" color="red.500" mt={3}>
        항목별 더블클릭 시 입력란이 활성화되며, Enter를 눌러야 값이 적용됩니다.
      </Text>
      <Text fontSize="xs" color="gray.500" mt={2}>
        조합형 옵션은 상품 등록 요청 시 ItemType 필드로 함께 전송됩니다.
      </Text>
    </Box>
  );
}
