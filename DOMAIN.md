# PassOffer OMS 도메인 문서

> Qoo10·Shopify·Shopee 멀티채널 주문 관리 시스템(OMS) 도메인 분석 문서

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [아키텍처](#2-아키텍처)
3. [도메인 목록](#3-도메인-목록)
4. [도메인 상세](#4-도메인-상세)
   - [4.1 주문 (Order)](#41-주문-order)
   - [4.2 상품 (Product)](#42-상품-product)
   - [4.3 아이템 (Item)](#43-아이템-item)
   - [4.4 채널 (Channel)](#44-채널-channel)
   - [4.5 클레임 (Claim)](#45-클레임-claim)
   - [4.6 카테고리 / 브랜드](#46-카테고리--브랜드)
5. [도메인 관계도](#5-도메인-관계도)
6. [API 엔드포인트](#6-api-엔드포인트)
7. [비즈니스 규칙](#7-비즈니스-규칙)
8. [에러 처리](#8-에러-처리)

---

## 1. 시스템 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | PassOffer / my-oms |
| 목적 | Qoo10·Shopify·Shopee 이커머스 채널의 주문·상품·클레임 통합 관리 |
| 현재 연동 채널 | Qoo10 (라이브), Shopify (라이브), Shopee (구현 중), Rakuten·Amazon (예정) |
| 프레임워크 | Next.js 16 (App Router) + TypeScript 5 (strict) |
| UI | Chakra UI v3 |
| 상태관리 | TanStack React Query v5 |
| 폼 검증 | React Hook Form v7 + Zod v4 |

---

## 2. 아키텍처

FSD(Feature-Sliced Design) 레이어 구조를 채택합니다.

```
app/           → Next.js App Router 라우팅 (re-export만)
src/
├── pages/     → 페이지 컴포넌트 (라우트 별 진입점)
├── widgets/   → 복합 UI 컴포넌트 (테이블, 패널 등)
├── features/  → 기능별 비즈니스 로직 (필터, 편집 등)
├── entities/  → 도메인 엔티티 + 쿼리/뮤테이션
└── shared/    → 공통 유틸, HTTP 클라이언트, 상수
```

**의존 방향:** `app → pages → widgets → features → entities → shared`

모든 외부 API 호출은 `app/api/qoo10/*` 내부 프록시를 통해 이루어집니다.

---

## 3. 도메인 목록

| 도메인 | 설명 | 채널 | 상태 |
|--------|------|------|------|
| Order | 주문·배송 정보 | Qoo10·Shopify | 구현 완료 |
| Return | 반품 처리 | Shopify | 구현 완료 |
| Product | 상품 등록·수정 | Qoo10·Shopify·Shopee | 구현 완료 |
| Item | 아이템(SKU) 상태·옵션 관리 | Qoo10 | 구현 완료 |
| Inventory | 재고 관리 | Qoo10·Shopify | 구현 완료 |
| Claim | 취소·반품·교환 처리 | Qoo10 | 구현 완료 |
| Channel | 채널 API 키 관리 | 전체 | 구현 완료 |
| Category | 카테고리 계층 | Qoo10 | 구현 완료 |
| Brand | 브랜드 목록 | Qoo10 | 구현 완료 |

---

## 4. 도메인 상세

### 4.1 주문 (Order)

#### 엔티티 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 내부 주문 식별자 |
| `channelId` | ChannelId | 채널 구분 (qoo10 등) |
| `channelOrderId` | string | 채널의 주문번호 |
| `packNo` | number | Qoo10 팩 번호 |
| `status` | OrderStatus | 내부 주문 상태 |
| `shippingStatusLabel` | string | 채널 원본 상태 문자열 |
| `buyerName / Kana / Phone / Email` | string | 구매자 연락처 |
| `shippingAddress` | string | 배송지 주소 |
| `items` | OrderItem[] | 주문 상품 목록 |
| `currency` | "KRW" \| "JPY" \| "USD" | 결제 통화 |
| `originalAmount / krwAmount / totalAmount` | number | 금액 정보 |
| `paymentMethod / paymentDate` | string | 결제 수단·일시 |
| `shipDate / estimatedShippingDate` | string | 출고·예상 배송일 |
| `carrierId / trackingNumber` | CarrierId \| string | 택배사·송장번호 |
| `claimStatus` | string | 클레임 상태 |
| `requestDate / cancelRefundDate` | string | 클레임 일자 |

#### OrderItem 타입

```typescript
interface OrderItem {
  id: string;
  productName: string;
  option?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
```

#### 주문 상태 흐름

```
신규 → 처리중 → 배송준비 → 배송중 → 완료
                    ↓
                  취소 / 반품
```

#### Qoo10 배송 상태 코드 매핑

| Qoo10 코드 | 의미 |
|-----------|------|
| 0, 1 | 배송 대기 |
| 2 | 배송 요청됨 |
| 3 | 배송 준비 중 |
| 4 | 배송 중 |
| 5 | 배송 완료 |

---

### 4.2 상품 (Product)

#### 엔티티 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 상품 ID |
| `sellerCode` | string | 셀러 코드 |
| `title` | string | 상품명 (최대 100자) |
| `status` | ProductStatus | 상품 거래 상태 |
| `price / settlePrice / retailPrice` | number | 판매가 / 정산가 / 소비자가 |
| `qty` | number | 재고 수량 |
| `imageUrl` | string | 대표 이미지 URL |
| `category` | {main, sub1, sub2} | 3단계 카테고리 |
| `origin` | {type, place} | 원산지 |
| `shippingNo` | string | 배송 템플릿 번호 |
| `availableDate` | {type, value} | 판매 가능 일자 유형·값 |
| `keyword` | string[] | 검색 키워드 |
| `isAdult` | boolean | 성인 상품 여부 |
| `itemDetail` | string | 상세 설명 (HTML) |
| `videoUrl` | string | 동영상 URL |
| `brandNo` | string | 브랜드 ID |
| `material` | string | 소재 |
| `industrialCode` | string | 공산품 코드 |
| `taxRate` | "S" \| "10" \| "8" \| "0" | 세율 구분 |

#### 판매 가능 일자 유형 (AvailableDateType)

| 값 | 의미 |
|----|------|
| "0" | 즉시 |
| "1" | 특정 날짜 |
| "2" | 입금 후 N일 |
| "3" | 미정 |

#### 옵션 구조

**인벤토리 옵션 (다축 조합)**
```typescript
interface InventoryOptionItem {
  Name1~5: string;   // 축 이름 (예: 색상, 사이즈)
  Value1~5: string;  // 축 값
  Price: number;
  Qty: number;
  ItemTypeCode: string;
}
```

**단순 옵션 (단축)**
```typescript
interface SimpleOptionItem {
  Name: string;
  Value: string;
  Price: number;
  OptionCode: string;
}
```

**옵션 축 상태 (편집 UI)**
```typescript
type OptionAxisState = {
  id: string;
  name: string;         // 축 이름
  values: string[];     // 값 목록
  _rawValues: string;   // 편집 중인 raw 입력값
};
```

#### 인벤토리 옵션 직렬화 포맷

```
Name1||*Value1||*Name2||*Value2||*Price||*Qty||*OptionCode$$Name1||*Value1||*...
```

---

### 4.3 아이템 (Item)

Product의 SKU 단위 개념. 하나의 Product는 여러 Item을 가질 수 있습니다.

#### 엔티티 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `itemCode` | string | 아이템 코드 (고유 키) |
| `sellerCode` | string | 셀러 코드 |
| `status` | ItemStatus | 거래 상태 |

#### 아이템 거래 상태

| 상태 | 설명 |
|------|------|
| 거래가능 | 정상 판매 중 |
| 거래대기 | 판매 대기 |
| 검수대기 | Qoo10 검수 중 |
| 거래중지 | 판매 중지 (셀러 조작 가능) |
| 거래제한 | 채널 제한 |
| 승인거부 | 채널 미승인 |

---

### 4.4 채널 (Channel)

#### 지원 채널

| 채널 | 상태 | 통화 | 지역 | 비고 |
|------|------|------|------|------|
| Qoo10 | 라이브 | KRW | 한국 | 주문·상품·클레임·배송 |
| Shopify | 라이브 | USD/다통화 | 글로벌 | 주문·상품·반품·재고·OAuth |
| Shopee | 구현 중 | SGD/다통화 | 동남아 | 상품·OAuth |
| Rakuten | 예정 | JPY | 일본 | - |
| Amazon | 예정 | USD | 미국 | - |

#### 채널 ChannelId 타입

```typescript
type ChannelId = "qoo10" | "shopify" | "shopee" | "rakuten" | "amazon";
```

**API 키 저장:** 서버(DB) 기반으로 저장. Shopify는 OAuth 2.0 플로우로 액세스 토큰 발급 후 서버에 저장. Qoo10은 CertKey를 서버 DB에 저장.

---

### 4.5 클레임 (Claim)

주문에 연결된 취소·반품·교환 요청을 관리합니다.

#### Qoo10 클레임 상태 코드

| 코드 | 의미 |
|------|------|
| 1 | 취소 요청 |
| 2 | 취소 처리 중 |
| 3 | 취소 완료 |
| 4 | 반품 요청 |
| 5 | 반품 처리 중 |
| 6 | 반품 완료 |
| 11~16 | 교환 / 환불 관련 |

#### 클레임 조회 파라미터

```typescript
interface Qoo10ClaimParams {
  ClaimStat?: string;         // 상태 코드
  search_Sdate: string;       // 시작일 (YYYYMMDD)
  search_Edate: string;       // 종료일
  search_condition?: string;  // 검색 조건
}
```

---

### 4.6 카테고리 / 브랜드

#### 카테고리 계층

```
대분류(main) → 중분류(mid) → 소분류(sub / SecondSubCat)
```
상품 등록 시 `SecondSubCat` (소분류 코드) 필수 입력.

#### 브랜드

- 브랜드 목록 API로 조회
- 상품에 `BrandNo` 연결
- 브랜드 없는 경우 `NoBrandInput` 텍스트 사용

---

## 5. 도메인 관계도

```
Channel (1) ──────────────────────────────────────────────────┐
                                                               │
                                                               ▼
Product (1) ──── (N) Item ──── (N) InventoryOption / SimpleOption
   │
   │  (N)
   ▼
Order (1) ──── (N) OrderItem
   │
   │  (0..N)
   ▼
Claim

Category (N) ──── (1) Product
Brand    (N) ──── (1) Product
```

- **Channel → Order/Product/Item**: 채널별로 주문·상품이 존재
- **Product → Item**: 상품(Product)은 다수의 SKU(Item)를 보유
- **Item → Option**: 아이템은 인벤토리 옵션 또는 단순 옵션을 보유
- **Order → OrderItem**: 주문은 복수의 주문 상품 포함
- **Order → Claim**: 주문에서 클레임 발생 (0~N)

---

## 6. API 엔드포인트

모든 API는 내부 프록시 경로(`app/api/qoo10/*`)를 통해 Qoo10 QAPI로 중계됩니다.
인증: `X-Qoo10-Cert-Key` 헤더 (localStorage에서 주입)

### 주문 / 배송

| 경로 | 메서드 | 기능 |
|------|--------|------|
| `/api/qoo10/shipping` | POST | 주문·배송 목록 조회 |
| `/api/qoo10/shipping/[orderNo]` | GET | 주문 상세 조회 |
| `/api/qoo10/claim` | POST | 클레임 목록 조회 |

**배송 조회 파라미터:**
```typescript
interface Qoo10ShippingParams {
  ShippingStatus?: "0" | "1" | "2" | "3" | "4" | "5" | "";
  SearchStartDate: string;    // YYYYMMDD
  SearchEndDate: string;      // YYYYMMDD (최대 90일 범위)
  SearchCondition?: "1" | "2" | "3" | "4"; // 주문일/결제일/출고일/배송완료일
}
```

### 상품 / 아이템

| 경로 | 메서드 | 기능 |
|------|--------|------|
| `/api/qoo10/products` | POST | 상품 목록 조회 |
| `/api/qoo10/products` | POST | 상품 신규 등록 |
| `/api/qoo10/items/[itemCode]` | GET | 아이템 상세 조회 |
| `/api/qoo10/items/update` | POST | 상품 정보 수정 |
| `/api/qoo10/items/[itemCode]/inventory` | POST | 인벤토리 옵션 저장 |
| `/api/qoo10/items/[itemCode]/options` | POST | 단순 옵션 저장 |
| `/api/qoo10/items/edit-image` | POST | 이미지·동영상 수정 |
| `/api/qoo10/items/edit-contents` | POST | 상세 설명 수정 |
| `/api/qoo10/items/edit-status` | POST | 거래 상태 변경 |

### 카테고리 / 브랜드

| 경로 | 메서드 | 기능 |
|------|--------|------|
| `/api/qoo10/categories` | GET | 카테고리 트리 조회 |
| `/api/qoo10/brands` | GET | 브랜드 목록 조회 |


### Shopify API (GraphQL 프록시)

인증: `X-Shopify-Shop-Domain`, `X-Shopify-Access-Token` 헤더 (서버에서 발급한 OAuth 토큰)

| 경로 | 메서드 | 기능 |
|------|--------|------|
| `/api/shopify/orders` | GET | 주문 목록 조회 (GraphQL) |
| `/api/shopify/orders/[id]` | GET | 주문 상세 조회 |
| `/api/shopify/orders/[id]/fulfill` | POST | 주문 발송 처리 |
| `/api/shopify/orders/[id]/cancel` | POST | 주문 취소 |
| `/api/shopify/orders/[id]/note` | PATCH | 주문 메모 수정 |
| `/api/shopify/orders/stats` | GET | 주문 통계 조회 |
| `/api/shopify/returns` | GET | 반품 목록 조회 |
| `/api/shopify/returns/stats` | GET | 반품 통계 (서버 집계) |
| `/api/shopify/returns/[id]/approve` | POST | 반품 승인 |
| `/api/shopify/returns/[id]/decline` | POST | 반품 거절 |
| `/api/shopify/returns/[id]/refund` | POST | 환불 처리 |
| `/api/shopify/products` | GET | 상품 목록 조회 |
| `/api/shopify/products/[id]` | GET | 상품 상세 조회 |
| `/api/shopify/products/register` | POST | 상품 등록 |
| `/api/shopify/products/update` | PUT | 상품 수정 |
| `/api/shopify/products/status` | POST | 상품 상태 변경 |
| `/api/shopify/inventory` | GET | 재고 조회 |
| `/api/shopify/inventory/adjust` | POST | 재고 조정 |
| `/api/shopify/auth/refresh` | POST | OAuth 토큰 갱신 |

### Shopee API

인증: `X-Shopee-Shop-Id`, `X-Shopee-Access-Token` 헤더

| 경로 | 메서드 | 기능 |
|------|--------|------|
| `/api/shopee/products` | GET | 상품 목록 조회 |
| `/api/shopee/products/[itemId]` | GET | 상품 상세 조회 |
| `/api/shopee/products/register` | POST | 상품 등록 |
| `/api/shopee/products/unlist` | POST | 상품 미노출 처리 |

### 공통 응답 형식

```typescript
interface Qoo10ApiResponse<T> {
  ResultObject: T;
  ResultCode: number;   // 0 = 성공
  ResultMsg: string;
}
```

---

---

## 6.5 서버(Fastify) vs 웹(Next.js API) 역할 분담

### 구조 개요

```
[브라우저]
    ↓ fetch
[Next.js App (apps/web)]  ← BFF (Backend for Frontend)
    app/api/*              ← 채널 API 프록시 (Shopify GraphQL, Qoo10 QAPI, Shopee API)
    ↓ REST (axios)
[Fastify 서버 (apps/server)]  ← 핵심 비즈니스 서버
    /api/auth/*            ← 사용자 인증 (JWT)
    /api/channels/*        ← 채널 자격증명 관리 (DB 저장)
    /api/orders/*          ← 주문 데이터 (미래: DB 캐싱)
```

### Fastify 서버 담당 (apps/server)

| 역할 | 설명 |
|------|------|
| 사용자 인증 | JWT 발급·검증, 로그인/회원가입 |
| 채널 자격증명 관리 | Qoo10 CertKey, Shopify OAuth 토큰, Shopee 키를 DB에 안전하게 저장 |
| Shopify OAuth | Access Token 발급·갱신 로직 |
| 채널 어댑터 | 채널별 API 추상화 (ShopifyAdapter, ShopeeAdapter, Qoo10Adapter) |
| DB 접근 | Drizzle ORM + PostgreSQL |

### Next.js API Route 담당 (apps/web/app/api/*)

| 역할 | 설명 |
|------|------|
| 채널 API 프록시 | Shopify GraphQL, Qoo10 QAPI, Shopee Open API 중계 |
| 인증 헤더 주입 | Fastify에서 가져온 자격증명을 채널 API 헤더로 변환 |
| 서버 집계 | 반품 통계 등 클라이언트에서 집계하기 무거운 작업 |
| BFF 로직 | 데이터 변환, 페이지네이션 추상화 |

### 설계 원칙

1. **민감 정보는 서버에** — API 키/토큰은 Fastify DB에 저장, 브라우저에는 노출 안 함
2. **채널 통신은 Next.js API Route에서** — CORS, 인증 헤더 처리를 서버 사이드에서
3. **비즈니스 로직은 Fastify에** — 채널 상태 관리, 사용자 권한 등 핵심 도메인

## 7. 비즈니스 규칙

### 주문 조회

- 조회 기간 최대 **90일**
- 기간 초과 시 Qoo10 에러 코드 `-10002` 반환
- KRW / JPY 이중 금액 추적 (환율 환산)

### 상품 등록

- 필수 필드: `SecondSubCat`, `ItemTitle`, `ItemPrice`, `ItemQty`, `AvailableDateType`, `AvailableDateValue`
- 상품명 최대 100자
- 성인 상품(`AdultYN: "Y"`)은 별도 검수 대상

### 옵션 관리 (인벤토리 옵션)

옵션 편집 UI 상태 모델:

```
displayItems = (cartesianProduct(axes) - deletedKeys + overrides) + manualRows
```

| 상태 | 설명 |
|------|------|
| `axes` | 옵션 축 정의 (이름 + 값 목록) |
| `deletedKeys` | 카테시안 곱에서 제외할 키 집합 |
| `manualRows` | 사용자가 직접 추가한 행 |
| `overrides` | 가격·수량·코드 오버라이드 맵 |

### 아이템 상태 전환

- 셀러가 직접 조작 가능: `거래가능 ↔ 거래중지`
- 채널 제한 상태(`거래제한`, `승인거부`)는 Qoo10 측 결정

---

## 8. 에러 처리

### Qoo10 에러 코드

| 코드 | 의미 |
|------|------|
| 0 | 성공 |
| -10000 | 인증 키 오류 |
| -10001 | 날짜 형식 오류 |
| -10002 | 조회 기간 90일 초과 |
| -10003 | 유효하지 않은 상태값 |
| -10004 | 상태·조건 불일치 |
| -90001 | API 미존재 |
| -90002 ~ -90003 | 권한 없음 |
| -90004 ~ -90005 | API 키 만료 |

### 내부 에러 분류

| 분류 | 발생 조건 |
|------|-----------|
| `NO_API_KEY` | localStorage에 Qoo10 인증키 없음 |
| `AUTH_ERROR` | 키 무효 또는 만료 |
| `NETWORK_ERROR` | 연결 실패 |
| `API_ERROR` | Qoo10 비즈니스 로직 에러 |
| `UNKNOWN` | 미분류 에러 |

---

*최종 업데이트: 2026-04-09*
