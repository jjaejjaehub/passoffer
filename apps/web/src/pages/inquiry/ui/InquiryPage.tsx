'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Box,
  Button,
  Flex,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { KeyIcon, MessageCircle } from 'lucide-react';

import { useChannelApiKey } from '@/entities/channel';
import { useQoo10Inquiries, useQoo10ReplyInquiry } from '@/entities/inquiry';
import type { InquiryFilter, InquiryItem } from '@/entities/inquiry';
import { PageHeader, TableSkeleton } from '@/shared/ui';
import { EmptyState } from '@/shared/ui/EmptyState';
import { appToaster } from '@/shared/ui';

// ─── 필터 탭 ──────────────────────────────────────────────────

const FILTER_VALUES: InquiryFilter[] = ['ALL', 'N', 'Y'];
const FILTER_KEYS: Record<InquiryFilter, 'all' | 'unanswered' | 'answered'> = {
  ALL: 'all',
  N: 'unanswered',
  Y: 'answered',
};

// ─── 답변 입력 폼 ──────────────────────────────────────────────

function ReplyForm({
  item,
  onClose,
}: {
  item: InquiryItem;
  onClose: () => void;
}): React.JSX.Element {
  const t = useTranslations('pages.inquiry');
  const [answer, setAnswer] = useState(item.answer);
  const reply = useQoo10ReplyInquiry();

  const handleSubmit = async (): Promise<void> => {
    if (!answer.trim()) return;
    try {
      await reply.mutateAsync({ qnaNo: item.qnaNo, answer: answer.trim() });
      appToaster.create({ type: 'success', title: t('reply.successToast') });
      onClose();
    } catch {
      appToaster.create({ type: 'error', title: t('reply.errorToast') });
    }
  };

  return (
    <Box mt={3} p={3} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
      <Text fontSize="xs" fontWeight="semibold" color="blue.700" mb={2}>
        {t('reply.title')}
      </Text>
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={t('reply.placeholder')}
        size="sm"
        rows={4}
        bg="white"
        resize="vertical"
      />
      <Flex mt={2} gap={2} justify="flex-end">
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t('reply.cancel')}
        </Button>
        <Button
          size="sm"
          colorScheme="blue"
          bg="gray.900"
          color="white"
          _hover={{ bg: 'gray.700' }}
          loading={reply.isPending}
          disabled={!answer.trim()}
          onClick={() => void handleSubmit()}
        >
          {item.isAnswered ? t('reply.submitEdit') : t('reply.submitNew')}
        </Button>
      </Flex>
    </Box>
  );
}

// ─── 문의 행 ──────────────────────────────────────────────────

function InquiryRow({ item }: { item: InquiryItem }): React.JSX.Element {
  const t = useTranslations('pages.inquiry');
  const [isReplying, setIsReplying] = useState(false);

  return (
    <Box
      borderTopWidth="1px"
      borderColor="gray.100"
      px={4}
      py={3}
    >
      {/* 메타 정보 */}
      <Flex align="center" gap={2} mb={1}>
        <Box
          as="span"
          px={1.5}
          py={0.5}
          borderRadius="sm"
          fontSize="xs"
          fontWeight="medium"
          bg={item.isAnswered ? 'green.50' : 'orange.50'}
          color={item.isAnswered ? 'green.700' : 'orange.700'}
          borderWidth="1px"
          borderColor={item.isAnswered ? 'green.200' : 'orange.200'}
        >
          {t(item.isAnswered ? 'status.answered' : 'status.unanswered')}
        </Box>
        <Text fontSize="xs" color="gray.500">
          {item.buyerNick}
        </Text>
        <Text fontSize="xs" color="gray.400">
          {item.questionDate}
        </Text>
        <Text fontSize="xs" color="gray.400" ml="auto">
          {item.itemTitle}
        </Text>
      </Flex>

      {/* 질문 */}
      <Text fontSize="sm" color="gray.800" mb={1} whiteSpace="pre-wrap">
        {item.question}
      </Text>

      {/* 기존 답변 */}
      {item.isAnswered && item.answer && !isReplying && (
        <Box mt={2} pl={3} borderLeftWidth="2px" borderColor="blue.200">
          <Text fontSize="xs" color="gray.500" mb={0.5}>
            {t('reply.sellerLabel', { date: item.answerDate })}
          </Text>
          <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
            {item.answer}
          </Text>
        </Box>
      )}

      {/* 답변 폼 */}
      {isReplying ? (
        <ReplyForm item={item} onClose={() => setIsReplying(false)} />
      ) : (
        <Flex mt={2} justify="flex-end">
          <Button
            size="xs"
            variant="outline"
            borderColor="gray.300"
            onClick={() => setIsReplying(true)}
          >
            {t(item.isAnswered ? 'reply.buttonEdit' : 'reply.buttonNew')}
          </Button>
        </Flex>
      )}
    </Box>
  );
}

