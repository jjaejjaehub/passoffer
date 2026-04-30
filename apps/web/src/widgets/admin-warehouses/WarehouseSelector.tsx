"use client";

import { Select, Spinner, Text, createListCollection } from "@chakra-ui/react";
import { useEffect, useMemo } from "react";
import { useWarehouses } from "@/entities/warehouse";
import { useSelectedWarehouseId } from "./useSelectedWarehouseId";

interface WarehouseSelectorProps {
  size?: "xs" | "sm" | "md";
  width?: string | number;
  placeholder?: string;
}

export function WarehouseSelector({
  size = "sm",
  width = "220px",
  placeholder = "창고 선택",
}: WarehouseSelectorProps): React.JSX.Element {
  const { data: warehouses, isLoading, isError } = useWarehouses();
  const { warehouseId, setWarehouseId } = useSelectedWarehouseId();

  const collection = useMemo(() => {
    const items = (warehouses ?? []).map((w) => ({
      label: `${w.name} (${w.code})`,
      value: w.id,
    }));
    return createListCollection({ items });
  }, [warehouses]);

  // 첫 로드 시 선택값이 없고 창고가 존재하면 첫 번째 항목을 자동 선택
  useEffect(() => {
    if (warehouseId === null && (warehouses?.length ?? 0) > 0 && warehouses) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouseId, warehouses, setWarehouseId]);

  if (isLoading) {
    return <Spinner size="sm" />;
  }

  if (isError || (warehouses?.length ?? 0) === 0) {
    return (
      <Text fontSize="sm" color="gray.500">
        등록된 창고가 없습니다
      </Text>
    );
  }

  return (
    <Select.Root
      collection={collection}
      size={size}
      value={warehouseId ? [warehouseId] : []}
      onValueChange={(v) => setWarehouseId(v.value[0] ?? null)}
      width={width}
    >
      <Select.Control bg="white" borderRadius="md">
        <Select.Trigger>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {collection.items.map((item) => (
            <Select.Item key={item.value} item={item}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
}
