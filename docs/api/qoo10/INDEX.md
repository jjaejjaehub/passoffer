# Qoo10 API 인덱스

> Qoo10 API 작업 시 **이 파일을 먼저 읽고**, 작업할 엔드포인트의 .md만 추가로 로드합니다.
> 전체 .md를 한 번에 읽지 마세요 — 컨텍스트가 폭주합니다.

## 기본 정보

- **호스트**: `https://api.qoo10.jp` (www.qoo10.jp는 404)
- **인증**: ApiKey (헤더) + 채널별 SellerId
- **요청 포맷**: form-urlencoded 또는 JSON (엔드포인트별 상이 — 각 .md의 "요청 형식" 확인)
- **응답 포맷**: JSON. 성공 판정은 `ResultCode === 0` (HTTP 200이어도 ResultCode가 음수면 실패)
- **공통 주의사항**: [common/conventions.md](./common/conventions.md)

## 명세서 수록 여부

- 사용자가 직접 정리한 명세서 `Qoo10_QSM_API_명세서.md` (49개 메서드 수록)를 기준으로 각 메서드의 "명세서 수록" 여부를 표시합니다.
- ✅ **수록 (49)**: 사용자 명세서 기반으로 결정론적 변환 완료. 요청/응답/Result Codes 모두 검증됨.
- ⚠️ **미수록 (16)**: 사용자 명세서에 본 메서드 없음. 본 문서는 크롤링 원본 기반이며 결정론적 검증 불가. 작업 시 실제 API 응답으로 추가 검증 필요.

## 도구

- 원본 메타 크롤링: `bun scripts/api-docs/crawlers/qoo10-list.ts` → `_raw/_seller_methods.json` (전체 65개)
- 개별 메서드 크롤링: `bun scripts/api-docs/crawlers/qoo10.ts <m_no...> | --all-seller [--skip-existing]`
- 원본 → .md 변환: `bun scripts/api-docs/transformers/qoo10.ts <m_no...> | --all-seller [--force]`
- 쿠키 만료 시 `.env.local`의 `QOO10_DEV_COOKIE` 갱신 (developer.qoo10.jp DevTools → Copy as cURL → -b 값)

## 엔드포인트 (65) — 수록 49 / 미수록 16

### 상품 관리 (items/) — 39 (수록 32 / 미수록 7)

