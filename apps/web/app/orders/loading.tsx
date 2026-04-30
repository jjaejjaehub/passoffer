import { Box, Skeleton } from "@chakra-ui/react";
import { TableSkeleton } from "@/shared/ui/TableSkeleton";

export default function OrdersLoading(): React.JSX.Element {
  return (
    <Box>
      <Skeleton height="28px" width="200px" mb={1} />
      <Skeleton height="16px" width="300px" mb={6} />
      <TableSkeleton rows={8} cols={7} />
    </Box>
  );
}
