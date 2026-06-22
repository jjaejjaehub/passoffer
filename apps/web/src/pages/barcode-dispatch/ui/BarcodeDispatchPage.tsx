'use client';

import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import { PageHeader } from '@/shared/ui';
import {
  BarcodeScanVerify,
  type BarcodeScanRecord,
} from '@/features/barcode-scan-verify';

const HISTORY_LIMIT = 50;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function BarcodeDispatchPage(): React.JSX.Element {
  const [records, setRecords] = useState<BarcodeScanRecord[]>([]);

  const handleScanResult = (record: BarcodeScanRecord): void => {
    setRecords((prev) => [record, ...prev].slice(0, HISTORY_LIMIT));
  };

  const handleClear = (): void => {
    setRecords([]);
  };

  const successCount = records.filter((r) => r.result.matched).length;
  const failCount = records.length - successCount;

  return (
    <Box>
      <PageHeader
        title="바코드출고매니저"
        description="송장번호 또는 채널주문번호를 스캔하여 출고완료(50)로 일괄 전환합니다."
      />

      <Stack gap="4">
        <BarcodeScanVerify onScanResult={handleScanResult} />

        <Box borderWidth="1px" borderRadius="md" bg="white">
          <Flex
            justify="space-between"
            align="center"
            px="4"
            py="3"
            borderBottomWidth="1px"
          >
            <Flex gap="3" align="center">
              <Text fontWeight="semibold">최근 스캔 기록</Text>
              <Badge colorPalette="green">성공 {successCount}</Badge>
              <Badge colorPalette="red">실패 {failCount}</Badge>
              <Text fontSize="xs" color="gray.500">
                (최근 {HISTORY_LIMIT}건)
              </Text>
            </Flex>
            <Button
              size="xs"
              variant="ghost"
              onClick={handleClear}
              disabled={records.length === 0}
            >
              비우기
            </Button>
          </Flex>

          {records.length === 0 ? (
            <Box p="8" textAlign="center" color="gray.500" fontSize="sm">
              아직 스캔 기록이 없습니다.
            </Box>
          ) : (
            <Table.Root size="sm" variant="line">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader width="120px">시각</Table.ColumnHeader>
                  <Table.ColumnHeader>스캔 코드</Table.ColumnHeader>
                  <Table.ColumnHeader width="100px">결과</Table.ColumnHeader>
                  <Table.ColumnHeader>주문 / 사유</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {records.map((r) => {
                  const matched = r.result.matched;
                  const o = r.result.order;
                  return (
                    <Table.Row key={r.id}>
                      <Table.Cell color="gray.600" fontSize="xs">
                        {formatTime(r.timestamp)}
                      </Table.Cell>
                      <Table.Cell fontFamily="mono" fontSize="xs">
                        {r.scannedCode}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={matched ? 'green' : 'red'}>
                          {matched ? '출고완료' : r.result.reason ?? '실패'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell fontSize="xs">
                        {matched && o ? (
                          <Stack gap="0">
                            <Text>
                              {o.channelId} · {o.channelOrderId}
                            </Text>
                            <Text color="gray.500">
                              {o.trackingCarrier ?? '-'} {o.trackingNo ?? ''} ·{' '}
                              {o.receiverName ?? o.buyerName ?? ''}
                            </Text>
                          </Stack>
                        ) : (
                          <Text color="gray.500">
                            {r.result.reason ?? 'unknown'}
                          </Text>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
