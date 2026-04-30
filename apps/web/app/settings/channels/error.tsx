'use client';

import { useEffect } from 'react';
import { ErrorPage } from '@/shared/ui';
import { reportError } from '@/shared/lib';

interface ChannelsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ChannelsError({ error, reset }: ChannelsErrorProps): React.JSX.Element {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <ErrorPage
      title="채널 설정을 불러오는 중 문제가 발생했습니다."
      description="잠시 후 다시 시도해 주세요."
      reset={reset}
    />
  );
}
