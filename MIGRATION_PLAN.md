# 채널 API 마이그레이션 계획

> 작성일: 2026-04-14  
> 목표: 채널이 5개 이상으로 확장되어도 라우트 파일이 늘어나지 않는 도메인 중심 구조로 전환

---

## 현재 문제

1. **채널 × 도메인 만큼 파일 폭발**
   - `apps/web/app/api/shopify/orders/`, `shopify/products/`, `shopify/returns/` ...
   - 채널 추가 = Next.js 라우트 파일 N개 추가

2. **API 두 곳에 분산**
   - Next.js API 라우트: Shopify, Shopee, Rakuten, Qoo10 일부
   - Fastify: Qoo10 전체, 공통 orders/products/claims (미완)

3. **ChannelService.getAdapter()가 Qoo10만 지원**
   - Shopify/Shopee/Rakuten 어댑터 파일은 있지만 팩토리에 연결 안 됨

4. **멀티테넌트 미설계**
   - `orders/products/claims` 테이블에 `userId` 없음

---

## 목표 구조

```
클라이언트(Next.js UI)
        ↓
Fastify 서버 (포트 4000)
  routes/
    orders/     ← GET /api/orders?channelId=xxx
    products/   ← GET /api/products?channelId=xxx
    claims/     ← GET /api/claims?channelId=xxx
    shipping/   ← PATCH /api/shipping/:channelId/:orderId
    inventory/  ← GET/PUT /api/inventory/:channelId/:itemCode
    channels/   ← 채널 자격증명 CRUD (현재와 동일)
    auth/       ← 현재와 동일
  adapters/
    base/IChannelAdapter.ts  ← @oms/types에 이미 정의됨
    qoo10/Qoo10Adapter.ts    ← 현재 존재
    shopify/ShopifyAdapter.ts ← 현재 존재, 팩토리 연결 필요
    shopee/ShopeeAdapter.ts   ← 현재 존재, 팩토리 연결 필요
    rakuten/RakutenAdapter.ts ← 신규 작성 필요
    [새채널]/[채널]Adapter.ts ← 앞으로 여기만 추가
```

**새 채널 추가 시 건드리는 파일:**
1. `adapters/새채널/어댑터.ts` 작성
2. `ChannelService.getAdapter()` 케이스 1줄 추가
3. DB enum에 채널 타입 추가 (migration 1개)
4. 끝 — 라우트 파일 무변경

---

## 단계별 계획

---

### Phase 0 — 멀티테넌트 스키마 추가 (DB 마이그레이션)

> 나중에 고치면 데이터 마이그레이션 비용이 큼. 지금 해야 함.

**변경 파일:** `apps/server/src/db/schema.ts`

```typescript
// orders 테이블에 userId 추가
userId: uuid('user_id').references(() => users.id),

// products 테이블에 userId 추가
userId: uuid('user_id').references(() => users.id),

// claims 테이블에 userId 추가
userId: uuid('user_id').references(() => users.id),
```

**작업:**
- [ ] schema.ts에 userId 컬럼 추가 (nullable로 시작, 기존 데이터 호환)
- [ ] `bun drizzle-kit generate` → migration 파일 생성
- [ ] `bun drizzle-kit migrate` 실행
- [ ] orderRoutes, productRoutes, claimRoutes에서 userId 필터 적용

---

### Phase 1 — ChannelService.getAdapter() 완성

> 현재 Qoo10만 동작. Shopify/Shopee는 어댑터 파일만 있고 팩토리 연결 안 됨.

**변경 파일:** `apps/server/src/services/ChannelService.ts`

```typescript
async getAdapter(channelId: string): Promise<IChannelAdapter> {
  const channel = await this.getChannel(channelId);
  if (!channel) throw new Error(`Channel not found: ${channelId}`);

  const decrypted = await this.getDecryptedCredential(channelId);

  switch (channel.channelType) {
    case 'QOO10_JP': {
      const { Qoo10Adapter } = await import('../adapters/qoo10/Qoo10Adapter');
      const cred = JSON.parse(decrypted) as { certificationKey: string };
      return new Qoo10Adapter(channelId, cred.certificationKey);
    }
    case 'SHOPIFY': {
      const { ShopifyAdapter } = await import('../adapters/shopify/ShopifyAdapter');
      const cred = JSON.parse(decrypted) as { shopDomain: string; accessToken: string };
      return new ShopifyAdapter(channelId, cred.shopDomain, cred.accessToken);
    }
    case 'SHOPEE': {
      const { ShopeeAdapter } = await import('../adapters/shopee/ShopeeAdapter');
      const cred = JSON.parse(decrypted) as { partnerId: string; partnerKey: string; shopId: string; accessToken: string };
      return new ShopeeAdapter(channelId, cred);
    }
    case 'RAKUTEN': {
      const { RakutenAdapter } = await import('../adapters/rakuten/RakutenAdapter');
      const cred = JSON.parse(decrypted) as { serviceSecret: string; licenseKey: string; shopUrl: string };
      return new RakutenAdapter(channelId, cred);
    }
    default:
      throw new Error(`Unsupported channel type: ${channel.channelType}`);
  }
}
```

