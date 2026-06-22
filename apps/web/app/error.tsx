"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/shared/ui";
import { reportError } from "@/shared/lib";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({
  error,
  reset,
}: RootErrorProps): React.JSX.Element {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <ErrorPage
      title="예기치 못한 오류가 발생했습니다."
      description="잠시 후 다시 시도해 주세요."
      reset={reset}
    />
  );
}
