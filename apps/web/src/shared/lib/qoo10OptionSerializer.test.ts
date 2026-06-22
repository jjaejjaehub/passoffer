import { describe, it, expect } from "vitest";
import {
  cartesianProduct,
  getInventoryItemId,
  inventoryItemsToAxes,
  serializeInventoryOptions,
  deserializeInventoryOptions,
  type InventoryOptionItem,
  type OptionAxisState,
} from "./qoo10OptionSerializer";

function makeAxis(id: string, name: string, values: string[]): OptionAxisState {
  return { id, name, values, _rawValues: values.join(", ") };
}

function emptyInventoryRow(
  overrides: Partial<InventoryOptionItem> = {},
): InventoryOptionItem {
  return {
    Name1: "",
    Value1: "",
    Name2: "",
    Value2: "",
    Name3: "",
    Value3: "",
    Name4: "",
    Value4: "",
    Name5: "",
    Value5: "",
    Price: 0,
    Qty: 0,
    ItemTypeCode: "",
    ...overrides,
  };
}

function getKey(item: InventoryOptionItem): string {
  if (item._rowId) return item._rowId;
  return [item.Value1, item.Value2, item.Value3, item.Value4, item.Value5].join(
    "__",
  );
}

describe("cartesianProduct", () => {
  it("축 1개 × 값 4개 → 4행을 만든다", () => {
    const axes = [makeAxis("a1", "size", ["S", "M", "L", "XL"])];

    const rows = cartesianProduct(axes);

    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.Value1)).toEqual(["S", "M", "L", "XL"]);
    expect(rows.every((r) => r.Name1 === "size")).toBe(true);
    expect(rows.every((r) => r.Value2 === "")).toBe(true);
  });

  it("축 2개 × 값 4개씩 → 16행 모든 조합을 만든다", () => {
    const axes = [
      makeAxis("a1", "size", ["S", "M", "L", "XL"]),
      makeAxis("a2", "color", ["red", "blue", "green", "black"]),
    ];

    const rows = cartesianProduct(axes);

    expect(rows).toHaveLength(16);
    const keys = new Set(rows.map(getKey));
    expect(keys.size).toBe(16);
    // ["S","red","","",""].join("__")
    expect(keys.has(["S", "red", "", "", ""].join("__"))).toBe(true);
    expect(keys.has(["XL", "black", "", "", ""].join("__"))).toBe(true);
  });

  it("축 중 하나라도 값이 없으면 빈 배열을 반환한다", () => {
    const axes = [
      makeAxis("a1", "size", ["S", "M"]),
      makeAxis("a2", "color", []),
    ];

    expect(cartesianProduct(axes)).toEqual([]);
  });

  it("축이 비어 있으면 빈 배열을 반환한다", () => {
    expect(cartesianProduct([])).toEqual([]);
  });
});

