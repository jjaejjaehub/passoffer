"use client";

import { Box, Button, Heading, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

interface ErrorPageProps {
  title?: string;
  description?: string;
  reset: () => void;
}

export function ErrorPage({
  title,
  description,
  reset,
}: ErrorPageProps): React.JSX.Element {
  const t = useTranslations("pages.errorBoundary");
  return (
    <Box py={16} textAlign="center">
      <Heading as="h2" size="lg" mb={4}>
        {title ?? t("fallbackTitle")}
      </Heading>
      <Text mb={8} color="gray.600">
        {description ?? t("description")}
      </Text>
      <Button onClick={reset} colorPalette="blue">
        {t("retry")}
      </Button>
    </Box>
  );
}
