# Qoo10 API 공통 규칙

> 모든 엔드포인트에 공통 적용되는 사항. 엔드포인트 .md에서 중복 기술 금지.

## 호스트

- 정식: `https://api.qoo10.jp`
- `www.qoo10.jp`는 404 — 절대 사용 금지

## 인증

- 헤더: `giosis-certification-key: {ApiKey}`
- ApiKey는 채널별 자격증명에 저장 (AES-256-GCM 암호화)
- 어댑터에서 복호화 후 주입

## 요청 포맷

- 대부분 `application/x-www-form-urlencoded`
- 일부 신규 엔드포인트는 `application/json`
- 엔드포인트별로 확인 필요 — 임의로 변경 시 -10003 반환되는 경우 있음

## 응답 판정

- HTTP 200이어도 `ResultCode !== 0`이면 실패
- `ResultCode`가 음수: API 레벨 에러
- `ResultMsg`에 사람이 읽을 수 있는 사유

## 인코딩

- 요청/응답 모두 UTF-8
- 한글/일본어 파라미터는 URL 인코딩 필수 (form-urlencoded일 때)

## 레이트 리밋

- 공식 명시 없음. 경험적으로 초당 5~10 req 안전선
- 대량 처리 시 어댑터 레벨 throttling 권장

## 작업 시 주의사항 (누적)

> 모든 엔드포인트에 영향을 주는 발견사항만 여기에. 특정 엔드포인트 한정은 해당 .md에.

- 응답 `ResultObject`가 단일 객체일 수도, 배열일 수도 있음 — 엔드포인트별 확인 필수
- 빈 문자열 `""`을 보내야 하는 자리에 `null` 보내면 -90001 반환
