import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { ShopifyFormLabel as Label } from "@/shared/ui/ShopifyFormPrimitives";

export function FormBox({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      bg="white"
      p={5}
      mt={4}
    >
      {title && (
        <Heading as="h3" size="sm" mb={4}>
          {title}
        </Heading>
      )}
      {children}
    </Box>
  );
}

export function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="xs"
      fontWeight="semibold"
      color="gray.500"
      textTransform="uppercase"
      letterSpacing="wide"
    >
      {children}
    </Text>
  );
}

export function TwoCol({ children }: { children: React.ReactNode }) {
  return (
    <Flex gap={4} direction={{ base: "column", md: "row" }}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <Box key={i} flex="1">
              {child}
            </Box>
          ))
        : children}
    </Flex>
  );
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Label required={required}>{label}</Label>
      {children}
    </Box>
  );
}
