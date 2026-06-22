"use client";

import type { ReactNode } from "react";
import { AppToasterHost } from "@/shared/ui";
import { ChakraClientProvider } from "./ChakraClientProvider";
import { QueryProvider } from "./QueryProvider";

export function Providers({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <QueryProvider>
      <ChakraClientProvider>
        {children}
        <AppToasterHost />
      </ChakraClientProvider>
    </QueryProvider>
  );
}
