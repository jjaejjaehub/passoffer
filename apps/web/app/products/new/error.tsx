'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorPage } from '@/shared/ui';
import { reportError } from '@/shared/lib';

interface ProductNewErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProductNewError({ error, reset }: ProductNewErrorProps): React.JSX.Element {
  const t = useTranslations('pages.errorBoundary.titles');
  useEffect(() => {
    reportError(error);
  }, [error]);

  return <ErrorPage title={t('productNew')} reset={reset} />;
}
