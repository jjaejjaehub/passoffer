'use client';

/**
 * 에러 리포팅 유틸리티
 * Sentry 등 외부 모니터링 도구 연동 준비를 위한 추상화 레이어.
 *
 * 사용법:
 * ```ts
 * import { reportError } from '@/shared/lib/errorReporter';
 * reportError(error);
 * ```
 *
 * Sentry 연동 시:
 * 1. `bun add @sentry/nextjs`
 * 2. SENTRY_DSN 환경변수 설정
 * 3. 아래 implementation을 `Sentry.captureException(error)` 으로 교체
 */
export function reportError(error: Error & { digest?: string }): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ErrorReporter]', error);
    return;
  }

  // TODO: Sentry 연동 후 아래 코드로 교체
  // Sentry.captureException(error, {
  //   extra: { digest: error.digest },
  // });
}
