# 마스터 상품 페이지 기획서

> 목적: 한 상품을 한 번 등록하면 Qoo10/Shopify(현재 연결됨), Shopee/Rakuten(추후 연결 예정)에 모두 등록 가능하도록 한다.
>
> **작성 원칙**: 모든 입력값은 실제 플랫폼 API에 존재하는 필드만 사용한다. 가공/추측 필드를 추가하지 않는다.
>
> **레퍼런스**:
> - Qoo10: `/Users/bag-yeongjae/workspace/shopee-crwal/qoo10-md/001_상품등록.md` (`ItemsBasic.SetNewGoods` v1.1)
> - Shopify: Shopify MCP의 `productCreate` / `productVariantsBulkCreate` mutation 스펙
> - 기존 단일 플랫폼 등록 폼 UI: `apps/web/src/pages/product-new/ui/{Qoo10ProductNewForm, ShopifyProductNewForm}.tsx`

---

## 1. 현재 구현 상태 (∼80% 구축됨)

스펙 작성자가 새 기능을 만드는 것이 아니라 **기존 구현을 확장**한다는 점에 주의.

### 이미 존재하는 것

| 영역 | 위치 | 상태 |
|---|---|---|
| DB 스키마 | `apps/server/src/db/schema.ts` (`masterProducts`, `masterProductVariants`, `listedProducts`) | ✅ 완료 — `attributes jsonb`, `images jsonb`, `tags jsonb`로 확장 가능 |
| 엔티티 타입 | `apps/web/src/entities/master-product/model/types.ts` | ✅ 완료 |
| API 훅 | `apps/web/src/entities/master-product/api/{masterProductQueries,masterProductMutations}.ts` | ✅ 완료 |
| 폼 페이지 | `apps/web/src/pages/master-products/ui/MasterProductFormPage.tsx` (826줄) | ✅ 골격 완료 |
| 리스트 페이지 | `apps/web/src/pages/master-products/ui/MasterProductsPage.tsx` (515줄) | ✅ 완료 |
| 플랫폼 정의 | `apps/web/src/shared/config/platformFields.ts` | ⚠️ **부분 완료 — 본 스펙으로 확장 필요** |
| 채널 연결 상태 | `apps/web/src/shared/lib/useChannelApiKey.ts` | ✅ 완료 |
| Qoo10 어댑터 | `apps/server/src/adapters/qoo10/Qoo10Adapter.ts` | ✅ 존재 |
| Shopify 어댑터 | (없음) | ❌ **신규 작성 필요** |
| 발행 모달 | `apps/web/src/features/list-to-channel/ListToChannelModal.tsx` | ✅ 완료 |

### 핵심 아키텍처

- **Flat-key 상태 패턴**: 폼은 `Record<string, string>` 형태로 `"qoo10.SecondSubCat"` 같은 점-구분 키를 보관 → 저장 시 `buildAttributes()`로 nested `attributes.qoo10.SecondSubCat`로 변환.
- **공통 필드 + 플랫폼별 필드**: 공통은 `master_products` 컬럼에 직접 저장, 플랫폼별은 `attributes` jsonb에 저장.
- **Variant**: `master_product_variants` 테이블에 `optionName/optionValue/sku/price/stock` 행으로 저장. Qoo10 `ItemType` 조합형 / Shopify `ProductVariantsBulkInput`으로 매핑.
- **`apiAvailable` 플래그**: false인 플랫폼(Shopee, Rakuten)은 마스터 상품 폼에 노출하지 않는다.
- **채널 연결 필터**: `useChannelApiKey(channelId).hasKey === true`인 플랫폼만 폼에 노출.

---

## 2. 데이터 모델

### 공통 필드 (master_products 테이블 컬럼)

```ts
{
  code: string;             // 내부 상품 코드 (max 64)
  title: string;            // 원본 상품명 (max 255)
  brand?: string;           // (max 128)
  hsCode?: string;          // 통관 (max 20)
  countryOfOrigin?: string; // (max 64)
  material?: string;        // (max 256)
  weightG?: number;         // 무게 (g)
  retailPrice?: string;     // numeric(12,2)
  descriptionHtml?: string; // HTML (text)
  images: Array<{ url: string; altText?: string; order?: number }>; // jsonb
  tags: string[];                      // jsonb
  attributes: Record<string, unknown>; // jsonb — 플랫폼별 메타
}
```

