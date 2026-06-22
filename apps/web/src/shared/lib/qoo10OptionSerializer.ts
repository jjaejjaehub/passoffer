const COL = "||*";
const ROW = "$$";

type InventoryAxisIndex = 1 | 2 | 3 | 4 | 5;

function safeToStrLoose(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(value);
  }
  return "";
}

function getInventoryAxis(
  item: { [key: string]: unknown },
  index: InventoryAxisIndex,
): [string, string] | null {
  const nameKey = `Name${index}`;
  const valueKey = `Value${index}`;
  const name = safeToStrLoose(item[nameKey]).trim();
  const value = safeToStrLoose(item[valueKey]).trim();
  if (name.length === 0 || value.length === 0) return null;
  return [name, value];
}

// ─────────────────────────────────────────────────────────────────────────────
// Single (GetGoodsOptionInfo) serializer
// ─────────────────────────────────────────────────────────────────────────────

export type SimpleOptionItem = {
  Name: string;
  Value: string;
  Price: number;
  OptionCode: string;
};

export type OptionAxisState = {
  id: string;
  name: string;
  values: string[];
  _rawValues: string;
};

const MAX_INVENTORY_AXES = 5;

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function axesToSimpleItems(axes: OptionAxisState[]): SimpleOptionItem[] {
  const out: SimpleOptionItem[] = [];
  for (const axis of axes) {
    const axisName = axis.name.trim();
    if (axisName.length === 0) continue;
    for (const value of axis.values) {
      out.push({
        Name: axisName,
        Value: value,
        Price: 0,
        OptionCode: "",
      });
    }
  }
  return out;
}

export function simpleItemsToAxes(
  items: SimpleOptionItem[],
): OptionAxisState[] {
  const byName = new Map<string, string[]>();

  for (const item of items) {
    const name = item.Name.trim();
    if (name.length === 0) continue;
    const current = byName.get(name) ?? [];
    current.push(item.Value);
    byName.set(name, current);
  }

  return Array.from(byName.entries()).map(([name, values], index) => ({
    id: `axis_${index}`,
    name,
    values: uniqueValues(values),
    _rawValues: uniqueValues(values).join(", "),
  }));
}

export function serializeSimpleOptions(items: SimpleOptionItem[]): string {
  if (items.length === 0) {
    throw new Error("[serialize] 옵션 항목이 없습니다.");
  }

  return items
    .map((item, i) => {
      const name = item.Name.trim();
      const value = item.Value.trim();
      if (!name || !value) {
        throw new Error(
          `[serialize] ${i + 1}번째 행: 옵션명과 옵션값은 필수입니다.`,
        );
      }

      // Qoo10 포맷: [Name]||*[Value]||*[Price]||*[OptionCode]$$...
      return [name, value, String(item.Price ?? 0), item.OptionCode ?? ""].join(
        COL,
      );
    })
    .join(ROW);
}

