"use client";

import { Button, Flex } from "@chakra-ui/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/shared/i18n";

const LABELS: Record<Locale, string> = {
  ko: "KO",
  ja: "JA",
};

export function LocaleSwitcher(): React.JSX.Element {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setLocale = (next: Locale): void => {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Flex gap={1} align="center">
      {LOCALES.map((value) => {
        const active = value === locale;
        return (
          <Button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            disabled={isPending}
            size="xs"
            variant="ghost"
            px={2}
            py={1}
            minW="auto"
            h="auto"
            fontWeight={active ? "bold" : "medium"}
            color={active ? "blue.600" : "gray.500"}
            bg={active ? "blue.50" : "transparent"}
            opacity={isPending && !active ? 0.5 : 1}
            _hover={!active ? { bg: "gray.100", color: "gray.700" } : undefined}
          >
            {LABELS[value]}
          </Button>
        );
      })}
    </Flex>
  );
}