describe("(1,4) → (2,4) 축 변경 시나리오", () => {
  it("축이 1×4에서 2×4로 늘어나면 신규 12개 키가 기존 4개 키와 구분된다", () => {
    const before = cartesianProduct([
      makeAxis("a1", "size", ["S", "M", "L", "XL"]),
    ]);
    const after = cartesianProduct([
      makeAxis("a1", "size", ["S", "M", "L", "XL"]),
      makeAxis("a2", "color", ["red", "blue", "green", "black"]),
    ]);

    expect(before).toHaveLength(4);
    expect(after).toHaveLength(16);

    // 축 추가 전 키들은 새 카르테시안에 그대로는 존재하지 않는다
    // (Value2가 비었던 기존 키 vs Value2가 채워진 새 키)
    const beforeKeys = new Set(before.map(getKey));
    const afterKeys = new Set(after.map(getKey));
    for (const key of beforeKeys) {
      expect(afterKeys.has(key)).toBe(false);
    }

    // size 별로 색상 4개씩 정확히 분포한다
    const bySizeCount = new Map<string, number>();
    for (const row of after) {
      bySizeCount.set(row.Value1, (bySizeCount.get(row.Value1) ?? 0) + 1);
    }
    expect(bySizeCount.get("S")).toBe(4);
    expect(bySizeCount.get("M")).toBe(4);
    expect(bySizeCount.get("L")).toBe(4);
    expect(bySizeCount.get("XL")).toBe(4);
  });

  it("getInventoryItemId는 동일 행/index 조합에 대해 안정적이다", () => {
    const rows = cartesianProduct([
      makeAxis("a1", "size", ["S", "M"]),
      makeAxis("a2", "color", ["red", "blue"]),
    ]);

    const ids = rows.map((row, idx) => getInventoryItemId(row, idx));
    expect(new Set(ids).size).toBe(ids.length);

    // 같은 항목/같은 index → 같은 id
    const target = rows[0]!;
    expect(getInventoryItemId(target, 0)).toBe(getInventoryItemId(target, 0));
    // 같은 항목, 다른 index → 다른 id
    expect(getInventoryItemId(target, 0)).not.toBe(
      getInventoryItemId(target, 1),
    );
  });
});

describe("inventoryItemsToAxes", () => {
  it("저장된 행으로부터 축 이름과 고유 값들을 복원한다", () => {
    const items: InventoryOptionItem[] = [
      emptyInventoryRow({
        Name1: "size",
        Value1: "S",
        Name2: "color",
        Value2: "red",
      }),
      emptyInventoryRow({
        Name1: "size",
        Value1: "M",
        Name2: "color",
        Value2: "red",
      }),
      emptyInventoryRow({
        Name1: "size",
        Value1: "S",
        Name2: "color",
        Value2: "blue",
      }),
    ];

    const axes = inventoryItemsToAxes(items);
    expect(axes).toHaveLength(2);
    expect(axes[0]?.name).toBe("size");
    expect(new Set(axes[0]?.values)).toEqual(new Set(["S", "M"]));
    expect(axes[1]?.name).toBe("color");
    expect(new Set(axes[1]?.values)).toEqual(new Set(["red", "blue"]));
  });

  it("동일한 축 이름의 중복 값은 한 번씩만 등장한다", () => {
    const items: InventoryOptionItem[] = [
      emptyInventoryRow({ Name1: "size", Value1: "S" }),
      emptyInventoryRow({ Name1: "size", Value1: "S" }),
      emptyInventoryRow({ Name1: "size", Value1: "M" }),
    ];

    const axes = inventoryItemsToAxes(items);
    expect(axes).toHaveLength(1);
    expect(axes[0]?.values).toEqual(["S", "M"]);
  });
});

