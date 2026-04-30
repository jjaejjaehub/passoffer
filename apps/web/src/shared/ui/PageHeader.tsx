'use client';

import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import type { BoxProps } from '@chakra-ui/react';
import type React from 'react';
import type { ReactNode } from 'react';

interface PageHeaderProps extends BoxProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  ...rest
}: PageHeaderProps): React.JSX.Element {
  return (
    <Box mb={6} {...rest}>
      <Flex justify="space-between" align="flex-start" gap={4}>
        <Box>
          <Heading as="h1" size="lg">
            {title}
          </Heading>
          {description && (
            <Text mt={1} fontSize="sm" color="gray.600">
              {description}
            </Text>
          )}
        </Box>
        {actions && <Box>{actions}</Box>}
      </Flex>
    </Box>
  );
}

