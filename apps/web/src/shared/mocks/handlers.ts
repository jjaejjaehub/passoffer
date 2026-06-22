import { http, HttpResponse } from "msw";
import type { Order, Product } from "@oms/types";

// ─── 공통 테스트 채널 UUID ─────────────────────────────────────
export const TEST_CHANNEL_UUID = "test-channel-uuid-shopify";

// ─── Fastify 주문 목록 ────────────────────────────────────────
const mockOrder: Order = {
  id: "order-1",
  channelId: TEST_CHANNEL_UUID,
  channelOrderId: "#1001",
  status: "PAID",
  buyer: {
    name: "홍길동",
    email: "test@example.com",
    tel: "010-1234-5678",
  },
  shipping: {
    receiver: "홍길동",
    shippingAddress: "서울 강남구 테헤란로 1",
  },
  payment: {
    currency: "KRW",
    totalAmount: 50000,
    krwAmount: 50000,
    originalAmount: 50000,
    paymentMethod: "card",
  },
  items: [
    {
      id: "item-1",
      productName: "테스트 상품",
      quantity: 1,
      unitPrice: 50000,
      totalPrice: 50000,
    },
  ],
  orderedAt: "2024-01-15T00:00:00Z",
  updatedAt: "2024-01-15T01:00:00Z",
};

export const shopifyOrderHandlers = [
  http.get("/api/orders", () => {
    return HttpResponse.json([mockOrder]);
  }),
];

// ─── Fastify 상품 목록 ────────────────────────────────────────
const mockProduct: Product = {
  id: "product-1",
  channelId: TEST_CHANNEL_UUID,
  sellerCode: "SELLER-001",
  title: "테스트 상품",
  promotionName: "테스트 상품",
  status: "active",
  price: 50000,
  settlePrice: 45000,
  retailPrice: 55000,
  qty: 100,
  imageUrl: "",
  category: {
    main: { code: "1", name: "카테고리" },
    sub1: { code: "1-1", name: "서브카테고리" },
    sub2: { code: "1-1-1", name: "서브서브카테고리" },
  },
  origin: { type: "국내", place: "한국" },
  shippingNo: "SHIP-001",
  availableDate: { type: "normal", value: "3" },
  desiredShippingDate: "",
  keyword: [],
  isAdult: false,
  itemDetail: "",
  videoUrl: "",
  modelNm: "",
  manufacturerDate: "",
  brandNo: "",
  material: "",
  industrialCodeType: "",
  industrialCode: "",
  taxRate: "0",
  listedDate: "",
  changedDate: "",
  expireDate: "",
  drugtype: "",
  optionShippingNo1: "",
  optionShippingNo2: "",
  contactInfo: "",
};

export const shopifyProductHandlers = [
  http.get("/api/products", () => {
    return HttpResponse.json([mockProduct]);
  }),
];

// ─── Fastify 반품 목록 ────────────────────────────────────────
export const shopifyReturnHandlers = [
  http.get(`/api/orders/${TEST_CHANNEL_UUID}/returns`, () => {
    return HttpResponse.json([]);
  }),
];

// ─── Qoo10 주문 목록 ─────────────────────────────────────────
export const qoo10OrderHandlers = [
  http.post("/api/qoo10/shipping", () => {
    return HttpResponse.json({
      ResultCode: 0,
      ResultMsg: "OK",
      ResultObject: [],
    });
  }),
];

// ─── 채널 인증 ───────────────────────────────────────────────
export const channelHandlers = [
  http.get("/api/channels/shopify/credential", () => {
    return HttpResponse.json({
      shopDomain: "test.myshopify.com",
      clientId: "test-client-id",
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expireAt: Math.floor(Date.now() / 1000) + 3600,
    });
  }),

  http.get("/api/channels/qoo10/credential", () => {
    return HttpResponse.json({
      channelId: "qoo10",
      status: "active",
      certificationKey: "test-cert-key",
      sellerId: "test-seller",
    });
  }),
];

export const handlers = [
  ...shopifyOrderHandlers,
  ...shopifyProductHandlers,
  ...shopifyReturnHandlers,
  ...qoo10OrderHandlers,
  ...channelHandlers,
];
