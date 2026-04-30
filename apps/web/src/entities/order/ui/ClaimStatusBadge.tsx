'use client';

import { Box, Text } from '@chakra-ui/react';

interface ClaimStatusBadgeProps {
  status: string;
}

function getClaimStatusLabel(status: string): string {
  switch (status) {
    case '1':
      return '취소요청';
    case '2':
      return '취소중';
    case '3':
      return '취소완료';
    case '4':
      return '반품요청';
    case '5':
      return '반품중';
    case '6':
      return '반품완료';
    case '11':
      return '교환신청';
    case '12':
      return '교환승인';
    case '13':
      return '재배송중';
    default:
      return status || '-';
  }
}

export function ClaimStatusBadge({
  status,
}: ClaimStatusBadgeProps): React.JSX.Element {
  const label = getClaimStatusLabel(status);

  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      borderWidth="1px"
      borderColor="gray.300"
      borderRadius="sm"
      fontSize="xs"
      color="gray.800"
      bg="gray.50"
    >
      <Text as="span">{label}</Text>
    </Box>
  );
}

