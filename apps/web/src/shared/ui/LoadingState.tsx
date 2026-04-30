import { Skeleton, Stack, type StackProps } from "@chakra-ui/react";

interface LoadingStateProps extends StackProps {
  rows?: number;
  rowHeight?: number | string;
}

export function LoadingState({
  rows = 6,
  rowHeight = 12,
  ...stackProps
}: LoadingStateProps): React.JSX.Element {
  return (
    <Stack gap={2} {...stackProps}>
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
        <Skeleton key={i} height={rowHeight} borderRadius="md" />
      ))}
    </Stack>
  );
}
