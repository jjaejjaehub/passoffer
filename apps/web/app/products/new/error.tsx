"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/shared/ui";
import { reportError } from "@/shared/lib";

interface ProductNewErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProductNewError({
  error,
  reset,
}: ProductNewErrorProps): React.JSX.Element {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <ErrorPage
      title="상품 등록 중 문제가 발생했습니다."
      description="잠시 후 다시 시도해 주세요."
      reset={reset}
    />
  );
}