**작업:**
- [ ] `getAdapter()`에 Shopify 케이스 추가
- [ ] `getAdapter()`에 Shopee 케이스 추가
- [ ] `getAdapter()`에 Rakuten 케이스 추가
- [ ] ShopifyAdapter가 `IChannelAdapter` 인터페이스 구현 확인/보완
- [ ] ShopeeAdapter가 `IChannelAdapter` 인터페이스 구현 확인/보완
- [ ] RakutenAdapter 신규 작성 (현재 파일 없음)

---

### Phase 2 — Shopify 어댑터 → Fastify 라우트 연결

> ShopifyAdapter 구현 확인 후 기존 도메인 라우트(orders/products)에 흡수

**현재 Next.js Shopify 라우트 목록:**

| Next.js 라우트 | 이동 대상 Fastify 라우트 | 비고 |
|---|---|---|
| `GET /api/shopify/orders` | `GET /api/orders?channelId=` | 통합 |
| `GET /api/shopify/orders/[id]` | `GET /api/orders/:channelId/:orderId` | 통합 |
| `POST /api/shopify/orders/[id]/cancel` | `POST /api/orders/:channelId/:orderId/cancel` | 신규 라우트 |
| `POST /api/shopify/orders/[id]/fulfill` | `PATCH /api/orders/:channelId/:orderId/shipment` | 통합 |
| `POST /api/shopify/orders/[id]/note` | `PATCH /api/orders/:channelId/:orderId/note` | 신규 라우트 |
| `GET /api/shopify/orders/stats` | `GET /api/orders/stats?channelId=` | 신규 라우트 |
| `GET /api/shopify/products` | `GET /api/products?channelId=` | 통합 |
| `GET /api/shopify/products/[id]` | `GET /api/products/:channelId/:itemCode` | 통합 |
| `POST /api/shopify/products/register` | `POST /api/products/:channelId` | 신규 라우트 |
| `PUT /api/shopify/products/update` | `PUT /api/products/:channelId/:itemCode` | 신규 라우트 |
| `POST /api/shopify/products/status` | `PATCH /api/products/:channelId/:itemCode/status` | 신규 라우트 |
| `GET /api/shopify/inventory` | `GET /api/inventory?channelId=` | 신규 라우트 |
| `POST /api/shopify/inventory/adjust` | `POST /api/inventory/:channelId/adjust` | 신규 라우트 |
| `GET /api/shopify/returns` | `GET /api/returns?channelId=` | 신규 라우트 |
| `POST /api/shopify/returns/[id]/approve` | `POST /api/returns/:channelId/:returnId/approve` | 신규 라우트 |
| `POST /api/shopify/returns/[id]/decline` | `POST /api/returns/:channelId/:returnId/decline` | 신규 라우트 |
| `POST /api/shopify/returns/[id]/refund` | `POST /api/returns/:channelId/:returnId/refund` | 신규 라우트 |
| `GET /api/shopify/returns/stats` | `GET /api/returns/stats?channelId=` | 신규 라우트 |
| `GET /api/shopify/auth/install` | **Next.js 유지** | OAuth redirect URL은 public이어야 함 |
| `GET /api/shopify/auth/callback` | **Next.js 유지** | 동일 |
| `POST /api/shopify/auth/refresh` | **Next.js 유지** | 동일 |
| `POST /api/shopify/seed` | 제거 (개발 전용) | |

**신규 Fastify 라우트 파일:**
- `apps/server/src/routes/inventory/index.ts`
- `apps/server/src/routes/returns/index.ts`