// ─── 메인 콘텐츠 ──────────────────────────────────────────────

function InquiryPageContent(): React.JSX.Element {
  const t = useTranslations('pages.inquiry');
  const router = useRouter();
  const { hasKey } = useChannelApiKey('qoo10');
  const [filter, setFilter] = useState<InquiryFilter>('ALL');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 20;
  const { items, totalCount, isLoading, error } = useQoo10Inquiries({
    page,
    pageSize: PAGE_SIZE,
    filter,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (!hasKey) {
    return (
      <EmptyState
        icon={<KeyIcon />}
        title={t('noApiKey.title')}
        description={t('noApiKey.description')}
        action={{ label: t('noApiKey.action'), onClick: () => router.push('/settings/channels') }}
      />
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title={t('title')}
        description={t('description')}
        mb={2}
      />

      {/* 필터 탭 */}
      <Flex
        px={0}
        py={2}
        gap={1}
        align="center"
        borderBottomWidth="1px"
        borderColor="gray.100"
        mb={2}
      >
        {FILTER_VALUES.map((value) => {
          const label = t(`filter.${FILTER_KEYS[value]}`);
          return (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? 'solid' : 'ghost'}
              bg={filter === value ? 'gray.100' : 'transparent'}
              color={filter === value ? 'gray.900' : 'gray.500'}
              _hover={{ bg: filter === value ? 'gray.100' : 'gray.50' }}
              borderRadius="md"
              onClick={() => { setFilter(value); setPage(1); }}
            >
              {label}
            </Button>
          );
        })}
      </Flex>

      {/* 에러 */}
      {error && (
        <Box p={3} borderRadius="md" borderWidth="1px" borderColor="red.200" bg="red.50" mb={3}>
          <Text fontSize="sm" color="red.700">{error.message}</Text>
        </Box>
      )}

      {/* 로딩 */}
      {isLoading && <TableSkeleton rows={8} cols={1} showFilterBar={false} />}

      {/* 빈 상태 */}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={<MessageCircle />}
          title={t('empty.title')}
          description={t('empty.description')}
        />
      )}

      {/* 목록 */}
      {!isLoading && !error && items.length > 0 && (
        <Box
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          bg="white"
          flex="1"
          overflowY="auto"
        >
          {items.map((item) => (
            <InquiryRow key={item.qnaNo} item={item} />
          ))}
        </Box>
      )}

      {/* 페이지네이션 */}
      {!isLoading && totalPages > 1 && (
        <Flex justify="center" align="center" gap={2} pt={4}>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('pagination.prev')}
          </Button>
          <Text fontSize="sm" color="gray.600">
            {page} / {totalPages}
          </Text>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t('pagination.next')}
          </Button>
        </Flex>
      )}
    </Box>
  );
}

export function InquiryPage(): React.JSX.Element {
  return (
    <Suspense fallback={<TableSkeleton rows={8} cols={1} />}>
      <InquiryPageContent />
    </Suspense>
  );
}
