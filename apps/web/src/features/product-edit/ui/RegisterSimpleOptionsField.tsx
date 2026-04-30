"use client";

import { Badge, Box, Button, HStack, Input, Table, Text } from "@chakra-ui/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { OptionAxisState, SimpleOptionItem } from "@/entities/product";
import {
  axesToSimpleItems,
  deserializeSimpleOptions,
  getSimpleItemId,
  serializeSimpleOptions,
  simpleItemsToAxes,
} from "@/shared/lib/qoo10OptionSerializer";
import { appToaster } from "@/shared/ui/app-toaster";
import { BulkUpdateBar } from "./BulkUpdateBar";
import { OptionAxisForm } from "./OptionAxisForm";

export interface RegisterSimpleOptionsFieldProps {
  value: string;
  onChange: (next: string) => void;
  isDisabled?: boolean;
}

type SimpleEditableField = "Name" | "Value" | "Price" | "OptionCode";
type EditingCell = { index: number; field: SimpleEditableField } | null;
type DraftRow = { Name: string; Value: string; Price: number; OptionCode: string };

const MAX_AXES = 3;
const MAX_VALUES = 20;

function getKey(item: Pick<SimpleOptionItem, "Name" | "Value">): string {
  return `${item.Name}__${item.Value}`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function cellText(value: string): string {
  return value.trim().length > 0 ? value : "—";
}

export function RegisterSimpleOptionsField({
  value,
  onChange,
  isDisabled = false,
}: RegisterSimpleOptionsFieldProps): React.JSX.Element {
  const [axes, setAxes] = useState<OptionAxisState[]>([]);
  const [formAxes, setFormAxes] = useState<OptionAxisState[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { Price: number; OptionCode: string }>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState("");
  const [draft, setDraft] = useState<DraftRow | null>(null);

  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);
  const lastEmittedRef = useRef<string | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useLayoutEffect(() => {
    if (value === lastEmittedRef.current) {
      return;
    }
    lastEmittedRef.current = value;

    const items = deserializeSimpleOptions(value);
    if (items.length === 0) {
      setAxes([]);
      setFormAxes([]);
      setOverrides({});
    } else {
      const nextAxes = simpleItemsToAxes(items);
      setAxes(nextAxes);
      setFormAxes(nextAxes);
      const nextOverrides: Record<string, { Price: number; OptionCode: string }> = {};
      for (const item of items) {
        nextOverrides[getKey(item)] = { Price: item.Price, OptionCode: item.OptionCode };
      }
      setOverrides(nextOverrides);
    }
    setSelected({});
    setEditing(null);
    setEditValue("");
    setDraft(null);
  }, [value]);

  const baseItems = useMemo(() => axesToSimpleItems(axes), [axes]);
  const displayItems = useMemo(
    () => baseItems.map((item) => ({ ...item, ...(overrides[getKey(item)] ?? {}) })),
    [baseItems, overrides],
  );

  useEffect(() => {
    const valid = new Set(displayItems.map((item) => getKey(item)));
    setOverrides((prev) => {
      const next: Record<string, { Price: number; OptionCode: string }> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (valid.has(k)) next[k] = v;
      }
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
      const serialized = serializeSimpleOptions(
        displayItems.map((item) => ({
          Name: item.Name,
          Value: item.Value,
          Price: item.Price,
          OptionCode: item.OptionCode,
        })),
      );
      if (serialized !== value) {
        lastEmittedRef.current = serialized;
        onChangeRef.current(serialized);
      }
    } catch {
      // 직렬화 불가 상태에서는 폼 값을 건드리지 않음
    }
  }, [displayItems, isDisabled, value]);

  const rowIds = displayItems.map((item, index) =>
    getSimpleItemId(item, index),
  );
  const selectedCount = rowIds.reduce((acc, id) => (selected[id] ? acc + 1 : acc), 0);
  const isAllSelected = rowIds.length > 0 && selectedCount === rowIds.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < rowIds.length;

  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = isIndeterminate;
  }, [isIndeterminate]);

  const applyAxes = (confirmedAxes: OptionAxisState[]): void => {
    // OptionAxisForm에서 검증 완료된 확정값을 사용 (setState 타이밍 이슈 방지)
    setAxes(confirmedAxes);
  };

  const removeSelected = (): void => {
    const idsToDelete = new Set(
      Object.keys(selected).filter((id) => selected[id] === true),
    );
    if (idsToDelete.size === 0) return;

    const updatedItems = displayItems.filter(
      (item, index) => !idsToDelete.has(getSimpleItemId(item, index)),
    );
    const nextAxes = simpleItemsToAxes(updatedItems);
    setAxes(nextAxes);
    setFormAxes(nextAxes);
    setSelected({});
  };

  const startEdit = (index: number, field: SimpleEditableField, value: string | number): void => {
    if (isDisabled) return;
    setEditing({ index, field });
    setEditValue(String(value));
  };

  const commitEdit = (): void => {
    if (!editing) return;
    const row = displayItems[editing.index];
    if (!row) return;

    const trimmed = editValue.trim();
    const oldKey = getKey(row);

    if (editing.field === "Price" || editing.field === "OptionCode") {
      setOverrides((prev) => ({
        ...prev,
        [oldKey]: {
          Price: editing.field === "Price" ? (Number.isFinite(Number(editValue)) ? Number(editValue) : 0) : row.Price,
          OptionCode: editing.field === "OptionCode" ? trimmed : row.OptionCode,
        },
      }));
    } else {
      const nextName = editing.field === "Name" ? trimmed : row.Name;
      const nextValue = editing.field === "Value" ? trimmed : row.Value;
      if (!nextName || !nextValue) {
        appToaster.create({ title: "항목명/항목값은 비울 수 없습니다.", type: "warning" });
        setEditing(null);
        return;
      }
      setAxes((prev) => {
        let next = prev
          .map((axis) => (axis.name === row.Name ? { ...axis, values: axis.values.filter((v) => v !== row.Value) } : axis))
          .filter((axis) => axis.values.length > 0);

        const found = next.find((axis) => axis.name === nextName);
        if (found) {
          next = next.map((axis) => (axis.name === nextName ? { ...axis, values: unique([...axis.values, nextValue]) } : axis));
        } else {
          if (next.length >= MAX_AXES) {
            appToaster.create({ title: `항목명은 최대 ${MAX_AXES}개입니다`, type: "warning" });
            return prev;
          }
          next = [
            ...next,
            { id: `axis_${Date.now()}`, name: nextName, values: [nextValue], _rawValues: nextValue },
          ];
        }
        setFormAxes(next);
        return next;
      });

      const newKey = getKey({ Name: nextName, Value: nextValue });
      setOverrides((prev) => {
        const next = { ...prev };
        const old = next[oldKey];
        delete next[oldKey];
        if (old) next[newKey] = old;
        return next;
      });
    }

    setEditing(null);
    setEditValue("");
  };

  const addDraft = (): void => setDraft({ Name: "", Value: "", Price: 0, OptionCode: "" });

  const commitDraft = (): void => {
    if (!draft) return;
    const name = draft.Name.trim();
    const value = draft.Value.trim();
    if (!name || !value) {
      appToaster.create({ title: "항목명과 항목값을 입력해주세요.", type: "warning" });
      return;
    }
    setAxes((prev) => {
      const found = prev.find((axis) => axis.name === name);
      if (!found && prev.length >= MAX_AXES) {
        appToaster.create({ title: `항목명은 최대 ${MAX_AXES}개입니다`, type: "warning" });
        return prev;
      }
      const next = found
        ? prev.map((axis) => (axis.name === name ? { ...axis, values: unique([...axis.values, value]) } : axis))
        : [...prev, { id: `axis_${Date.now()}`, name, values: [value], _rawValues: value }];
      setFormAxes(next);
      return next;
    });
    setOverrides((prev) => ({ ...prev, [getKey({ Name: name, Value: value })]: { Price: draft.Price, OptionCode: draft.OptionCode } }));
    setDraft(null);
  };

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white" p={5}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Text fontSize="lg" fontWeight="semibold">추가 구성 옵션</Text>
        <Badge colorPalette={displayItems.length === 0 ? "gray" : "green"}>{displayItems.length === 0 ? "없음" : "설정됨"}</Badge>
      </Box>

      <Box
        pointerEvents={isDisabled ? "none" : "auto"}
        opacity={isDisabled ? 0.65 : 1}
      >
        <OptionAxisForm
          axes={formAxes}
          maxAxes={MAX_AXES}
          maxValues={MAX_VALUES}
          onAxesChange={setFormAxes}
          onApply={applyAxes}
          applyLabel="↓ 추가구성 목록으로 적용"
        />
      </Box>

      <BulkUpdateBar
        selectedCount={selectedCount}
        actions={[
          { label: "선택항목 삭제", onClick: removeSelected, disabled: selectedCount === 0 || isDisabled },
          { label: "+ 추가구성 목록 추가", onClick: addDraft, disabled: isDisabled },
        ]}
      />

      <Box overflowX="auto" borderWidth="1px" borderColor="gray.200" borderRadius="md">
          <Table.Root size="sm" style={{ tableLayout: "fixed" }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader w="44px" p={0} verticalAlign="middle"><Box h="28px" display="flex" alignItems="center" justifyContent="center"><input ref={headerCheckboxRef} type="checkbox" checked={isAllSelected} onChange={(e) => { if (!e.target.checked) setSelected({}); else setSelected(Object.fromEntries(rowIds.map((id) => [id, true]))); }} /></Box></Table.ColumnHeader>
                <Table.ColumnHeader minW="80px" w="80px" p={0} verticalAlign="middle"><Box px={2} h="28px" display="flex" alignItems="center">항목명</Box></Table.ColumnHeader>
                <Table.ColumnHeader minW="80px" w="80px" p={0} verticalAlign="middle"><Box px={2} h="28px" display="flex" alignItems="center">항목값</Box></Table.ColumnHeader>
                <Table.ColumnHeader minW="80px" w="80px" p={0} verticalAlign="middle"><Box px={2} h="28px" display="flex" alignItems="center" justifyContent="flex-end">추가구성가격</Box></Table.ColumnHeader>
                <Table.ColumnHeader minW="120px" w="120px" p={0} verticalAlign="middle"><Box px={2} h="28px" display="flex" alignItems="center">판매자옵션코드</Box></Table.ColumnHeader>
                <Table.ColumnHeader w="60px" p={0} verticalAlign="middle"><Box h="28px" display="flex" alignItems="center" justifyContent="center">삭제</Box></Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {displayItems.map((row, index) => {
                const rowKey = getSimpleItemId(row, index);
                const nameEditing = editing?.index === index && editing.field === "Name";
                const valueEditing = editing?.index === index && editing.field === "Value";
                const priceEditing = editing?.index === index && editing.field === "Price";
                const codeEditing = editing?.index === index && editing.field === "OptionCode";
                return (
                  <Table.Row key={rowKey}>
                    <Table.Cell w="44px" p={0} verticalAlign="middle"><Box h="28px" display="flex" alignItems="center" justifyContent="center"><input type="checkbox" checked={selected[rowKey] === true} onChange={() => setSelected((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))} /></Box></Table.Cell>
                    <Table.Cell minW="80px" w="80px" p={0} verticalAlign="middle">{nameEditing ? <Input size="sm" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); }} w="100%" minW="0" h="28px" minH="28px" /> : <Box px={2} h="28px" minH="28px" display="flex" alignItems="center" _hover={{ bg: "gray.50" }} onDoubleClick={() => startEdit(index, "Name", row.Name)}>{cellText(row.Name)}</Box>}</Table.Cell>
                    <Table.Cell minW="80px" w="80px" p={0} verticalAlign="middle">{valueEditing ? <Input size="sm" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); }} w="100%" minW="0" h="28px" minH="28px" /> : <Box px={2} h="28px" minH="28px" display="flex" alignItems="center" _hover={{ bg: "gray.50" }} onDoubleClick={() => startEdit(index, "Value", row.Value)}>{cellText(row.Value)}</Box>}</Table.Cell>
                    <Table.Cell minW="80px" w="80px" p={0} verticalAlign="middle" textAlign="right">{priceEditing ? <Input size="sm" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); }} w="100%" minW="0" h="28px" minH="28px" /> : <Box px={2} h="28px" minH="28px" display="flex" alignItems="center" justifyContent="flex-end" _hover={{ bg: "gray.50" }} onDoubleClick={() => startEdit(index, "Price", row.Price)}>{`¥${row.Price.toLocaleString("ja-JP")}`}</Box>}</Table.Cell>
                    <Table.Cell minW="120px" w="120px" p={0} verticalAlign="middle">{codeEditing ? <Input size="sm" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); }} w="100%" minW="0" h="28px" minH="28px" /> : <Box px={2} h="28px" minH="28px" display="flex" alignItems="center" _hover={{ bg: "gray.50" }} onDoubleClick={() => startEdit(index, "OptionCode", row.OptionCode)}>{cellText(row.OptionCode)}</Box>}</Table.Cell>
                    <Table.Cell w="60px" p={0} verticalAlign="middle"><Box h="28px" display="flex" alignItems="center" justifyContent="center"><Button size="xs" variant="ghost" onClick={() => {
                      const updatedItems = displayItems.filter((_, i) => i !== index);
                      const nextAxes = simpleItemsToAxes(updatedItems);
                      setAxes(nextAxes);
                      setFormAxes(nextAxes);
                      setSelected({});
                    }}>삭제</Button></Box></Table.Cell>
                  </Table.Row>
                );
              })}
              {draft ? (
                <Table.Row bg="blue.50">
                  <Table.Cell w="44px" p={0} verticalAlign="middle" />
                  <Table.Cell minW="80px" w="80px" p={0} verticalAlign="middle"><Input size="sm" value={draft.Name} onChange={(e) => setDraft((prev) => (prev ? { ...prev, Name: e.target.value } : prev))} w="100%" minW="0" h="28px" minH="28px" /></Table.Cell>
                  <Table.Cell minW="80px" w="80px" p={0} verticalAlign="middle"><Input size="sm" value={draft.Value} onChange={(e) => setDraft((prev) => (prev ? { ...prev, Value: e.target.value } : prev))} onKeyDown={(e) => { if (e.key === "Enter") commitDraft(); }} w="100%" minW="0" h="28px" minH="28px" /></Table.Cell>
                  <Table.Cell minW="80px" w="80px" p={0} verticalAlign="middle" textAlign="right"><Input size="sm" value={String(draft.Price)} onChange={(e) => setDraft((prev) => (prev ? { ...prev, Price: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0 } : prev))} w="100%" minW="0" h="28px" minH="28px" /></Table.Cell>
                  <Table.Cell minW="120px" w="120px" p={0} verticalAlign="middle"><Input size="sm" value={draft.OptionCode} onChange={(e) => setDraft((prev) => (prev ? { ...prev, OptionCode: e.target.value } : prev))} w="100%" minW="0" h="28px" minH="28px" /></Table.Cell>
                  <Table.Cell w="60px" p={0} verticalAlign="middle"><Box h="28px" display="flex" alignItems="center" justifyContent="center"><HStack><Button size="xs" variant="outline" onClick={commitDraft}>적용</Button><Button size="xs" variant="ghost" onClick={() => setDraft(null)}>취소</Button></HStack></Box></Table.Cell>
                </Table.Row>
              ) : null}
            </Table.Body>
          </Table.Root>
        </Box>
      <Text fontSize="xs" color="gray.500" mt={3}>
        추가 구성 옵션은 상품 등록 요청 시 AdditionalOption 필드로 함께 전송됩니다.
      </Text>
    </Box>
  );
}