| m_no | 메서드 | 용도 | ver | 명세서 | 파일 |
|---|---|---|---|---|---|
| 10004 | GetGoodsOptionInfo | 옵션정보 조회 |  | ✅ | [items/GetGoodsOptionInfo.md](./items/GetGoodsOptionInfo.md) |
| 10005 | GetGoodsInventoryInfo | 재고정보 조회 |  | ✅ | [items/GetGoodsInventoryInfo.md](./items/GetGoodsInventoryInfo.md) |
| 10006 | GetSellerDeliveryGroupInfo | 배송비 정보 조회 |  | ✅ | [items/GetSellerDeliveryGroupInfo.md](./items/GetSellerDeliveryGroupInfo.md) |
| 10007 | GetItemDetailInfo | 상품 상세 정보 조회 | 1.2 | ✅ | [items/GetItemDetailInfo.md](./items/GetItemDetailInfo.md) |
| 10008 | GetAllGoodsInfo | 전체상품 조회 |  | ✅ | [items/GetAllGoodsInfo.md](./items/GetAllGoodsInfo.md) |
| 10009 | SetNewGoods | 상품 등록 | 1.1 | ✅ | [items/SetNewGoods.md](./items/SetNewGoods.md) |
| 10010 | UpdateGoods | 상품 편집 | 1.1 | ✅ | [items/UpdateGoods.md](./items/UpdateGoods.md) |
| 10012 | SetGoodsSubDeliveryGroup | 복수 배송비 설정 |  | ✅ | [items/SetGoodsSubDeliveryGroup.md](./items/SetGoodsSubDeliveryGroup.md) |
| 10013 | EditGoodsStatus | 거래상태 변경 |  | ✅ | [items/EditGoodsStatus.md](./items/EditGoodsStatus.md) |
| 10014 | EditItemCondition | 상품 상태(새/중고) 변경 |  | ✅ | [items/EditItemCondition.md](./items/EditItemCondition.md) |
| 10016 | EditGoodsOption | 단일형 옵션 수정 |  | ✅ | [items/EditGoodsOption.md](./items/EditGoodsOption.md) |
| 10017 | EditGoodsTextOption | 텍스트 옵션 수정 |  | ✅ | [items/EditGoodsTextOption.md](./items/EditGoodsTextOption.md) |
| 10018 | EditGoodsInventory | 옵션정보 수정 |  | ✅ | [items/EditGoodsInventory.md](./items/EditGoodsInventory.md) |
| 10019 | DeleteInventoryDataUnit | 조합형 옵션 개별 삭제 |  | ✅ | [items/DeleteInventoryDataUnit.md](./items/DeleteInventoryDataUnit.md) |
| 10020 | InsertInventoryDataUnit | 조합형 옵션 개별 등록 |  | ✅ | [items/InsertInventoryDataUnit.md](./items/InsertInventoryDataUnit.md) |
| 10021 | UpdateInventoryDataUnit | 조합형 옵션 개별 수정 |  | ✅ | [items/UpdateInventoryDataUnit.md](./items/UpdateInventoryDataUnit.md) |
| 10022 | UpdateInventoryQtyUnit | 조합형 옵션 개별 수량 수정 |  | ✅ | [items/UpdateInventoryQtyUnit.md](./items/UpdateInventoryQtyUnit.md) |
| 10023 | UpdateInventoryQtyPlusUnit | 조합형 옵션 수량 가감 |  | ✅ | [items/UpdateInventoryQtyPlusUnit.md](./items/UpdateInventoryQtyPlusUnit.md) |
| 10024 | SetGoodsPriceQty | 가격/재고/판매종료일 수정 |  | ✅ | [items/SetGoodsPriceQty.md](./items/SetGoodsPriceQty.md) |
| 10025 | UpdateItemDiscount | 기본할인 수정 |  | ✅ | [items/UpdateItemDiscount.md](./items/UpdateItemDiscount.md) |
| 10026 | EditGoodsOrderLimit | 구매수량제한 수정 |  | ✅ | [items/EditGoodsOrderLimit.md](./items/EditGoodsOrderLimit.md) |
| 10027 | EditGoodsContents | 상품상세 컨텐츠 수정 |  | ✅ | [items/EditGoodsContents.md](./items/EditGoodsContents.md) |
| 10028 | EditGoodsImage | 메인 이미지 수정 | 1.1 | ✅ | [items/EditGoodsImage.md](./items/EditGoodsImage.md) |
| 10029 | EditGoodsMultiImage | 멀티 이미지 수정 |  | ✅ | [items/EditGoodsMultiImage.md](./items/EditGoodsMultiImage.md) |
| 10030 | EditGoodsHeaderFooter | 상세 헤더/푸터 수정 |  | ✅ | [items/EditGoodsHeaderFooter.md](./items/EditGoodsHeaderFooter.md) |
| 10040 | RequestFileDownload | 정보 다운로드 요청 |  | ✅ | [items/RequestFileDownload.md](./items/RequestFileDownload.md) |
| 15236 | InsertInventoryDataBulk | 재고 정보 등록 (대량) |  | ✅ | [items/InsertInventoryDataBulk.md](./items/InsertInventoryDataBulk.md) |
| 15237 | UpdateInventoryDataBulk | 재고 정보 수정 (대량) |  | ✅ | [items/UpdateInventoryDataBulk.md](./items/UpdateInventoryDataBulk.md) |
| 15238 | SetGoodsPriceQtyBulk | 가격/재고/판매종료일 수정 (대량) |  | ✅ | [items/SetGoodsPriceQtyBulk.md](./items/SetGoodsPriceQtyBulk.md) |
| 15757 | SetNewMoveGoods | MOVE 상품등록 |  | ⚠️ | [items/SetNewMoveGoods.md](./items/SetNewMoveGoods.md) |
| 15758 | UpdateMoveGoods | MOVE 상품 편집 |  | ⚠️ | [items/UpdateMoveGoods.md](./items/UpdateMoveGoods.md) |
| 15759 | EditMoveGoodsPrice | MOVE 가격 설정 |  | ⚠️ | [items/EditMoveGoodsPrice.md](./items/EditMoveGoodsPrice.md) |
| 15761 | GetMoveItemDetailInfo | MOVE 상품 상세 조회 |  | ⚠️ | [items/GetMoveItemDetailInfo.md](./items/GetMoveItemDetailInfo.md) |
| 15762 | EditMoveGoodsInventory | MOVE 옵션정보 수정 |  | ⚠️ | [items/EditMoveGoodsInventory.md](./items/EditMoveGoodsInventory.md) |
| 15763 | EditCommonGoodsInventory | 옵션정보 수정 (공통) |  | ✅ | [items/EditCommonGoodsInventory.md](./items/EditCommonGoodsInventory.md) |
| 15764 | EditMoveGoodsStatus | MOVE 거래상태 변경 |  | ⚠️ | [items/EditMoveGoodsStatus.md](./items/EditMoveGoodsStatus.md) |
| 15765 | UpdateMoveItemDiscount | MOVE 기본할인 수정 |  | ⚠️ | [items/UpdateMoveItemDiscount.md](./items/UpdateMoveItemDiscount.md) |
| 15783 | EditAdditionalOptionImage | 상품 추가구성 이미지 수정 |  | ✅ | [items/EditAdditionalOptionImage.md](./items/EditAdditionalOptionImage.md) |
| 15784 | EditInventoryImage | 상품 옵션 이미지 수정 |  | ✅ | [items/EditInventoryImage.md](./items/EditInventoryImage.md) |