export function deserializeSimpleOptions(str: string): SimpleOptionItem[] {
  const input = safeToStrLoose(str);
  if (input.length === 0) return [];

  const rows = input.split(ROW);
  const out: SimpleOptionItem[] = [];

  for (const row of rows) {
    if (!row) continue;
    const cols = row.split(COL);
    if (cols.length < 4) continue;

    const [name, value, priceRaw, optionCode] = cols;
    const priceNum = Number(priceRaw);
    if (!Number.isFinite(priceNum)) continue;

    out.push({
      Name: name ?? "",
      Value: value ?? "",
      Price: priceNum,
      OptionCode: optionCode ?? "",
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory (GetGoodsInventoryInfo) serializer
// ─────────────────────────────────────────────────────────────────────────────

export type InventoryOptionItem = {
  Name1: string;
  Value1: string;
  Name2: string;
  Value2: string;
  Name3: string;
  Value3: string;
  Name4: string;
  Value4: string;
  Name5: string;
  Value5: string;
  Price: number;
  Qty: number;
  ItemTypeCode: string;
  /** UI 전용 row 고유 식별자. 직렬화 시 무시됨. */
  _rowId?: string;
};

export function getSimpleItemId(item: SimpleOptionItem, index: number): string {
  return `${item.Name}__${item.Value}__${index}`;
}

function getInventoryNameByIndex(
  item: InventoryOptionItem,
  index: 1 | 2 | 3 | 4 | 5,
): string {
  if (index === 1) return item.Name1;
  if (index === 2) return item.Name2;
  if (index === 3) return item.Name3;
  if (index === 4) return item.Name4;
  return item.Name5;
}

function getInventoryValueByIndex(
  item: InventoryOptionItem,
  index: 1 | 2 | 3 | 4 | 5,
): string {
  if (index === 1) return item.Value1;
  if (index === 2) return item.Value2;
  if (index === 3) return item.Value3;
  if (index === 4) return item.Value4;
  return item.Value5;
}

export function getInventoryItemId(
  item: InventoryOptionItem,
  index: number,
): string {
  const axes = ([1, 2, 3, 4, 5] as const)
    .map((axisIndex) => {
      const axisName = getInventoryNameByIndex(item, axisIndex);
      const axisValue = getInventoryValueByIndex(item, axisIndex);
      return `${axisName}:${axisValue}`;
    })
    .join("__");
  return `${axes}__${index}`;
}

function getValueByAxisIndex(item: InventoryOptionItem, index: number): string {
  if (index === 1) return item.Value1;
  if (index === 2) return item.Value2;
  if (index === 3) return item.Value3;
  if (index === 4) return item.Value4;
  if (index === 5) return item.Value5;
  return "";
}

function getNameByAxisIndex(item: InventoryOptionItem, index: number): string {
  if (index === 1) return item.Name1;
  if (index === 2) return item.Name2;
  if (index === 3) return item.Name3;
  if (index === 4) return item.Name4;
  if (index === 5) return item.Name5;
  return "";
}

function buildInventoryRowFromValues(
  axes: OptionAxisState[],
  values: string[],
): InventoryOptionItem {
  const axis1 = axes[0];
  const axis2 = axes[1];
  const axis3 = axes[2];
  const axis4 = axes[3];
  const axis5 = axes[4];

  return {
    Name1: axis1?.name ?? "",
    Value1: values[0] ?? "",
    Name2: axis2?.name ?? "",
    Value2: values[1] ?? "",
    Name3: axis3?.name ?? "",
    Value3: values[2] ?? "",
    Name4: axis4?.name ?? "",
    Value4: values[3] ?? "",
    Name5: axis5?.name ?? "",
    Value5: values[4] ?? "",
    Price: 0,
    Qty: 0,
    ItemTypeCode: "",
  };
}

function cartesianValues(axes: OptionAxisState[]): string[][] {
  if (axes.length === 0) return [];
  let rows: string[][] = [[]];
  for (const axis of axes) {
    const next: string[][] = [];
    for (const base of rows) {
      for (const value of axis.values) {
        next.push([...base, value]);
      }
    }
    rows = next;
  }
  return rows;
}

export function cartesianProduct(
  axes: OptionAxisState[],
): InventoryOptionItem[] {
  if (axes.length === 0) return [];
  const limitedAxes = axes.slice(0, MAX_INVENTORY_AXES);
  if (limitedAxes.some((axis) => axis.values.length === 0)) {
    return [];
  }
  const combinations = cartesianValues(limitedAxes);
  return combinations.map((values) =>
    buildInventoryRowFromValues(limitedAxes, values),
  );
}

export function inventoryItemsToAxes(
  items: InventoryOptionItem[],
): OptionAxisState[] {
  const map = new Map<string, Set<string>>();

  for (const item of items) {
    for (let i = 1; i <= MAX_INVENTORY_AXES; i += 1) {
      const name = getNameByAxisIndex(item, i).trim();
      const value = getValueByAxisIndex(item, i);
      if (name.length === 0) continue;
      const valueSet = map.get(name) ?? new Set<string>();
      valueSet.add(value);
      map.set(name, valueSet);
    }
  }

  return Array.from(map.entries()).map(([name, valueSet], index) => ({
    id: `axis_${index}`,
    name,
    values: Array.from(valueSet),
    _rawValues: Array.from(valueSet).join(", "),
  }));
}

function getActiveAxes(item: InventoryOptionItem): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const indices: InventoryAxisIndex[] = [1, 2, 3, 4, 5];
  for (const idx of indices) {
    const axis = getInventoryAxis(item, idx);
    if (!axis) continue;
    out.push(axis);
  }
  return out;
}

export function serializeInventoryOptions(
  items: InventoryOptionItem[],
): string {
  if (items.length === 0) {
    throw new Error("[serialize] 옵션 항목이 없습니다.");
  }

  return (
    items
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ _rowId: _ignored, ...item }, i) => {
        const axes = getActiveAxes(item);
        if (axes.length === 0) {
          throw new Error(
            `[serialize] ${i + 1}번째 행: 유효한 옵션명/옵션값이 없습니다.`,
          );
        }

        if (item.Qty < 0) {
          throw new Error(
            `[serialize] ${i + 1}번째 행: 재고수량은 0 이상이어야 합니다.`,
          );
        }

        // Qoo10 포맷:
        // [Name1]||*[Value1]||*...[NameN]||*[ValueN]||*[Price]||*[Qty]||*[ItemTypeCode]$$...
        const axisPart = axes.flat().join(COL);
        return `${axisPart}||*${item.Price}||*${item.Qty}||*${item.ItemTypeCode}`;
      })
      .join(ROW)
  );
}