### Variants (master_product_variants)

```ts
{
  sku: string;          // (max 128)
  optionName?: string;  // 예 "색상" (max 128)
  optionValue?: string; // 예 "빨강" (max 128)
  price?: string;       // numeric(12,2)
  stock: number;        // default 0
  extraAttributes: Record<string, unknown>; // 변형별 확장
}
```

> 옵션 1개 (예 "색상")만 지원하는 현재 구조에서, 다축 옵션(예 색상×사이즈)은 `optionName="색상/사이즈"`, `optionValue="빨강/S"` 슬래시 결합으로 표현하거나 → 추후 `optionAxes jsonb` 컬럼 추가 검토. **본 스펙은 현재 구조 유지.**

---

## 3. UI 구조

기존 `MasterProductFormPage.tsx`의 Accordion 패턴을 유지한다.

```
┌─ 헤더 (마스터 상품 등록/수정)
├─ ① 기본 정보 (공통 필드)
│   ├─ 상품 코드 (code) *
│   ├─ 상품명 (title) *
│   ├─ 브랜드 (brand)
│   ├─ HS 코드 (hsCode)
│   ├─ 원산지 (countryOfOrigin)
│   ├─ 소재 (material)
│   ├─ 무게 g (weightG)
│   ├─ 권장 소비자가 (retailPrice)
│   ├─ 태그 (tags, comma)
│   └─ 상품 설명 HTML (descriptionHtml) — RichHtmlEditor
├─ ② 이미지 (images)
│   └─ ImageRow[] { url, altText }
├─ ③ 변형/옵션 (variants) — 옵션 사용 시
│   └─ Table { sku, optionName, optionValue, price, stock }
└─ ④ 플랫폼별 추가 정보 (Accordion)
    ├─ [✓ 등록 가능 / ✗ 필수값 미입력] Qoo10 — apiAvailable && hasKey
    ├─ [✓ 등록 가능 / ✗ 필수값 미입력] Shopify — apiAvailable && hasKey
    └─ (Shopee/Rakuten은 apiAvailable: false → 미노출)
```

각 플랫폼 Accordion 내부는 단일 등록 폼(`Qoo10ProductNewForm`, `ShopifyProductNewForm`)의 섹션 구성을 그대로 따른다.

---

## 4. Qoo10 플랫폼 필드 (실제 API: `ItemsBasic.SetNewGoods` v1.1)

> 출처: `001_상품등록.md`. 모든 필드는 `qoo10.{ApiFieldName}` 키로 `attributes`에 저장.

### 4-1. 카테고리 (필수)

| key | label | type | required | 설명 |
|---|---|---|---|---|
| `qoo10.SecondSubCat` | 카테고리 (소분류) | text | ✅ | Qoo10 카테고리 9자리 코드. **UI는 mainCat → midCat → subCat 캐스케이딩 셀렉트**(기존 `Qoo10ProductNewForm` 패턴 차용). 최종 저장은 `SecondSubCat`만. |
| `qoo10.OuterSecondSubCat` | 일본 외 카테고리 | text | ❌ | 글로벌 노출용 (max 9) |

### 4-2. 기본 정보

| key | label | type | required | maxLen | 비고 |
|---|---|---|---|---|---|
| `qoo10.ItemTitle` | 상품명 (Qoo10용) | text | ✅ | 100 | 공통 `title`과 다를 경우 별도 입력. 미입력 시 공통 `title` 사용. |
| `qoo10.PromotionName` | 프로모션 명 | text | ❌ | 20 | |
| `qoo10.SellerCode` | 판매자 상품 코드 | text | ❌ | 100 | (현재 plat-fields의 50은 잘못됨) |
| `qoo10.AdultYN` | 성인 상품 여부 | select | ❌ | — | `Y` / `N` (default `N`) |
| `qoo10.BrandNo` | 브랜드 번호 | text | ❌ | — | Qoo10 브랜드 검색 API로 자동완성 (기존 `Qoo10ProductNewForm` 패턴). 미사용 시 NoBrandInput 체크박스로 NO_BRAND 처리. |

