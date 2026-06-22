"use client";

import { Suspense, type ReactNode } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { usePathname } from "next/navigation";
import { ActiveChannelProvider, ChannelUrlSyncer } from "@/entities/channel";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

const AUTH_PATHS = ["/login", "/signup"];

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <ActiveChannelProvider>
      <Suspense>
        <ChannelUrlSyncer />
      </Suspense>
      <Flex h="100vh" overflow="hidden" bg="gray.50">
        <Sidebar />
        <Box flex="1" minW={0} px={8} py={6} overflowX="auto" overflowY="auto">
          {children}
        </Box>
      </Flex>
    </ActiveChannelProvider>
  );
}