export function deserializeInventoryOptions(
  str: string,
): InventoryOptionItem[] {
  const input = safeToStrLoose(str);
  if (input.length === 0) return [];

  const rows = input.split(ROW);
  const out: InventoryOptionItem[] = [];

  for (const row of rows) {
    if (!row) continue;
    const cols = row.split(COL);
    if (cols.length < 5) continue;

    const last3 = cols.slice(-3);
    const [priceRaw, qtyRaw, itemTypeCodeRaw] = last3;
    const priceNum = Number(priceRaw);
    const qtyNum = Number(qtyRaw);
    if (!Number.isFinite(priceNum) || !Number.isFinite(qtyNum)) continue;

    const axisCols = cols.slice(0, cols.length - 3);
    if (axisCols.length % 2 !== 0) continue;
    const pairsCount = axisCols.length / 2;

    const axesPairs: Array<[string, string]> = [];
    for (let i = 0; i < pairsCount; i += 1) {
      const name = axisCols[i * 2] ?? "";
      const value = axisCols[i * 2 + 1] ?? "";
      if (name.length === 0 || value.length === 0) continue;
      axesPairs.push([name, value]);
    }

    const buildAxis = (index: 1 | 2 | 3 | 4 | 5): [string, string] => {
      const axis = axesPairs[index - 1];
      if (!axis) return ["", ""];
      return axis;
    };

    const [n1, v1] = buildAxis(1);
    const [n2, v2] = buildAxis(2);
    const [n3, v3] = buildAxis(3);
    const [n4, v4] = buildAxis(4);
    const [n5, v5] = buildAxis(5);

    out.push({
      Name1: n1,
      Value1: v1,
      Name2: n2,
      Value2: v2,
      Name3: n3,
      Value3: v3,
      Name4: n4,
      Value4: v4,
      Name5: n5,
      Value5: v5,
      Price: priceNum,
      Qty: qtyNum,
      ItemTypeCode: itemTypeCodeRaw ?? "",
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests (comment-only)
// ─────────────────────────────────────────────────────────────────────────────
// 단일형 왕복 테스트
// const items = [{ Name: "color", Value: "red", Price: 0, OptionCode: "c1" }]
// const roundTrip = deserializeSimpleOptions(serializeSimpleOptions(items))
// assert(roundTrip[0].OptionCode === "c1")
//
// 조합형 단일 축 왕복 테스트
// const inv = [{ Name1:'color', Value1:'red', Name2:'', Value2:'', Name3:'', Value3:'', Name4:'', Value4:'', Name5:'', Value5:'', Price:0, Qty:10, ItemTypeCode:'red-1' }]
// const s = serializeInventoryOptions(inv)
// const rt = deserializeInventoryOptions(s)
// assert(rt[0].Value1 === 'red')
//
// 조합형 다중 축 테스트
// 입력 문자열: "size||*L||*color||*red||*0||*5||*lr-1"
// output: Value1='L', Value2='red', Price=0, Qty=5, ItemTypeCode='lr-1'