### 4-3. 가격·재고

| key | label | type | required | 비고 |
|---|---|---|---|---|
| `qoo10.ItemPrice` | 판매가 (JPY) | number | ✅ | Decimal |
| `qoo10.RetailPrice` | 시중 정가 (JPY) | number | ❌ | Decimal — 공통 `retailPrice`와 별개 가능 |
| `qoo10.TaxRate` | 세율 | select | ❌ | `S`/`10`/`8`/`0` (default `S`=표준) |
| `qoo10.ItemQty` | 초기 재고 수량 | number | ✅ | Int32 — 옵션 미사용 상품용. 옵션 사용 시 ItemType 조합 필요. |
| `qoo10.ExpireDate` | 판매 종료일 | text(date) | ❌ | YYYY-MM-DD. 미입력 시 1년 후 자동 |

### 4-4. 이미지·미디어

| key | label | type | required | 비고 |
|---|---|---|---|---|
| `qoo10.StandardImage` | 대표 이미지 URL | text | ❌ | URL max 200. **미입력 시 공통 `images[0].url` 사용** |
| `qoo10.VideoURL` | 동영상 URL | text | ❌ | URL max 200 |
| `qoo10.ItemDescription` | 상품 상세 (HTML) | textarea | ❌ | HTML 2GB. **미입력 시 공통 `descriptionHtml` 사용** |

### 4-5. 배송·재고일

| key | label | type | required | 비고 |
|---|---|---|---|---|
| `qoo10.ShippingNo` | 배송 템플릿 번호 | number | ❌ | Int32 |
| `qoo10.AvailableDateType` | 배송 가능 유형 | select | ✅ | `0`=즉시 / `1`=날짜지정 / `2`=영업일 / `3`=품절 |
| `qoo10.AvailableDateValue` | 배송 가능 값 | text | 조건부* | max 10. *`AvailableDateType`이 1·2일 때 필수 (UI에서 동적 required) |

### 4-6. 원산지

| key | label | type | required | 비고 |
|---|---|---|---|---|
| `qoo10.ProductionPlaceType` | 원산지 유형 | select | ❌ | `1`=일본 국내 / `2`=해외 / `3`=기타 |
| `qoo10.ProductionPlace` | 원산지 상세 | text/select | 조건부 | max 50. type=1이면 일본 도도부현 드롭다운, 2이면 국가 드롭다운, 3이면 자유입력 (기존 `Qoo10ProductNewForm` 참고) |

### 4-7. 추가 정보 (Accordion 안에 Accordion)

| key | label | type | required | 비고 |
|---|---|---|---|---|
| `qoo10.ModelNM` | 모델명 | text | ❌ | max 30 |
| `qoo10.ManufactureDate` | 제조일 | text(date) | ❌ | YYYY-MM-DD |
| `qoo10.Material` | 소재 (Qoo10용) | text | ❌ | max 500. 미입력 시 공통 `material` 사용 |
| `qoo10.Weight` | 무게 kg | number | ❌ | Decimal max 30. 공통 `weightG`(g) → kg 자동 변환 가능 |
| `qoo10.ContactInfo` | 문의처 | text | ❌ | max 100 |
| `qoo10.IndustrialCodeType` | 산업 코드 유형 | select | ❌ | `J`/`K`/`I`/`U`/`E`/`H` |
| `qoo10.IndustrialCode` | 산업 코드 | text | ❌ | max 13 |
| `qoo10.Drugtype` | 의약품 유형 | text | ❌ | (의약품 카테고리 한정) |
| `qoo10.Keyword` | 검색 키워드 | text | ❌ | 콤마 구분, 최대 10개 |

### 4-8. 옵션 (변형)

Qoo10은 옵션을 별도 필드 `ItemType` (조합형) 또는 `AdditionalOption` (추가 구성)으로 받는다. 마스터 상품 변형(`master_product_variants`) 행이 1개 초과면 **자동으로 ItemType 조합형 페이로드 생성**:

```
ItemType = "옵션명1||*옵션값1A$$옵션값1B$$...||*옵션명2||*옵션값2A$$..."
```

