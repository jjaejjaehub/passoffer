import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  masterProductVariants,
  masterStockLedger,
  skus,
  warehouseStocks,
} from "../db/schema";

export type LedgerScope = "MASTER" | "WAREHOUSE";

export type LedgerRefType =
  | "ORDER_RESERVE"
  | "ORDER_CANCEL"
  | "WAREHOUSE_PICK"
  | "WAREHOUSE_RESTOCK"
  | "WAREHOUSE_INBOUND"
  | "WAREHOUSE_OUTBOUND"
  | "MANUAL_ADJUST"
  | "SYNC_RESET"
  | "OVERSELL"
  | "UNMATCHED_SKU";

type DbRefType = "ORDER" | "USER" | "SYNC";
type DbLedgerType = "SALE" | "MANUAL_ADJUST" | "SYNC_RESET";

function toDbRefType(refType: LedgerRefType): DbRefType {
  switch (refType) {
    case "ORDER_RESERVE":
    case "ORDER_CANCEL":
    case "OVERSELL":
    case "UNMATCHED_SKU":
      return "ORDER";
    case "SYNC_RESET":
      return "SYNC";
    default:
      return "USER";
  }
}

function toDbLedgerType(refType: LedgerRefType): DbLedgerType {
  switch (refType) {
    case "ORDER_RESERVE":
    case "ORDER_CANCEL":
      return "SALE";
    case "SYNC_RESET":
      return "SYNC_RESET";
    default:
      return "MANUAL_ADJUST";
  }
}

export interface StockMovementInput {
  userId: string;
  scope: LedgerScope;
  refType: LedgerRefType;
  refId: string;
  qtyDelta: number; // 양수=증가, 음수=감소
  variantId?: string | null; // UNMATCHED_SKU 외에는 필수
  warehouseId?: string | null; // scope=WAREHOUSE일 때 필수
  channelId?: string | null;
  listedProductId?: string | null;
  note?: string;
  allowNegative?: boolean; // 기본 false. true면 재고가 음수가 돼도 허용
}

export type StockMovementResult =
  | {
      ok: true;
      prev: number;
      next: number;
      ledgerId: string;
      duplicated?: false;
    }
  | { ok: true; duplicated: true } // 이미 처리된 멱등 키
  | {
      ok: false;
      reason: "NEGATIVE_BLOCKED";
      current: number;
      attempted: number;
    }
  | { ok: false; reason: "VARIANT_NOT_FOUND" }
  | { ok: false; reason: "WAREHOUSE_STOCK_NOT_FOUND" };

type DbLike = FastifyInstance["db"];

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === UNIQUE_VIOLATION
  );
}

export class StockService {
  constructor(private readonly app: FastifyInstance) {}

  /**
   * 모든 재고 변동의 단일 진입점.
   * - 트랜잭션 내에서 ledger 쓰기 + 실제 재고 컬럼 업데이트를 함께 수행
   * - (refType, refId, scope, warehouseId) UNIQUE 제약으로 멱등성 보장
   * - allowNegative=false 일 때 결과 재고가 음수면 차단 (OVERSELL은 별도 ledger 행으로 기록)
   */
  async apply(input: StockMovementInput): Promise<StockMovementResult> {
    return this.runOn(this.app.db, input);
  }

  /**
   * 여러 변동을 한 트랜잭션으로 묶을 때 사용. 콜백 내에서 동일한 tx로 apply를 호출.
   */
  async withTransaction<T>(
    fn: (
      apply: (input: StockMovementInput) => Promise<StockMovementResult>,
    ) => Promise<T>,
  ): Promise<T> {
    return this.app.db.transaction(async (tx) => {
      return fn((input) => this.runOn(tx as unknown as DbLike, input));
    });
  }

  private async runOn(
    db: DbLike,
    input: StockMovementInput,
  ): Promise<StockMovementResult> {
    if (input.scope === "WAREHOUSE" && !input.warehouseId) {
      throw new Error("warehouseId is required for WAREHOUSE scope");
    }
    if (
      input.scope === "MASTER" &&
      input.refType !== "UNMATCHED_SKU" &&
      !input.variantId
    ) {
      throw new Error(
        "variantId is required for MASTER scope (except UNMATCHED_SKU)",
      );
    }

    // OVERSELL / UNMATCHED_SKU는 정보 행만 남기고 재고는 건드리지 않음
    const informational =
      input.refType === "OVERSELL" || input.refType === "UNMATCHED_SKU";
    if (informational) {
      return this.insertInfoLedger(db, input);
    }

    if (input.scope === "MASTER") {
      return this.applyMaster(db, input);
    }
    throw new Error(
      "WAREHOUSE scope requires applyWarehouseDirect with explicit warehouseStockId",
    );
  }

  private async insertInfoLedger(
    db: DbLike,
    input: StockMovementInput,
  ): Promise<StockMovementResult> {
    try {
      if (!input.variantId) {
        return { ok: true, duplicated: true };
      }
      const [row] = await db
        .insert(masterStockLedger)
        .values({
          userId: input.userId,
          variantId: input.variantId,
          type: toDbLedgerType(input.refType),
          qtyDelta: 0,
          prevStock: 0,
          newStock: 0,
          refType: toDbRefType(input.refType),
          refId: input.refId,
          channelId: input.channelId ?? null,
          listedProductId: input.listedProductId ?? null,
          note: input.note,
        })
        .returning({ id: masterStockLedger.id });
      return { ok: true, prev: 0, next: 0, ledgerId: row.id };
    } catch (err) {
      if (isUniqueViolation(err)) return { ok: true, duplicated: true };
      throw err;
    }
  }

