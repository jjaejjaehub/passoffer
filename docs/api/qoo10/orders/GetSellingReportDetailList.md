# GetSellingReportDetailList — 판매대금정산조회 주문정보 API

## 메타

- **메서드명**: `GetSellingReportDetailList`
- **서비스**: `ShippingBasic` (배송/취소 정보 조회)
- **클래스**: `ShippingBasic` (`GMKT.INC.Front.QAPIBiz.Shipping.ShippingBasic`)
- **m_no / c_no**: 15095 / 10013
- **그룹**: 배송/취소/문의 관리
- **원본 크롤링 파일**: `_raw/15095_info.json`, `_raw/15095_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

판매내역을 조회하기 위한 메서드입니다.

## 시그니처

```csharp
XmlDocument GetSellingReportDetailList(string SearchCondition, string Search_Sdate, string Search_Edate, string CartNo, string Currency)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `SearchCondition` | String | Y | 1 | 검색조건<br> 구매자결제일 : 1 , 발송일 : 2 | 1 |
| `Search_Sdate` | String | Y | 0 | 기간(시작일) 2019-01-01 (yyyy-MM-dd), 2019-01-01 15:30:00 (yyyy-MM-dd HH:mm:ss) | 2019-01-01 |
| `Search_Edate` | String | Y | 0 | 기간(종료일) 2019-01-01 (yyyy-MM-dd), 2019-01-01 15:30:00 (yyyy-MM-dd HH:mm:ss) | 2019-01-01  |
| `CartNo` | String | N | Max 50 | 장바구니 번호 | 110000000 |
| `Currency` | String | Y | 3 | JPY | JPY |

## 응답 필드 (Output)

> 본 메서드는 `StdResult`가 아닌 **`XmlDocument` 단일 객체**를 반환한다. 다른 메서드와 동일한 `ResultObject` / `ResultCode` 래퍼가 없음.

| 필드 | 타입 | 설명 |
|---|---|---|
| _(reply body)_ | XmlDocument | 판매내역 상세 XML 도큐먼트 (내부 스키마는 명세서 미공개 — 실제 응답으로 확인) |

## 성공 판정

- HTTP 200 AND `XmlDocument` 파싱 성공
- 다른 메서드와 달리 `ResultCode` 필드가 없으므로, 에러 응답은 HTTP status / XML 루트 노드명으로 판단해야 함

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 응답이 **XML 단일 객체** — JSON 파서로 처리 불가. C# `XmlDocument`/Node `fast-xml-parser` 등으로 별도 처리.
- 동일 그룹의 `GetSellingReportDeliveryFeeDetailList` (15096), `GetSellingReportDiscountFeeDetailList` (15097)도 같은 패턴.
- `SearchCondition` 1=구매자결제일 / 2=발송일 — 정산 기준에 따라 선택.
- 내부 스키마(필드명/계층)는 사용자 명세서에 미공개 — 실제 호출 응답으로 매핑 확정 후 본 문서에 누적.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
