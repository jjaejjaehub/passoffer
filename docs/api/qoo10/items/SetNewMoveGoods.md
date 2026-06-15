# SetNewMoveGoods — MOVE 상품등록

## 메타

- **메서드명**: `SetNewMoveGoods`
- **서비스**: `ItemsBasic` (상품 정보 등록 & 수정)
- **클래스**: `GoodsBasicBiz` (`GMKT.INC.Front.QAPIBiz.Goods.GoodsBasicBiz`)
- **m_no / c_no**: 15757 / 10004
- **그룹**: 상품 관리
- **원본 크롤링 파일**: `_raw/15757_info.json`, `_raw/15757_params.json`
- **명세서 수록**: 미수록 (미검증) — 사용자 명세서 `Qoo10_QSM_API_명세서.md` 에 본 메서드 없음. 본 문서는 원본 크롤링 기반이며 결정론적 검증 불가.
- **최종 갱신**: 2026-05-22

## 설명

MOVE 전용 상품을 등록하기위한  API 메소드입니다.
MOVE 판매자만 이용이 가능합니다.

## 요청 파라미터 (Input)

| 이름 | 타입 | 필수 | 길이 | 설명 | 예시 |
|---|---|---|---|---|---|
| `SellerCode` | String | N | MAX100 | [안내] 판매자상품코드는 판매자 계정별 중복입력이 불가합니다.  최대 100글자  판매자 관리용 상품코드 | seller_123 |
| `SecondSubCat` | String | Y | 9 | 카테고리 코드 9자리 (숫자) | 320001873 |
| `BrandNo` | String | N | MAX10 | 브랜드 코드 (숫자) | 27450 |
| `ItemSeriesName` | String | N | MAX10 | 제품라인/ 시리즈명 최대16글자 | abc1 |
| `PromotionName` | String | N | MAX20 | 홍보문구 최대20자 | 特価セール |
| `ItemPrice` | Int32 | Y | 1~999999999 | 판매가격 최대9자리(숫자) | 10000 |
| `RetailPrice` | Int32 | N | 1~999999999 | 참고가격 최대9자리(숫자) | 15000 |
| `TaxRate` | Int32 | Y | 2 | 소비세율 </br> S, 10, 8, 0 중에 선택하여 입력 </br> </br> S : 판매점 기본설정 소비세 적용 </br> 10 : 소비세율 10% 적용 </br> 8 : 소비세율 8% 적용 </br> 0 : 소비세율 0% 적용 | 10 |
| `OptionType` | String | Y | Option Name MAX20 | 옵션(종류) 필수입력 : 옵션명, 색상코드 옵션명 : 최대 20개 대표옵션 : Y 표시 (1개)  옵션명1\|\|*색상코드\|\|*Y\|\|*모델코드\|\|*착용사이즈$$ 옵션명2\|\|*색상코드\|\|*N\|\|*모델코드\|\|*착용사이즈  예1) 블랙\|\|*#000000\|\|*Y  예2)  블랙\|\|*#000000\|\|*Y\|\|*M0001\|\|*S | Black\|\|*#000000\|\|*Y\|\|*100\|\|*S |
| `OptionMainimage` | String | Y | MAX 200 | 옵션메인이미지 [주의] [옵션명]에 입력한 옵션명별로 모두 설정해야 합니다.  옵션명별 1개  옵션명1\|\|*이미지URL$$ 옵션명2\|\|*이미지URL | Black\|\|*https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png |
| `OptionSubimage` | String | N | MAX 10 an option | 옵션별 서브이미지 옵션명1\|\|*이미지URL 옵션명2\|\|*이미지URL1\|\|*이미지URL2$$\|\|*이미지URL3$$  옵션명별 최대 10개 | Black\|\|*https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png$$ Red\|\|*https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png$$ |
| `OptionQty` | Int32 | Y | 0 | 옵션조합별 재고수량 사이즈가 있는 경우 옵션명\|\|*사이즈명\|\|*재고수량\|\|*판매자옵션코드$$  사이즈가 없는 경우 옵션명\|\|*재고수량\|\|*판매자옵션코드$$   예1) 블랙\|\|*S\|\|*200\|\|*BLACK-S  예2) 블랙\|\|*200\|\|*BLACK$$ 레드\|\|*200\|\|*RED$$ 블루\|\|*200\|\|*BLUE$$ | ブラック\|\|*S\|\|*200\|\|*BLACK-S |
| `StyleNumber` | String | Y | Min code 1 to 2 | 스타일 [안내] 여성복/남성복 카테고리에 한해 필수로 입력해 주세요. 스타일코드 입력  최소 1개, 최대 2개 ($$로 구분) <br><br> 스타일코드 확인<br> https://qsmupload.qoo10.jp/GMKT.INC.Gsm.Web/Product/MoveDataExcelManagement.aspx | STY0001$$STY0002 |
| `TpoNumber` | String | Y | Min code 1 to 2 | TPO [안내] 여성복/남성복 카테고리에 한해 필수로 입력해 주세요. TPO코드 입력  최소 1개, 최대 2개 ($$로 구분) <br><br> TPO코드 확인<br> https://qsmupload.qoo10.jp/GMKT.INC.Gsm.Web/Product/MoveDataExcelManagement.aspx | TPO0001$$TPO0002 |
| `SeasonType` | String | Y | Max 4 Season | 계절 1 : 봄 2 : 여름 3 : 가을 4 : 겨울  최대 4개 ($$로 구분) | 1$$3 |
| `MaterialInfo` | String | N | MAX 500 | 소재 최대 500글자 | 表地: 綿50%、ポリエステル50%/裏地: 起毛100% |
| `MaterialNumber` | String | N | MAX 3 codes | 소재(검색용)소재코드 입력 최대 3개($$로 구분) | MAT0010$$MAT0020$$MAT0030 |
| `AttributeInfo` | String | N | MAX 3 codes | 속성 [안내] 소카테고리별 적용 가능한 속성그룹 을 먼저 확인 후 입력해 주세요.  속성그룹코드\|\|*속성코드1\|\|*속성코드2\|\|*속성코드3$$  속성코드 : 속성그룹 별 최대 3개  속성그룹 추가 : $$로 구분 | GATR0001\|\|*ATR0001$$GATR0008\|\|*ATR0073  |
| `ItemDescription` | String | N | MAX 1000 byte | 상품설명 HTML code | <img src="https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png"> |
| `WashinginfoWashing` | String | N | 1 | 세탁 [안내] 여성복, 속옷·양말 카테고리에 한해 적용됩니다. 1 : 드라이 2 : 세탁기 3 : 손세탁 | 1 |
| `WashinginfoStretch` | String | N | 1 | 신축성 [안내] 여성복, 속옷·양말 카테고리에 한해 적용됩니다. 1 : 있음 2 : 약간 있음 3 : 없음 | 1 |
| `WashinginfoFit` | String | N | 1 | 사이즈 [안내] 여성복, 속옷·양말 카테고리에 한해 적용됩니다. 1 : 작게나옴 2 : 정사이즈 3 : 크게나옴 | 1 |
| `WashinginfoThickness` | String | N | 1 | 두께 [안내] 여성복, 속옷·양말 카테고리에 한해 적용됩니다. 1 : 두꺼움 2 : 보통 3 : 얇음 | 1 |
| `WashinginfoLining` | String | N | 1 | 안감 [안내] 여성복 카테고리에 한해 적용됩니다.  1 : 있음 2 : 없음 | 1 |
| `WashinginfoSeethrough` | String | N | 1 | 비침 [안내] 여성복 카테고리에 한해 적용됩니다.  1 : 있음 2 : 약간 비침 3 : 없음 | 1 |
| `ImageOtherUrl` | String | N | MAX 50 images | 추가이미지 이미지 URL (JPG, PNG, GIF)   최대 50개 (추가 $$로 구분)  최대 10,000글자 | https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png$$https://dp.image-qoo10.jp/GMKT.IMG/loading_2017/qoo10_loading.v_20170420.png |
| `VideoNumber` | String | N | MAX 10 codes | 비디오코드  최대 10개 ($$로 구분) | 100$$101 |
| `SizetableType1` | String | N | MAX 10 | 사이즈표_종류1 종류코드 입력 | GSIZ0001 |
| `SizetableType1Value` | String | N | 0 | 사이즈표_값1 [주의] 사이즈명은 [사이즈명]에 입력한 값을 동일하게 입력해 주세요.  사이즈명\|\|*항목코드\|\|*값$$ | S\|\|*SIZ0001\|\|*107$$S\|\|*SIZ0002\|\|*46$$S\|\|*SIZ0003\|\|*55 |
| `SizetableType2` | String | N | MAX 10 | 사이즈표_종류2 종류코드 입력 | GSIZ0001 |
| `SizetableType2Value` | String | N | 0 | 사이즈표_값2 [주의] 사이즈명은 [사이즈명]에 입력한 값을 동일하게 입력해 주세요.  사이즈명\|\|*항목코드\|\|*값$$ | S\|\|*SIZ0001\|\|*100$$ S\|\|*SIZ0011\|\|*55$$ M\|\|*SIZ0001\|\|*100$$ M\|\|*SIZ0011\|\|*55$$ L\|\|*SIZ0001\|\|*100$$ L\|\|*SIZ0011\|\|*55$$ |
| `SizetableType3` | String | N | MAX 10 | 사이즈표_종류3 종류코드 입력 | GSIZ0001 |
| `SizetableType3Value` | String | N | 0 | 사이즈표_값3 [주의] 사이즈명은 [사이즈명]에 입력한 값을 동일하게 입력해 주세요.  사이즈명\|\|*항목코드\|\|*값$$ | S\|\|*SIZ0001\|\|*100$$ S\|\|*SIZ0011\|\|*55$$ M\|\|*SIZ0001\|\|*100$$ M\|\|*SIZ0011\|\|*55$$ L\|\|*SIZ0001\|\|*100$$ L\|\|*SIZ0011\|\|*55$$ |
| `ShippingNo` | Int32 | Y | MAX6 | 배송비 코드 (숫자) 최대6자리  | 123456 |
| `AvailableDateValue` | String | Y | 10 | 발송가능일 [주의] 일반발송(4일 이후) 및 출시일 설정 시배송포인트 플러스 점수가 부여되지 않습니다.  일반발송: 1~14 (소요일 숫자) 당일발송: hh:mm (시각) 예약발송: YYYY-MM-DD (출시일 날짜) | 3 |
| `DesiredShippingDate` | String | N | 10 | 구매자 배송일 지정 3~20이내 (주문일 기준 선택가능일) 숫자 | 3 |
| `Keyword` | String | N | Max 10 keywords, a keyword: Max 30 | 검색키워드 최대 10개  각 최대 30글자 (추가 $$ 구분) | バカンス$$カジュアル |
| `OriginType` | String | Y | 1 | 원산지 타입 1 : 국내(Japan) 2 : 해외 3 : 기타 | 1 |
| `OriginRegionId` | String | N | MAX 20 | 원산지 _지역명 [안내] [원산지]가 국내인 경우 적용됩니다.  지역코드 (영문) | TOKYO |
| `OriginCountryId` | String | N | 2 | 원산지_국가명 [안내] [원산지]가 2:해외일 시 국가코드를 필수로 입력해 주세요.  국가코드 2글자 (영문) | CN |
| `OriginOthers` | String | N | MAX50 | 원산지_기타 [안내] [원산지]가 3:기타일 시 내용을 필수로 입력해 주세요.  최대 50글자 | OOに限りOO国から発送 |
| `Weight` | Decimal | N | MAX 5 | 무게 [안내] [배송비] 정보의 발송지가 해외인 경우 필수로 입력해 주세요.  최대 2글자(숫자, 소수점 둘째자리까지 가능)  최대 30kg | 1.5 |
| `ModelNM` | String | N | MAX 30 | 모델명 최대 30글자 | CUH-7218BB01 |
| `IndustrialCodeType` | String | N | 2~4 | 표준산업코드 타입 JAN : JAN코드 KAN : KAN코드 ISBN : ISBN코드 UPC : UPC코드 EAN : EAN코드 HS : HS코드 | JAN |
| `IndustrialCode` | String | N | MAX 13 | 표준산업코드 최대 30글자 | TK-FBP019EBK |
| `ManufactureDate` | String | N | YYYY-MM-DD | 제조일자 YYYY-MM-DD | 2025-01-01 |
| `ExpirationDateType` | String | N | 1 | 유효일자 1: 제조일로부터 2: 개봉일로부터 3: 지정한 날짜까지 | 1 |
| `ExpirationDateMFD` | String | N | MAX 30 | 유효일자_기간1 1:제조일 최대 30글자 | 120日まで |
| `ExpirationDatePAO` | String | N | MAX 30 | 유효일자_기간2 2:개봉일 최대 30글자 | 1年以内 |
| `ExpirationDateEXP` | String | N | YYYY-MM-DD | 3:유효일 YYYY-MM-DD | 2026-01-01 |
| `AdultYN` | String | N | 1 | 18세미만 제한 Y: 제한 N: 제한없음  미입력 시 N으로 적용 | N |
| `ContactInfo` | String | N | MAX 20 | A/S 담당자정보 | 電話番号: 090-0000-0000 / メールアドレス: xxx@xxx.xxx |
| `BuyLimitType` | String | N | 1 | 구매수량제한 1: 구매자별 1회 구매수량 제한 2: 구매자별 1일 구매수량 제한 | 1 |
| `BuyLimitDate` | String | N | YYYY-MM-DD | 구매수량제한_기간 YYYY-MM-DD | 2026-01-01 |
| `BuyLimitQty` | String | N | MAX 2 | 구매수량제한_수량 최대 2글자 (숫자) | 13 |
| `ExpireDate` | String | Y | YYYY-MM-DD | 판매종료일 YYYY-MM-DD | 2025-12-31 |
| `ShippingName` | String | N | MAX 50 | 주문/배송 관리코드 : QSM 주문/배송 관리 화면에 한해 상품명에 함께 표기되는 정보이며, 상품 구분을 위해 활용하실 수 있습니다. 최대50자 | 123456789 |

## 응답 필드 (Output)

> `ResultObject` 하위 구조는 들여쓰기(↳)로 표시. 원본 키는 `$$` 구분자.

_없음_

## 성공 판정

- HTTP 200 AND `ResultCode === 0`
- 그 외는 실패 — `ResultMsg` 참조

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다.


## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
