"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "@/shared/lib/chakra-theme";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createWrapper(): ({
  children,
}: {
  children: ReactNode;
}) => React.JSX.Element {
  const queryClient = createTestQueryClient();

  return function Wrapper({
    children,
  }: {
    children: ReactNode;
  }): React.JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={system}>{children}</ChakraProvider>
      </QueryClientProvider>
    );
  };
}

export function ChakraTestProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
