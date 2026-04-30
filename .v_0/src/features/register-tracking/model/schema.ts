import { z } from 'zod'

export const trackingSchema = z.object({
  expectedShipDate: z.string().optional(),
  carrierId: z
    .enum(['cj', 'lotte', 'hanjin', 'epost', 'etc'], {
      required_error: '택배사를 선택해 주세요',
    })
    .optional(),
  trackingNumber: z
    .string()
    .regex(/^[\d\-]*$/, '숫자와 하이픈(-)만 입력 가능합니다')
    .optional(),
  sendToChannel: z.boolean().default(true),
  memo: z.string().max(200, '200자 이내로 입력해 주세요').optional(),
})

export type TrackingFormData = z.infer<typeof trackingSchema>
