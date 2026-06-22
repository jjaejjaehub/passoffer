import { Box, Skeleton, SkeletonText, Stack } from "@chakra-ui/react";

export default function Loading(): React.JSX.Element {
  return (
    <Box>
      <Skeleton height="32px" width="200px" mb={6} />
      <Stack gap={4}>
        {["row-1", "row-2", "row-3", "row-4"].map((key) => (
          <Box
            key={key}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            p={5}
            bg="white"
          >
            <Skeleton height="20px" width="160px" mb={3} />
            <SkeletonText noOfLines={2} rootProps={{ gap: 2 }} mb={3} />
            <Skeleton height="32px" borderRadius="md" />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