### 배송/취소/문의 관리 (orders/) — 19 (수록 15 / 미수록 4)

| m_no | 메서드 | 용도 | ver | 명세서 | 파일 |
|---|---|---|---|---|---|
| 10042 | SetSendingInfo | 발송확인 (D3) |  | ✅ | [orders/SetSendingInfo.md](./orders/SetSendingInfo.md) |
| 10050 | SetSellerCheckYN_V2 | 발주확인 상태 변경 |  | ✅ | [orders/SetSellerCheckYN_V2.md](./orders/SetSellerCheckYN_V2.md) |
| 10055 | GetInquiryMessage | 판매자 문의 조회 |  | ✅ | [orders/GetInquiryMessage.md](./orders/GetInquiryMessage.md) |
| 10056 | SetInquiryMessage | 문의 처리 |  | ✅ | [orders/SetInquiryMessage.md](./orders/SetInquiryMessage.md) |
| 10059 | SetCancelProcess | 주문 번호로 취소 |  | ✅ | [orders/SetCancelProcess.md](./orders/SetCancelProcess.md) |
| 10060 | SetClaimAccept | 교환 승인 |  | ✅ | [orders/SetClaimAccept.md](./orders/SetClaimAccept.md) |
| 10061 | SetClaimRedelivery | 교환 재배송 |  | ✅ | [orders/SetClaimRedelivery.md](./orders/SetClaimRedelivery.md) |
| 10062 | SetDPCSendingConfirm | DPC 출고 연동 |  | ⚠️ | [orders/SetDPCSendingConfirm.md](./orders/SetDPCSendingConfirm.md) |
| 10064 | SetQwmsCargoStat | QWMS 화물 배송상태 업데이트 |  | ⚠️ | [orders/SetQwmsCargoStat.md](./orders/SetQwmsCargoStat.md) |
| 10068 | GetQxpressTranscomCustomsDuty | QXPress 관세금 등록 데이터 조회 |  | ⚠️ | [orders/GetQxpressTranscomCustomsDuty.md](./orders/GetQxpressTranscomCustomsDuty.md) |
| 10069 | SetQxpressTranscomCustomsDuty | QXPress 관세금 데이터 관리 |  | ⚠️ | [orders/SetQxpressTranscomCustomsDuty.md](./orders/SetQxpressTranscomCustomsDuty.md) |
| 15095 | GetSellingReportDetailList | 판매대금정산 주문정보 |  | ✅ | [orders/GetSellingReportDetailList.md](./orders/GetSellingReportDetailList.md) |
| 15096 | GetSellingReportDeliveryFeeDetailList | 판매대금정산 배송비 |  | ✅ | [orders/GetSellingReportDeliveryFeeDetailList.md](./orders/GetSellingReportDeliveryFeeDetailList.md) |
| 15097 | GetSellingReportDiscountFeeDetailList | 판매대금정산 장바구니할인 |  | ✅ | [orders/GetSellingReportDiscountFeeDetailList.md](./orders/GetSellingReportDiscountFeeDetailList.md) |
| 15475 | GetClaimInfo_V3 | 클레임 조회 (미수취 포함) |  | ✅ | [orders/GetClaimInfo_V3.md](./orders/GetClaimInfo_V3.md) |
| 15477 | GetShippingAndClaimInfoByOrderNo_V2 | 단일 주문 배송/클레임 조회 |  | ✅ | [orders/GetShippingAndClaimInfoByOrderNo_V2.md](./orders/GetShippingAndClaimInfoByOrderNo_V2.md) |
| 15766 | GetShippingInfo_v3 | 배송상태 조회 v3 |  | ✅ | [orders/GetShippingInfo_v3.md](./orders/GetShippingInfo_v3.md) |
| 15772 | SetSellerCheckYNBulk | 발주확인 상태 변경 (대량) |  | ✅ | [orders/SetSellerCheckYNBulk.md](./orders/SetSellerCheckYNBulk.md) |
| 15773 | SetSendingInfoBulk | 발송확인 (대량) |  | ✅ | [orders/SetSendingInfoBulk.md](./orders/SetSendingInfoBulk.md) |