  private async applyMaster(
    db: DbLike,
    input: StockMovementInput,
  ): Promise<StockMovementResult> {
    return db.transaction(async (tx) => {
      const [variant] = await tx
        .select({
          id: masterProductVariants.id,
          stock: masterProductVariants.stock,
        })
        .from(masterProductVariants)
        .where(eq(masterProductVariants.id, input.variantId!))
        .for("update")
        .limit(1);

      if (!variant) return { ok: false, reason: "VARIANT_NOT_FOUND" } as const;

      const prev = variant.stock;
      const next = prev + input.qtyDelta;
      if (next < 0 && !input.allowNegative) {
        return {
          ok: false,
          reason: "NEGATIVE_BLOCKED",
          current: prev,
          attempted: next,
        } as const;
      }

      try {
        const [row] = await tx
          .insert(masterStockLedger)
          .values({
            userId: input.userId,
            variantId: input.variantId!,
            type: toDbLedgerType(input.refType),
            qtyDelta: input.qtyDelta,
            prevStock: prev,
            newStock: next,
            refType: toDbRefType(input.refType),
            refId: input.refId,
            channelId: input.channelId ?? null,
            listedProductId: input.listedProductId ?? null,
            note: input.note,
          })
          .returning({ id: masterStockLedger.id });

        await tx
          .update(masterProductVariants)
          .set({ stock: next, updatedAt: new Date() })
          .where(eq(masterProductVariants.id, input.variantId!));

        return { ok: true, prev, next, ledgerId: row.id } as const;
      } catch (err) {
        if (isUniqueViolation(err))
          return { ok: true, duplicated: true } as const;
        throw err;
      }
    });
  }

  /**
   * SKU 기반 재고 변동. 0006 이후 applyMaster 를 대체할 단일 경로.
   * 현재(0005 단계)는 ledger 가 variant_id 컬럼만 가지므로 caller 가 연결된 variantId 를 함께 넘긴다.
   * 0006 마이그레이션에서 ledger.variant_id → ledger.sku_id 로 변환 후, 이 메서드 시그니처에서 variantId 를 제거한다.
   */
  async applySku(
    input: Omit<StockMovementInput, "scope" | "variantId"> & {
      skuId: string;
      variantId: string;
    },
  ): Promise<StockMovementResult> {
    return this.app.db.transaction(async (tx) => {
      const [sku] = await tx
        .select({ id: skus.id, stock: skus.stock })
        .from(skus)
        .where(eq(skus.id, input.skuId))
        .for("update")
        .limit(1);

      if (!sku) return { ok: false, reason: "VARIANT_NOT_FOUND" } as const;

      const prev = sku.stock;
      const next = prev + input.qtyDelta;
      if (next < 0 && !input.allowNegative) {
        return {
          ok: false,
          reason: "NEGATIVE_BLOCKED",
          current: prev,
          attempted: next,
        } as const;
      }

      try {
        const [row] = await tx
          .insert(masterStockLedger)
          .values({
            userId: input.userId,
            variantId: input.variantId,
            type: toDbLedgerType(input.refType),
            qtyDelta: input.qtyDelta,
            prevStock: prev,
            newStock: next,
            refType: toDbRefType(input.refType),
            refId: input.refId,
            channelId: input.channelId ?? null,
            listedProductId: input.listedProductId ?? null,
            note: input.note,
          })
          .returning({ id: masterStockLedger.id });

        await tx
          .update(skus)
          .set({ stock: next, updatedAt: new Date() })
          .where(eq(skus.id, input.skuId));

        return { ok: true, prev, next, ledgerId: row.id } as const;
      } catch (err) {
        if (isUniqueViolation(err))
          return { ok: true, duplicated: true } as const;
        throw err;
      }
    });
  }

  /**
   * scope=WAREHOUSE용: warehouseStockId를 직접 받아 처리.
   * Phase 4의 split picking에서 caller가 미리 분배 행을 찾아 호출.
   * variantId→warehouseStocks 매핑은 sku 기반이므로 caller가 lookup 후 호출.
   */
  async applyWarehouseDirect(
    input: StockMovementInput & { warehouseStockId: string },
  ): Promise<StockMovementResult> {
    return this.app.db.transaction(async (tx) => {
      const [ws] = await tx
        .select({
          id: warehouseStocks.id,
          quantity: warehouseStocks.quantity,
          warehouseId: warehouseStocks.warehouseId,
        })
        .from(warehouseStocks)
        .where(eq(warehouseStocks.id, input.warehouseStockId))
        .for("update")
        .limit(1);

      if (!ws) return { ok: false, reason: "WAREHOUSE_STOCK_NOT_FOUND" };

      const prev = ws.quantity;
      const next = prev + input.qtyDelta;
      if (next < 0 && !input.allowNegative) {
        return {
          ok: false,
          reason: "NEGATIVE_BLOCKED",
          current: prev,
          attempted: next,
        };
      }

      try {
        if (!input.variantId) {
          return { ok: true, duplicated: true };
        }
        const [row] = await tx
          .insert(masterStockLedger)
          .values({
            userId: input.userId,
            variantId: input.variantId,
            type: toDbLedgerType(input.refType),
            qtyDelta: input.qtyDelta,
            prevStock: prev,
            newStock: next,
            refType: toDbRefType(input.refType),
            refId: input.refId,
            channelId: input.channelId ?? null,
            listedProductId: input.listedProductId ?? null,
            note: input.note,
          })
          .returning({ id: masterStockLedger.id });

        await tx
          .update(warehouseStocks)
          .set({ quantity: next, updatedAt: new Date() })
          .where(eq(warehouseStocks.id, ws.id));

        return { ok: true, prev, next, ledgerId: row.id };
      } catch (err) {
        if (isUniqueViolation(err)) return { ok: true, duplicated: true };
        throw err;
      }
    });
  }
}