**작업:**
- [ ] ShopifyAdapter 현재 구현 확인 (`getOrders`, `getProducts` 등 IChannelAdapter 충족 여부)
- [ ] IChannelAdapter에 `cancelOrder`, `getReturns`, `approveReturn` 등 optional 메서드 추가
- [ ] `routes/orders/index.ts`에 cancel/note 엔드포인트 추가
- [ ] `routes/inventory/index.ts` 신규 작성
- [ ] `routes/returns/index.ts` 신규 작성
- [ ] `index.ts`에 신규 라우트 등록
- [ ] Next.js Shopify 라우트 파일 제거 (auth 3개 제외)

---

### Phase 3 — Shopee 어댑터 → Fastify 라우트 연결

**현재 Next.js Shopee 라우트 목록:**

| Next.js 라우트 | 이동 대상 Fastify 라우트 |
|---|---|
| `GET /api/shopee/products` | `GET /api/products?channelId=` |
| `GET /api/shopee/products/[itemId]` | `GET /api/products/:channelId/:itemCode` |
| `POST /api/shopee/products/register` | `POST /api/products/:channelId` |
| `POST /api/shopee/products/unlist` | `PATCH /api/products/:channelId/:itemCode/status` |

**작업:**
- [ ] ShopeeAdapter 현재 구현 확인 (IChannelAdapter 충족 여부)
- [ ] 미구현 메서드 보완
- [ ] Next.js Shopee 라우트 파일 제거

---

### Phase 4 — Rakuten 어댑터 작성 → Fastify 연결

**현재 Next.js Rakuten 라우트:**

| Next.js 라우트 | 이동 대상 Fastify 라우트 |
|---|---|
| `GET /api/rakuten/orders` | `GET /api/orders?channelId=` |

**작업:**
- [ ] `adapters/rakuten/RakutenAdapter.ts` 신규 작성
- [ ] IChannelAdapter 필수 메서드 구현
- [ ] Next.js Rakuten 라우트 파일 제거

---

### Phase 5 — Qoo10 Next.js 라우트 정리

> Fastify qoo10/index.ts에 이미 이전 완료. Next.js 라우트가 중복 존재.

**제거 대상 (Fastify에 이미 있음):**
- `apps/web/app/api/qoo10/` 전체 폴더

**주의:** 제거 전 클라이언트 코드에서 `/api/qoo10/*` 직접 호출 여부 확인 필요.

**작업:**
- [ ] `apps/web/src/` 전체에서 `/api/qoo10/` 호출 경로 grep
- [ ] Fastify 엔드포인트 경로로 교체
- [ ] `apps/web/app/api/qoo10/` 폴더 제거

---

### Phase 6 — IChannelAdapter 확장 (optional 메서드)

> 채널마다 지원 범위가 다름. 공통 인터페이스에 optional로 선언.

**변경 파일:** `packages/types/src/index.ts`

```typescript
export interface IChannelAdapter {
  // 필수 (모든 채널)
  validateCredential(): Promise<boolean>;
  getOrders(params: GetOrdersParams): Promise<Order[]>;
  getOrderDetail(orderId: string): Promise<Order>;
  getProducts(params: GetProductsParams): Promise<Product[]>;
  getProductDetail(itemCode: string): Promise<Product>;

  // 선택 (채널별 지원 여부 다름)
  getClaims?(params: GetClaimsParams): Promise<Claim[]>;
  updateShipment?(data: UpdateShipmentData): Promise<void>;
  cancelOrder?(orderId: string): Promise<void>;
  updateOrderNote?(orderId: string, note: string): Promise<void>;
  updateProduct?(itemCode: string, data: UpdateProductData): Promise<void>;
  registerProduct?(data: unknown): Promise<string>;
  updateProductStatus?(itemCode: string, status: ProductStatus): Promise<void>;
  getInventory?(itemCode: string): Promise<unknown>;
  adjustInventory?(params: unknown): Promise<void>;
  getReturns?(params: unknown): Promise<unknown[]>;
  approveReturn?(returnId: string): Promise<void>;
  declineReturn?(returnId: string, reason: string): Promise<void>;
  refundReturn?(returnId: string): Promise<void>;
}
```

**라우트에서 optional 메서드 사용 패턴:**
```typescript
app.post('/orders/:channelId/:orderId/cancel', async (req, reply) => {
  const adapter = await svc.getAdapter(req.params.channelId);
  if (!adapter.cancelOrder) {
    return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 주문 취소를 지원하지 않습니다.' });
  }
  await adapter.cancelOrder(req.params.orderId);
  return { ok: true };
});
```

**작업:**
- [ ] IChannelAdapter에 optional 메서드 추가
- [ ] 각 어댑터에서 지원 메서드만 구현

