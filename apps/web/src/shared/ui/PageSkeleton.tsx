'use client';

import { Box, Skeleton, SkeletonText } from "@chakra-ui/react";

export default function PageSkeleton(): React.JSX.Element {
  return (
    <Box>
      <Skeleton height="32px" width="260px" mb={6} />
      <SkeletonText noOfLines={6} />
      <Box mt={6}>
        <Skeleton height="180px" borderRadius="lg" />
      </Box>
    </Box>
  );
}
