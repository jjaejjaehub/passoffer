'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api';
import { inquiryQueries } from './inquiryQueries';

export function useQoo10ReplyInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ qnaNo, answer }: { qnaNo: number; answer: string }): Promise<void> => {
      await http.post('/api/qoo10/inquiry/reply', { qnaNo, answer });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inquiryQueries.all() });
    },
  });
}
