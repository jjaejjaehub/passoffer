# {엔드포인트명} — {한 줄 용도}

> 새 엔드포인트 .md를 작성할 때 이 템플릿을 복사해 채웁니다.
> 빈 섹션은 "_확인 필요_"로 명시 — 추측으로 채우지 마세요.

## 메타

- **메서드/경로**: `POST /GMKT.INC.Front.QAPIService/ebayjapan.qapi.svc/{ActionName}`
- **공식 문서 URL**: {Qoo10 API 문서 페이지 링크}
- **원본 크롤링 파일**: `_raw/{filename}.html`
- **최종 갱신**: YYYY-MM-DD

## 요청

### 인증 헤더

```
giosis-certification-key: {ApiKey}
Content-Type: application/x-www-form-urlencoded   // 또는 application/json
```

### 파라미터

| 이름 | 타입 | 필수 | 설명 | 비고 |
|---|---|---|---|---|
| `ItemCode` | string | Y | 상품코드 | |
| ... | | | | |

### 요청 예시

```http
POST /GMKT.INC.Front.QAPIService/ebayjapan.qapi.svc/{ActionName}
giosis-certification-key: xxx

ItemCode=A1234567&...
```

## 응답

### 응답 스키마

```json
{
  "ResultCode": 0,
  "ResultMsg": "Success",
  "ResultObject": [
    { ... }
  ]
}
```

### 성공 판정

- HTTP 200 AND `ResultCode === 0`
- ResultCode가 음수면 실패 — `ResultMsg`에 사유

### 주요 응답 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `ResultCode` | number | 0 성공, 그 외 실패 |
| ... | | |

## 에러 코드

| ResultCode | 의미 | 대응 |
|---|---|---|
| -10000 | 인증 실패 | ApiKey 재발급 |
| ... | | |

## 작업 시 주의사항

> 코드 작업하며 발견한 함정/예외를 누적합니다. 시간이 지나면 가장 중요한 자산이 됩니다.

- (예시) `ItemCode`는 대문자만 허용 — 소문자 입력 시 -90001 반환
- (예시) `ItemPrice`는 정수만 — 소수점 보내면 -90011

## 관련 코드

- 어댑터: `apps/server/src/adapters/qoo10/Qoo10Adapter.ts`
- 호출부: ...
