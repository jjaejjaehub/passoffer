import { Box, Skeleton, SimpleGrid } from "@chakra-ui/react";

export default function DashboardLoading(): React.JSX.Element {
  return (
    <Box>
      <Skeleton height="28px" width="200px" mb={1} />
      <Skeleton height="16px" width="300px" mb={6} />
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={6}>
        <Skeleton height="96px" borderRadius="md" />
        <Skeleton height="96px" borderRadius="md" />
        <Skeleton height="96px" borderRadius="md" />
      </SimpleGrid>
      <Skeleton height="320px" borderRadius="md" />
    </Box>
  );
}
