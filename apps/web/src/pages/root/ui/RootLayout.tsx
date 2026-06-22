import type { Metadata } from "next";
import type { ReactNode } from "react";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "@/app/_providers/Providers";
import { AppShell } from "@/widgets/app-shell";
import { AppToasterHost } from "@/shared/ui/app-toaster";

export const metadata: Metadata = {
  title: "passoffer",
  description: "passoffer application",
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextTopLoader color="#3b82f6" height={3} showSpinner={false} />
        <Providers>
          <AppShell>{children}</AppShell>
          <AppToasterHost />
        </Providers>
      </body>
    </html>
  );
}
