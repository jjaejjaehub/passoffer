'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const qoo10Schema = z.object({
  apiKey: z.string().min(1, 'API 키를 입력해 주세요'),
  sellerId: z.string().min(1, '판매자 ID를 입력해 주세요'),
})

type Qoo10FormData = z.infer<typeof qoo10Schema>

export function Qoo10ApiForm() {
  const [isRevealed, setIsRevealed] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Qoo10FormData>({
    resolver: zodResolver(qoo10Schema),
    defaultValues: {
      apiKey: 'GMKT-LIVE-••••••••••',
      sellerId: 'my_seller_id',
    },
  })

  const onSubmit = async (data: Qoo10FormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Qoo10 API Key saved:', data)
    toast({
      title: '저장됐습니다',
      description: 'Qoo10 API 키가 저장되었습니다.',
    })
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-semibold text-slate-800">API 자격 증명</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm">
              API 키 <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type={isRevealed ? 'text' : 'password'}
                placeholder="GMKT-LIVE-XXXXXXXXXX"
                className={isRevealed ? 'font-mono' : ''}
                {...register('apiKey')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setIsRevealed(!isRevealed)}
              >
                {isRevealed ? '숨기기' : '수정'}
              </Button>
            </div>
            {errors.apiKey && (
              <p className="text-xs text-red-500">{errors.apiKey.message}</p>
            )}
            <p className="text-xs text-slate-500">
              Qoo10 판매자 센터 {'>'} 환경설정 {'>'} API 키 관리에서 발급
            </p>
          </div>

          {/* Seller ID */}
          <div className="space-y-2">
            <Label htmlFor="sellerId" className="text-sm">
              판매자 ID
            </Label>
            <Input
              id="sellerId"
              readOnly
              className="bg-slate-50"
              {...register('sellerId')}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isSubmitting ? '저장 중...' : '저장하기'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