---

### Phase 7 — Next.js 클라이언트 호출 경로 일원화

> Next.js 클라이언트가 현재 `/api/shopify/*`, `/api/qoo10/*` 등 채널별 경로로 직접 호출.
> Fastify 이전 완료 후 도메인 중심 경로로 교체.

**변경 패턴:**
```typescript
// Before
fetch('/api/shopify/orders')
fetch('/api/qoo10/shipping', { method: 'POST' })

// After
fetch(`${FASTIFY_URL}/api/orders?channelId=${channelId}`)
fetch(`${FASTIFY_URL}/api/orders/${channelId}/${orderId}/shipment`, { method: 'PATCH' })
```

**작업:**
- [ ] `apps/web/src/` 전체 채널별 API 호출 경로 grep
- [ ] TanStack Query 훅 / fetch 유틸 경로 교체
- [ ] Next.js `NEXT_PUBLIC_API_URL` 환경변수를 Fastify URL로 통일

---

## 새 채널 추가 체크리스트 (완성 후 기준)

새 채널(예: Amazon) 추가 시 할 일:

```
[ ] 1. packages/types/src/index.ts — ChannelType에 'AMAZON' 추가
[ ] 2. apps/server/src/db/schema.ts — channelTypeEnum에 'AMAZON' 추가
[ ] 3. drizzle-kit generate & migrate
[ ] 4. apps/server/src/adapters/amazon/AmazonAdapter.ts 작성
[ ] 5. apps/server/src/services/ChannelService.ts — getAdapter() switch에 케이스 추가
[ ] 6. apps/server/src/routes/channels/index.ts — upsertAmazon 엔드포인트 추가
[ ] 7. apps/web — 채널 설정 UI 추가
```

라우트 파일(orders/products/claims 등)은 건드리지 않음.

---

## 진행 현황

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 0 | 멀티테넌트 스키마 (userId 추가) | ✅ 완료 |
| Phase 1 | ChannelService.getAdapter() 완성 | ✅ 완료 |
| Phase 2 | Shopify → Fastify 이전 | ✅ 완료 (클라이언트 이미 Fastify 호출, Next.js 라우트 제거됨) |
| Phase 3 | Shopee → Fastify 이전 | ✅ 완료 (ShopeeAdapter IChannelAdapter 준수, 클라이언트 Fastify 호출) |
| Phase 4 | Rakuten 어댑터 작성 + 이전 | ✅ 완료 (RakutenAdapter IChannelAdapter 준수, 클라이언트 Fastify 호출) |
| Phase 5 | Qoo10 Next.js 라우트 제거 | ✅ 완료 (app/api/qoo10/ 폴더 없음, 클라이언트는 Fastify /qoo10/* 호출) |
| Phase 6 | IChannelAdapter optional 확장 | ✅ 완료 (이미 optional 메서드 구조로 정의됨) |
| Phase 7 | Next.js 클라이언트 경로 일원화 | ✅ 완료 (채널별 /api/shopify|shopee|rakuten|qoo10 직접 호출 없음) |

---

## 참고 파일 경로

| 파일 | 설명 |
|---|---|
| `apps/server/src/index.ts` | Fastify 엔트리포인트, 라우트 등록 |
| `apps/server/src/db/schema.ts` | Drizzle 스키마 |
| `apps/server/src/services/ChannelService.ts` | 어댑터 팩토리 + 크리덴셜 CRUD |
| `apps/server/src/adapters/qoo10/Qoo10Adapter.ts` | Qoo10 구현 (기준 참고용) |
| `apps/server/src/adapters/shopify/ShopifyAdapter.ts` | Shopify 구현 (Phase 2 시작점) |
| `apps/server/src/adapters/shopee/ShopeeAdapter.ts` | Shopee 구현 (Phase 3 시작점) |
| `apps/server/src/routes/orders/index.ts` | 현재 orders 라우트 |
| `apps/server/src/routes/products/index.ts` | 현재 products 라우트 |
| `apps/server/src/routes/claims/index.ts` | 현재 claims 라우트 |
| `packages/types/src/index.ts` | IChannelAdapter 인터페이스 + 공통 타입 |
| `apps/web/app/api/shopify/` | 제거 예정 (auth 3개 제외) |
| `apps/web/app/api/shopee/` | 제거 예정 |
| `apps/web/app/api/rakuten/` | 제거 예정 |
| `apps/web/app/api/qoo10/` | 제거 예정 |
