import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import NextTopLoader from 'nextjs-toploader';
import { Providers } from '@/app/_providers/Providers';
import { AppShell } from '@/widgets/app-shell';
import { AppToasterHost } from '@/shared/ui/app-toaster';

export const metadata: Metadata = {
  title: 'passoffer',
  description: 'passoffer application',
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export async function RootLayout({ children }: RootLayoutProps): Promise<React.JSX.Element> {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextTopLoader color="#3b82f6" height={3} showSpinner={false} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <AppShell>{children}</AppShell>
            <AppToasterHost />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