### 공통 조회 (common/) — 3 (수록 2 / 미수록 1)

| m_no | 메서드 | 용도 | 명세서 | 파일 |
|---|---|---|---|---|
| 10037 | GetCatagoryListAll | 카테고리 조회 | ✅ | [common/GetCatagoryListAll.md](./common/GetCatagoryListAll.md) |
| 10038 | SearchMaker | 제조사 검색 | ⚠️ | [common/SearchMaker.md](./common/SearchMaker.md) |
| 10039 | SearchBrand | 브랜드 검색 | ✅ | [common/SearchBrand.md](./common/SearchBrand.md) |

### E-Ticket 관리 (etickets/) — 2 (미수록 2)

| m_no | 메서드 | 용도 | 명세서 | 파일 |
|---|---|---|---|---|
| 10035 | CouponAuthByOuterTicketNo | 쿠폰 인증 (외부 쿠폰번호) | ⚠️ | [etickets/CouponAuthByOuterTicketNo.md](./etickets/CouponAuthByOuterTicketNo.md) |
| 10036 | CouponCancelByOuterTicketNo | 쿠폰 취소 (외부 쿠폰번호) | ⚠️ | [etickets/CouponCancelByOuterTicketNo.md](./etickets/CouponCancelByOuterTicketNo.md) |

### Logistics 전용 (logistics/) — 1 (미수록 1)

| m_no | 메서드 | 용도 | 명세서 | 파일 |
|---|---|---|---|---|
| 15776 | GetShippingInfo_Logistics | 배송상태 조회 (Logistics) | ⚠️ | [logistics/GetShippingInfo_Logistics.md](./logistics/GetShippingInfo_Logistics.md) |

### 판매자 인증 (auth/) — 1 (미수록 1)

| m_no | 메서드 | 용도 | 명세서 | 파일 |
|---|---|---|---|---|
| 10041 | CreateCertificationKey | 판매자 인증키 생성 | ⚠️ | [auth/CreateCertificationKey.md](./auth/CreateCertificationKey.md) |

## 작업 흐름

1. 위 표에서 작업할 엔드포인트의 .md 경로 확인
2. 해당 .md만 Read (INDEX 외 다른 엔드포인트 .md는 로드 금지)
3. ⚠️ 미수록 메서드는 결정론적 검증이 안 되어 있으므로, 실제 API 응답을 받아 보고 .md를 보강할 것
4. 작업 중 새로 발견한 주의사항은 해당 엔드포인트 .md의 "작업 시 주의사항" 섹션에 누적
5. 공통 규칙은 [common/conventions.md](./common/conventions.md)에 추가

## 원본 보관

- 크롤링 원본 JSON은 `_raw/` 디렉토리에 보관 (refine 시 비교용)
- `_raw`는 LLM에게 노출하지 않음 — refine된 .md만 컨텍스트에 로드
- 원본 갱신 절차: `qoo10-list.ts`로 메서드 목록 → `qoo10.ts --all-seller --skip-existing`로 누락분 수집 → `transformers/qoo10.ts --all-seller --force`로 .md 재생성