- 변형 행의 `optionName`/`optionValue`를 그대로 매핑.
- 변형별 `price` → 옵션 추가가, `stock` → 옵션 재고.
- UI는 ④ 변형 섹션에서 통합 관리 (Qoo10 전용 입력칸 별도 신설 X).

---

## 5. Shopify 플랫폼 필드 (실제 API: `productCreate` + `productVariantsBulkCreate`)

> 출처: Shopify MCP `learn_shopify_api(api: 'admin')` → 2025-10 stable. 모든 필드는 `shopify.{InputFieldName}` 키.

### 5-1. ProductCreateInput

| key | label | type | required | 비고 |
|---|---|---|---|---|
| `shopify.title` | 상품명 (Shopify용) | text | ❌ | 미입력 시 공통 `title` 사용 |
| `shopify.descriptionHtml` | 상품 설명 HTML | textarea | ❌ | 미입력 시 공통 `descriptionHtml` 사용 |
| `shopify.vendor` | 공급업체(Vendor) | text | ❌ | max 255 |
| `shopify.productType` | 상품 유형 | text | ❌ | max 255 |
| `shopify.tags` | 태그 | text(comma) | ❌ | 미입력 시 공통 `tags` 사용 |
| `shopify.status` | 상품 상태 | select | ✅ | `DRAFT` / `ACTIVE` / `ARCHIVED` (default `DRAFT`) |
| `shopify.handle` | URL 핸들 | text | ❌ | URL slug |
| `shopify.seo.title` | SEO 제목 | text | ❌ | `SEOInput.title` |
| `shopify.seo.description` | SEO 설명 | text | ❌ | `SEOInput.description` |
| `shopify.giftCard` | 기프트카드 여부 | checkbox | ❌ | boolean |
| `shopify.requiresSellingPlan` | 구독 전용 | checkbox | ❌ | boolean |

### 5-2. CreateMediaInput (이미지 매핑)

- 공통 `images[]` → Shopify `media[]`로 자동 매핑:
  ```ts
  media: images.map(img => ({
    originalSource: img.url,
    alt: img.altText,
    mediaContentType: 'IMAGE',
  }))
  ```
- 별도 입력 UI 없음 (공통 이미지 그대로 사용).

### 5-3. Options + Variants

Shopify는 `productOptions` 배열과 `ProductVariantsBulkInput` 배열을 함께 받는다. **마스터 상품 변형 → Shopify variants 자동 매핑**:

- 변형 행이 1개이거나 `optionName`/`optionValue`가 비어있으면: `productOptions` 생성 안 함, 단일 variant 생성.
- 변형 행 다수면: `optionName` 유니크 집합 → `productOptions` (최대 3개), 각 변형 행 → variant.

| key | label | type | required | 비고 |
|---|---|---|---|---|
| `shopify.variantDefaults.compareAtPrice` | 비교 가격 (할인 전 원가) | number | ❌ | 단일 variant일 때만. 다축 시 변형별 입력은 추후 |
| `shopify.variantDefaults.barcode` | 바코드 | text | ❌ | EAN/UPC. max 255 |
| `shopify.variantDefaults.inventoryPolicy` | 재고 정책 | select | ❌ | `DENY` / `CONTINUE` (default `DENY`) |
| `shopify.variantDefaults.taxable` | 과세 대상 | checkbox | ❌ | boolean (default true) |
| `shopify.variantDefaults.requiresShipping` | 배송 필요 | checkbox | ❌ | boolean (default true) |
| `shopify.variantDefaults.weightUnit` | 무게 단위 | select | ❌ | `GRAMS`/`KILOGRAMS`/`OUNCES`/`POUNDS` (default `GRAMS`). 공통 `weightG`와 결합 |

> 변형별 `sku`/`price`/`stock`은 공통 변형 테이블에서 직접 매핑. Shopify variant input의 `inventoryQuantities`는 location ID 필요 → **MVP에선 첫 번째 location 자동 할당** (서버 어댑터에서 `locations.first` 조회).

### 5-4. Shopify에서 사용하지 않는 필드 (제거)

