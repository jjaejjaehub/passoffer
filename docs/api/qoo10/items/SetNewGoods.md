# SetNewGoods — 상품 등록

## 메타

- **메서드명**: `SetNewGoods`
- **서비스**: `ItemsBasic` (상품 정보 등록 & 수정)
- **클래스**: `GoodsBasicBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsBasicBiz`)
- **m_no / c_no**: 10009 / 10004
- **그룹**: 상품 관리
- **버전**: 1.1
- **원본 크롤링 파일**: `_raw/10009_info.json`, `_raw/10009_params.json`
- **출처**: 사용자 명세서 `Qoo10_QSM_API_명세서.md` (2026-06)
- **최종 갱신**: 2026-06-11

## 설명

Qoo10에 새로운 상품을 등록하기 위한 API 메소드입니다.

## 시그니처

```csharp
StdCustomResult<GoodsResultModel> SetNewGoods(string SecondSubCat, string OuterSecondSubCat, string ManufactureNo, string BrandNo, string ItemTitle, string SellerCode, string IndustrialCode, string ProductionPlace, string AdultYN, string ContactTel, string StandardImage, string ItemDescription, string AdditionalOption, string ItemType, Decimal RetailPrice, Decimal ItemPrice, int ItemQty, string ExpireDate, int ShippingNo, string AvailableDateType, string AvailableDateValue)
```

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `SecondSubCat` | String | Y | 9 | 상품에 설정할 Qoo10 카테고리 코드입니다. *Qoo10 카테고리 코드는 "QSM>상품관리>상품 대량등록/수정"에서 다운로드할 수 있습니다.  | 300000001 |
| `OuterSecondSubCat` | String | N | Max 20 | 판매자가 사용하고 있는 외부 카테고리 코드입니다. | 10000001 |
| `Drugtype` | String | N | 2 | 의약품 카테고리 선택 시 필수로 입려해야합니다. (1C : 제1류 의약품, 2C : 제2류 의약품, 3C : 제3류 의약품, D2 : 지정제2류 의약품, QD : 의약외품) | 1C |
| `BrandNo` | String | N | Max 10 | Qoo10에 등록된 브랜드에 대한 코드입니다. 신규 브랜드 등록요청은 QSM>상품관리 페이지에서 신청할 수 있습니다.  | 100550 |
| `ItemTitle` | String | Y | Max 100 | 상품명 최대100자 | 니트 라운드넥 레드/블루 어린이용 |
| `PromotionName` | String | N | Max20 | 홍보용 상품명 | 오늘만 특가 1+1 |
| `SellerCode` | String | N | Max 100 | 판매자 상품코드: 판매자가 관리하는 상품번호입니다. 이 정보를 Key 값으로 추후 가격 등의 수정이 가능합니다. 최대 100자, 계정 내 중복 불가 | A12345b |
| `IndustrialCodeType` | String | N | 1 | 산업 코드 타입<br> J: JAN, K: KAN, I: ISBN, U: UPC, E: EAN, H: HS | J |
| `IndustrialCode` | String | N | 13 | 제품의 산업 코드입니다.  (JAN, ISBN…등) 표준코드를 입력하면 가격비교 사이트에 우선 노출될 수 있습니다. | TK-FBP019EBK |
| `ModelNM` | String | N | Max30 | 상품의 제품번호 등을 입력합니다. 최대30자 | CUH-7218BB01 |
| `ManufactureDate` | String | N | YYYY-MM-DD | 상품 제조일자(YYYY-MM-DD) | 2025-01-01 |
| `ProductionPlaceType` | String | N | 1 | 원산지 타입 (국내=1, 해외=2, 기타=3) 타입에 따라 원산지(ProductionPlace)에 입력 가능한 값이 다릅니다. | 1 |
| `ProductionPlace` | String | N | Max 50 | 상품의 원산지 정보(국가 또는 지역명) Type1: TOKYO *도도부현명을 로마자로 표기(대문자) Type2: KR ＊국가코드 Type3: 자유입력(50자까지) *영문숫자,특수기호, 한자,히라가나,가타카나 모두 가능 | TOKYO  |
| `Weight` | Decimal | N | Max5 | 상품 무게 *최대 2자리(숫자, 소수점 이하 1자리까지 가능), 최대 30kg | 1.2 |
| `Material` | String | N | Max500 | 상품의 소재 *최대500자까지 | 綿50%, ポリエステル50% |
| `AdultYN` | String | N | 1 | 성인용품여부: 성인 상품인 경우 Y, 성인 상품이 아닌 경우 N | N |
| `ContactInfo` | String | N | Max100 | 서비스 담당자 정보 | 電話番号: 090-0000-0000 / メールアドレス: xxx@xxx.xxx |
| `StandardImage` | String | N | Max 200 | 상품의 대표 이미지 상품 이미지 URL을 입력하시길 바랍니다. (ex. standardimage=http://image.qoo10.jo.img.jpg) | https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png |
| `VideoURL` | String | N | Max200 | 동영상 URL 최대200자 | https://www.youtube.com/watch?v=Zhl4N5vd7NE |
| `ItemDescription` | String | N | 2GB byte | 상품상세 상품페이지에 안내되는 상품설명입니다. HTML 형식으로 입력하시길 바랍니다. | <img src="https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png"> |
| `AdditionalOption` | String | N | Option name:Max 50, Detail : Max 50 | 추가 옵션 항목구분은 (\|\|*) 옵션추가는 ($$) 를 이용하시길 합니다. ex.   [Option Name 1]\|\|*[Option Detail]\|\|*[Price]$$[Option Name 2]\|\|*[Option Detail 2]\|\|*[Price]  예시: 마우스1의 가격이 100이고 마우스2의 가격이 200일 경우 (선택안할 수 있을 경우)  예시:[&addtionaloption=마우스\|\|*선택안함\|\|*0$$마우스\|\|*마우스1\|\|*100$$마우스\|\|*마우스2\|\|*200  | リフィル\|\|*選択しない\|\|*0\|\|*code01$$ リフィル\|\|*選択\|\|*0\|\|*code02$$ おまけ\|\|*タイプA\|\|*0\|\|*code03$$ おまけ\|\|*タイプB\|\|*0\|\|*code04 |
| `ItemType` | String | N | Option name:Max 50, Detail : Max 50 | 상품타입: 재고관리가 가능한 옵션정보를 의미합니다. <br/> 입력 방식: [상품타입명1]\|\|*[타입1]\|\|*[가격]\|\|*[수량]\|\|*[판매자코드]$$[상품타입명1]\|\|*[타입2]\|\|*[가격]\|\|*[수량]\|\|*[판매자코드] (※ 판매자코드가 없으면 0으로 입력)<br/>  ex) 1단계 (옵션이 색상만 있는 경우) : Color\|\|*Blue\|\|*100\|\|*100\|\|*0$$Color\|\|*Red\|\|*100\|\|*50\|\|*0<br/> 2단계 (옵션이 색상과 사이즈가 있는 경우) : Color\|\|*Blue\|\|*Size\|\|*L\|\|*100\|\|*100\|\|*0$$Color\|\|*Blue\|\|*Size\|\|*M\|\|*100\|\|*100\|\|*0$$Color\|\|*Red\|\|*Size\|\|*S\|\|*100\|\|*50\|\|*0$$Color\|\|*Red\|\|*Size\|\|*L\|\|*100\|\|*50\|\|*0 | オプション1段階 例) カラー\|\|*レッド\|\|*0\|\|*200\|\|*Red$$ カラー\|\|*ブルー\|\|*0\|\|*200\|\|*Blue  オプション2段階 例) カラー\|\|*レッド\|\|*サイズ\|\|*Sl\|\|*0\|\|*200\|\|*Red_S |
| `RetailPrice` | Decimal | N | 1~999999999 | 소매정가입니다. 만약 소매가격을 알 수 없는 경우 0으로입력하시길 바랍니다 | 15000 |
| `ItemPrice` | Decimal | Y | 1~999999999 | [필수] 상품의 판매가 최대9자리(반각숫자) | 10000 |
| `TaxRate` | String | N | 2 | 소비세율</br> S, 10, 8, 0 중에 선택하여 입력</br></br> S : 판매점 기본설정 소비세 적용</br> 10 : 소비세율 10% 적용</br> 8 : 소비세율 8% 적용</br> 0 : 소비세율 0% 적용 | 10 |
| `ItemQty` | Int32 | Y | 0 ~ 2147483647 | 상품의 수량 판매상태가 Y인경우 1개이상의 재고수량을 입력해주세요 | 200 |
| `ExpireDate` | String | N | 10 | 상품 판매 종료 (yyyy-mm-dd) 형식으로 입력 하시갈바랍니다. Null 로입력 시 1년 후로 설정됩니다 | 2030-12-31 |
| `ShippingNo` | Int32 | N | Max 10 | Qoo10 배송비코드  QSM 배송비 관리 메뉴에서 사용할 배송비의 코드를 확인하시길 바랍니다. 0으로 입력 시 무료배송비가 설정 됩니다. | 123456 |
| `AvailableDateType` | String | Y | 1 | 상품 발송 가능일 유형입니다. 숫자로 입력해 주세요. (0,1,2,3)<br/>  - 0: 일반발송 (3영업일 내 발송 가능한 상품)<br/>  - 1: 상품준비일<br/>  - 2: 출시일<br/>  - 3: 당일발송<br/>  | 0 |
| `AvailableDateValue` | String | Y | 10 | 상품 발송 가능일 유형 상세내용 입니다.<br/>- 1~3을 입력할 경우 일반발송 상품이 됩니다. (일발 발송일 입력 ex:1)<br/>- 4~14를 입력할 경우 상품 준비일 설정 상품이 됩니다. (상품 준비일 입력 ex: 5)<br/>- 날짜 형식으로 입력할 경우 출시 예정일이 됩니다. (출시일 입력 ex: 2025/09/26)<br/>- 시간을 입력할 경우 당일발송 상품이 됩니다. (당일 발송 시간 입력 ex: 14:30) | 2 |
| `Keyword` | String | N | Max 10 keywords, a keyword: Max 30 | 검색용 키워드 최대 10개까지 설정 가능 (ex, 셔츠,데님셔츠,청남방) | シャツ,デニム,春 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultObject` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;↳ `GdNo` | String | 등록된 상품의 Qoo10 상품 코드 |
| &nbsp;&nbsp;↳ `BIContentsNo` | Int64 | 메일상품이미지코드(Qoo10 내부 데이터) |
| &nbsp;&nbsp;↳ `AIContentsNo` | Int64 | 추가상품이미지코드(Qoo10 내부 데이터) |
| &nbsp;&nbsp;↳ `delivery_group_no` | Int32 | Qoo10 배송비 코드 |
| &nbsp;&nbsp;↳ `GroupbuyNo` | Int32 |  |
| &nbsp;&nbsp;↳ `optionImgResult` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `contentsNo` | Int64 | 옵션이미지코드(Qoo10내부 데이터) |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `imageUrl` | String | 옵션이미지 URL |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `isRegistered` | Boolean | 등록결과여부 True/False |
| &nbsp;&nbsp;↳ `InventoryImgResult` | _object_ | _(하위 필드 포함)_ |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `contentsNo` | Int64 | 재고옵션이미지코드(Qoo10내부 데이터) |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `imageUrl` | String | 재고옵션이미지 URL |
| &nbsp;&nbsp;&nbsp;&nbsp;↳ `isRegistered` | Boolean | 등록결과여부 True/False |
| &nbsp;&nbsp;↳ `QaBrandResult` | String | 브랜드 체크 결과 |

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## Result Codes

| Code | Description |
|---|---|
| 0 | SUCCESS |
| -10000 | Please check the Seller Authorization Key. |
| -10001 | Can not register the goods of duplicate seller code. |
| -10005 | Please check the AvailableDateValue. |
| -10101 | Processing Error - [Error Message] |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.

- 서비스 그룹 `ItemsBasic` (10004) — 상품 신규 등록 전용. 수정은 같은 그룹의 `EditGoods*` 시리즈 사용 (신규 vs 수정 메서드 분리).
- `SecondSubCat`(9자 카테고리 코드) ↔ [`GetCatagoryListAll`](../common/GetCatagoryListAll.md)의 `CATE_S_CD` 매핑. 상품 등록 전 카테고리 코드 캐시 필요.
- `BrandNo`(선택) ↔ [`SearchBrand`](../common/SearchBrand.md)의 `M_B_NO` 매핑. 등록되지 않은 브랜드는 QSM 페이지에서 신청.
- `ShippingNo` ↔ [`GetSellerDeliveryGroupInfo`](./GetSellerDeliveryGroupInfo.md)의 `ShippingNo`. `0` 입력 시 무료배송비 자동 설정.
- `SellerCode` 계정 내 **중복 불가** — 중복 시 `-10001` 반환. 어댑터에서 ID 충돌 방지 필수.
- `AvailableDateType`(0/1/2/3) + `AvailableDateValue` 케이스별 파싱 분기 필요:
  - `1~3` → 일반발송 일수
  - `4~14` → 상품 준비일 일수
  - `YYYY/MM/DD` → 출시 예정일
  - `HH:MM` → 당일발송 시간
  - Value 형식 불일치 시 `-10005` 반환.
- **옵션 포맷** — `AdditionalOption`(추가 옵션) / `ItemType`(재고 관리 옵션):
  - 항목구분 `||*`, 옵션추가 `$$`.
  - 본 상품 판매가의 `-50% ~ +50%` 범위 + 0엔 선택지 1개 이상 필수 (조합형 옵션 제약).
  - 1단계: `Color||*Blue||*100||*100||*0`, 2단계: `Color||*Blue||*Size||*L||*100||*100||*0`.
- 가격: `ItemPrice` 1~999999999, `RetailPrice` 0 가능(미상). `Weight` 최대 30kg, 소수점 1자리.
- `ItemQty` 0~2147483647. 판매상태 Y면 1 이상 필수.
- `ExpireDate` `yyyy-mm-dd`, Null → 자동 1년 연장.
- enum:
  - `Drugtype` — `1C`/`2C`/`3C`/`D2`/`QD` (의약품 카테고리 시 필수).
  - `IndustrialCodeType` — `J`/`K`/`I`/`U`/`E`/`H`.
  - `ProductionPlaceType` — `1`(국내) / `2`(해외) / `3`(기타). `ProductionPlace` 입력 규칙이 타입별로 다름 (도도부현 대문자 로마자 / 국가코드 / 자유입력 50자).
  - `AdultYN` — `Y`/`N`.
  - `TaxRate` — `S`/`10`/`8`/`0` (S = 판매점 기본 적용).
- 등록 직후 응답 `GdNo`를 받아 [`GetItemDetailInfo`](./GetItemDetailInfo.md)로 후속 검증 권장.
- 응답 `optionImgResult` / `InventoryImgResult.isRegistered` — 옵션/재고 이미지는 **부분 실패 가능**. 어댑터에서 부분 성공 처리 분기.
- `-10101 Processing Error` — 메시지 본문 그대로 노출. 원인 추적은 `ResultMsg` 의존.

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
