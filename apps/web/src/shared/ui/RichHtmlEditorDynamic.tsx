'use client';

import dynamic from 'next/dynamic';
import { Box, Skeleton } from '@chakra-ui/react';

export const RichHtmlEditor = dynamic(
  () => import('./RichHtmlEditor').then((m) => ({ default: m.RichHtmlEditor })),
  {
    ssr: false,
    loading: () => (
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3} minH="300px">
        <Skeleton h="36px" mb={2} />
        <Skeleton h="32px" mb={3} />
        <Skeleton h="220px" />
      </Box>
    ),
  },
);