현재 `platformFields.ts`에 있는 다음 항목은 **단일 variant 내장 필드와 중복**되므로 폼에 별도 노출하지 않는다:
- `shopify.price` → 변형 테이블의 `price` 사용
- `shopify.inventoryQuantity` → 변형 테이블의 `stock` 사용

---

## 6. Shopee / Rakuten

`apiAvailable: false` 유지. **마스터 상품 폼에서 완전히 숨김.** 어댑터 구현 후 본 스펙에 섹션 추가.

---

## 7. 저장·발행 플로우

1. **저장 (Save)**: 마스터 상품과 변형만 DB에 기록. 채널 발행은 안 함.
   - `POST /api/master-products` → `masterProducts` + `masterProductVariants` insert
   - `attributes`에는 사용자가 입력한 플랫폼별 필드만 nested로 저장
2. **발행 (List to Channel)**: 기존 `ListToChannelModal`에서 채널 선택 후 어댑터 호출.
   - Qoo10: `Qoo10Adapter.createProduct(masterProduct, variants)` → `ItemsBasic.SetNewGoods` 호출
   - Shopify: **`ShopifyAdapter` 신규 작성** → `productCreate` + (옵션 있으면) `productVariantsBulkCreate`
   - 성공 시 `listed_products` row 생성, `channelItemCode`/`channelData` 저장.

---

## 8. 어댑터 매핑 의사코드

### Qoo10

```ts
// apps/server/src/adapters/qoo10/Qoo10Adapter.ts (확장)
const attrs = master.attributes.qoo10 ?? {};
const payload = {
  SellerAuthKey: cred.certificationKey,
  SecondSubCat: attrs.SecondSubCat,
  ItemTitle: attrs.ItemTitle ?? master.title,
  ItemPrice: attrs.ItemPrice,
  ItemQty: variants.length === 1 ? Number(attrs.ItemQty ?? variants[0].stock) : 0,
  AvailableDateType: attrs.AvailableDateType,
  AvailableDateValue: attrs.AvailableDateValue ?? '',
  StandardImage: attrs.StandardImage ?? master.images[0]?.url,
  ItemDescription: attrs.ItemDescription ?? master.descriptionHtml,
  Weight: attrs.Weight ?? (master.weightG ? master.weightG / 1000 : undefined),
  Material: attrs.Material ?? master.material,
  ProductionPlaceType: attrs.ProductionPlaceType,
  ProductionPlace: attrs.ProductionPlace,
  // ...옵셔널 필드 전부 spread
  ItemType: variants.length > 1 ? buildQoo10ItemType(variants) : undefined,
};
```

### Shopify

```ts
// apps/server/src/adapters/shopify/ShopifyAdapter.ts (신규)
const attrs = master.attributes.shopify ?? {};
const product = await graphql(PRODUCT_CREATE, {
  product: {
    title: attrs.title ?? master.title,
    descriptionHtml: attrs.descriptionHtml ?? master.descriptionHtml,
    vendor: attrs.vendor,
    productType: attrs.productType,
    status: attrs.status ?? 'DRAFT',
    tags: master.tags,
    handle: attrs.handle,
    seo: attrs.seo,
    productOptions: buildShopifyOptions(variants),
  },
  media: master.images.map(img => ({
    originalSource: img.url, alt: img.altText, mediaContentType: 'IMAGE',
  })),
});

if (variants.length > 0) {
  await graphql(PRODUCT_VARIANTS_BULK_CREATE, {
    productId: product.id,
    variants: variants.map(v => ({
      optionValues: parseOptionValues(v.optionName, v.optionValue),
      price: v.price,
      sku: v.sku,
      barcode: attrs.variantDefaults?.barcode,
      inventoryPolicy: attrs.variantDefaults?.inventoryPolicy ?? 'DENY',
      inventoryQuantities: [{ locationId: defaultLocationId, availableQuantity: v.stock }],
    })),
  });
}
```

---

## 9. `platformFields.ts` 갭 분석 (현재 → 본 스펙)

### Qoo10 추가 필요