describe("draft 추가/삭제 흐름 모델", () => {
  // draft를 추가하면 새 행은 항상 _rowId를 가지고, 동일 값 조합도 키 충돌 없이 구분된다.
  it("동일 값 조합이라도 _rowId로 행을 구분할 수 있다", () => {
    const baseRow = emptyInventoryRow({
      Name1: "size",
      Value1: "S",
      Qty: 10,
    });
    const draftRow: InventoryOptionItem = {
      ...emptyInventoryRow({ Name1: "size", Value1: "S", Qty: 5 }),
      _rowId: "test-uuid-1",
    };

    expect(getKey(baseRow)).toBe("S________");
    expect(getKey(draftRow)).toBe("test-uuid-1");
    expect(getKey(baseRow)).not.toBe(getKey(draftRow));
  });

  it("draft를 추가-적용한 뒤 삭제하면 축 값이 다른 행에도 살아있는 한 유지된다", () => {
    // 시나리오:
    //   초기: size=S,M (2행)
    //   draft 적용: size=S,M,L (3행, L은 manualRow)
    //   삭제: L 행 제거 → 축에서 L도 사라져야 한다 (다른 행에 L이 없으므로)
    const initialItems: InventoryOptionItem[] = [
      emptyInventoryRow({ Name1: "size", Value1: "S" }),
      emptyInventoryRow({ Name1: "size", Value1: "M" }),
    ];

    const afterAdd: InventoryOptionItem[] = [
      ...initialItems,
      {
        ...emptyInventoryRow({ Name1: "size", Value1: "L" }),
        _rowId: "manual-1",
      },
    ];

    const axesAfterAdd = inventoryItemsToAxes(afterAdd);
    expect(axesAfterAdd).toHaveLength(1);
    expect(new Set(axesAfterAdd[0]?.values)).toEqual(new Set(["S", "M", "L"]));

    // L 행 삭제
    const afterDelete = afterAdd.filter((r) => r._rowId !== "manual-1");

    const axesAfterDelete = inventoryItemsToAxes(afterDelete);
    expect(axesAfterDelete).toHaveLength(1);
    expect(new Set(axesAfterDelete[0]?.values)).toEqual(new Set(["S", "M"]));
    expect(axesAfterDelete[0]?.values).not.toContain("L");
  });

  it("draft가 기존 값과 겹치면 다른 행 제거 후에도 해당 값이 살아남는다", () => {
    // 초기: size=S,M (2행)
    // draft: size=S 행 추가 → 같은 값 다른 행 (manualRow)
    // S manualRow 삭제 → 원래 S는 살아있어야 한다
    const initialRow = emptyInventoryRow({ Name1: "size", Value1: "S" });
    const otherRow = emptyInventoryRow({ Name1: "size", Value1: "M" });
    const draftRow: InventoryOptionItem = {
      ...emptyInventoryRow({ Name1: "size", Value1: "S" }),
      _rowId: "manual-2",
    };

    const afterAdd = [initialRow, otherRow, draftRow];
    expect(afterAdd.map(getKey)).toEqual([
      "S________",
      "M________",
      "manual-2",
    ]);

    const afterDelete = afterAdd.filter((r) => r._rowId !== "manual-2");
    const axes = inventoryItemsToAxes(afterDelete);
    expect(new Set(axes[0]?.values)).toEqual(new Set(["S", "M"]));
  });
});

describe("serialize/deserialize 왕복", () => {
  it("_rowId는 직렬화에서 무시된다", () => {
    const items: InventoryOptionItem[] = [
      {
        ...emptyInventoryRow({
          Name1: "size",
          Value1: "S",
          Price: 1000,
          Qty: 10,
          ItemTypeCode: "S-1",
        }),
        _rowId: "should-be-stripped",
      },
    ];

    const str = serializeInventoryOptions(items);
    expect(str).not.toContain("should-be-stripped");

    const roundTrip = deserializeInventoryOptions(str);
    expect(roundTrip).toHaveLength(1);
    expect(roundTrip[0]?._rowId).toBeUndefined();
    expect(roundTrip[0]?.Value1).toBe("S");
    expect(roundTrip[0]?.Price).toBe(1000);
    expect(roundTrip[0]?.Qty).toBe(10);
    expect(roundTrip[0]?.ItemTypeCode).toBe("S-1");
  });

  it("다축 행도 왕복 후 동일하게 복원된다", () => {
    const items: InventoryOptionItem[] = [
      emptyInventoryRow({
        Name1: "size",
        Value1: "L",
        Name2: "color",
        Value2: "red",
        Price: 2000,
        Qty: 3,
        ItemTypeCode: "lr-1",
      }),
    ];

    const roundTrip = deserializeInventoryOptions(
      serializeInventoryOptions(items),
    );
    expect(roundTrip[0]?.Value1).toBe("L");
    expect(roundTrip[0]?.Value2).toBe("red");
    expect(roundTrip[0]?.Name1).toBe("size");
    expect(roundTrip[0]?.Name2).toBe("color");
    expect(roundTrip[0]?.Qty).toBe(3);
  });
});
