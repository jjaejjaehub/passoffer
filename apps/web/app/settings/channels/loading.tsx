import { Box, SimpleGrid, Skeleton, SkeletonText } from "@chakra-ui/react";

export default function Loading(): React.JSX.Element {
  return (
    <Box>
      <Skeleton height="32px" width="200px" mb={6} />
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
        {["ch-1", "ch-2", "ch-3", "ch-4"].map((key) => (
          <Box
            key={key}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            p={5}
            bg="white"
          >
            <Skeleton height="24px" width="120px" mb={3} />
            <SkeletonText noOfLines={2} rootProps={{ gap: 2 }} mb={4} />
            <Skeleton height="36px" borderRadius="md" />
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