`OuterSecondSubCat`, `PromotionName`, `AdultYN`, `BrandNo`, `RetailPrice`, `TaxRate`, `ExpireDate`, `StandardImage`, `VideoURL`, `ItemDescription`, `ProductionPlaceType`, `ProductionPlace`, `ModelNM`, `ManufactureDate`, `Material`, `Weight`, `ContactInfo`, `IndustrialCodeType`, `IndustrialCode`, `Drugtype`, `Keyword`

### Qoo10 수정 필요

- `SellerCode.maxLength`: 50 → **100** (실제 API 스펙)

### Shopify 추가 필요

`title`, `descriptionHtml`, `tags`, `handle`, `seo.title`, `seo.description`, `giftCard`, `requiresSellingPlan`, `variantDefaults.compareAtPrice`, `variantDefaults.barcode`, `variantDefaults.inventoryPolicy`, `variantDefaults.taxable`, `variantDefaults.requiresShipping`, `variantDefaults.weightUnit`

### Shopify 제거 필요

- `shopify.price` → variant 테이블 사용
- `shopify.inventoryQuantity` → variant 테이블 사용
- `shopify.compareAtPrice` → `shopify.variantDefaults.compareAtPrice`로 이동
- `shopify.barcode` → `shopify.variantDefaults.barcode`로 이동

---

## 10. 구현 작업 분할 (Sonnet에게)

### Phase 1: 데이터 정의 갱신
- [ ] `apps/web/src/shared/config/platformFields.ts` — Qoo10/Shopify 필드 본 스펙대로 확장
- [ ] `requiredCommonFields` 검증: Qoo10는 `["title","weightG","descriptionHtml"]` (이미지는 StandardImage가 있으면 OK라 공통 이미지 미요구) — 실제 정책에 맞게 조정

### Phase 2: 폼 UI 확장
- [ ] `MasterProductFormPage.tsx`의 플랫폼 Accordion 내부를 **섹션 그룹**으로 재구성 (4-1∼4-8, 5-1∼5-3 섹션 헤더)
- [ ] 조건부 required: `qoo10.AvailableDateValue`는 `qoo10.AvailableDateType ∈ {1,2}`일 때만
- [ ] 캐스케이딩 셀렉트: Qoo10 카테고리 (mainCat → midCat → SecondSubCat) — 기존 `Qoo10ProductNewForm` 컴포넌트 재사용 또는 분리
- [ ] 브랜드 검색: Qoo10 BrandNo autocomplete — 기존 패턴 차용
- [ ] RichHtmlEditor: `qoo10.ItemDescription`, `shopify.descriptionHtml`에 사용

### Phase 3: 어댑터
- [ ] `Qoo10Adapter`: 마스터 상품 → `ItemsBasic.SetNewGoods` 매핑 (8-Qoo10 의사코드)
- [ ] `ShopifyAdapter` (신규): `productCreate` + `productVariantsBulkCreate` (8-Shopify 의사코드)
- [ ] 둘 다 fallback 로직: 플랫폼 필드 비었으면 공통 필드 사용

### Phase 4: 검증·발행
- [ ] `ListToChannelModal`에서 어댑터 호출 시 응답 → `listed_products` insert
- [ ] 실패 시 `syncStatus: 'FAILED'` + 에러 토스트

---

## 11. 비고: 절대 추가하면 안 되는 필드

다음은 흔히 추가되지만 **실제 API에 없는** 필드 — 절대 만들지 말 것:

- ❌ Qoo10에 "할인율" 단독 필드 (실제로는 `RetailPrice`와 `ItemPrice` 차이로 표현)
- ❌ Shopify에 "category" 텍스트 (실제로는 `category` ID 별도 mutation 필요 — MVP 미포함)
- ❌ "재고 알림" / "품절 처리" 등 UI 보조 필드 (Qoo10 `AvailableDateType=3`으로 표현)
- ❌ 양 플랫폼 모두 "할인 시작/종료일" — 별도 promotion API 영역. 본 스펙은 createProduct만 다룬다.

신규 필드 추가가 필요할 땐 반드시:
1. Qoo10 → `001_상품등록.md` 또는 동일 폴더의 다른 .md 확인
2. Shopify → MCP `search_docs_chunks` 또는 `validate_graphql_codeblocks`로 스키마 확인
3. 두 곳 모두에서 발견되지 않으면 **추가하지 않는다**.
