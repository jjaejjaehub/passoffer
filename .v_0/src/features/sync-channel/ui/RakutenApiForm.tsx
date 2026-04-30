'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Info, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const rakutenSchema = z.object({
  serviceSecret: z.string().min(32, 'Service Secret은 32자 이상입니다'),
  licenseKey: z.string().min(32, 'License Key는 32자 이상입니다'),
  shopUrl: z
    .string()
    .min(1, '샵 URL을 입력해 주세요')
    .regex(
      /^[a-z0-9-]+$/,
      '영소문자, 숫자, 하이픈(-)만 사용 가능합니다'
    ),
})

type RakutenFormData = z.infer<typeof rakutenSchema>

export function RakutenApiForm() {
  const [revealed1, setRevealed1] = useState(false)
  const [revealed2, setRevealed2] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RakutenFormData>({
    resolver: zodResolver(rakutenSchema),
    defaultValues: {
      serviceSecret: '',
      licenseKey: '',
      shopUrl: '',
    },
  })

  const shopUrl = watch('shopUrl')

  const onSubmit = async (data: RakutenFormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Rakuten API Key saved:', data)
    toast({
      title: '라쿠텐 API 키가 저장됐습니다',
      description: 'API 키가 안전하게 저장되었습니다.',
    })
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-4 font-semibold text-slate-800">API 자격 증명</h3>

        {/* Info Alert */}
        <Alert className="mb-4 border-l-4 border-l-blue-500 bg-blue-50">
          <Info className="size-4 text-blue-500" />
          <AlertDescription className="text-xs text-blue-700">
            Rakuten RMS (Merchant Server) API 키가 필요합니다.{' '}
            <a
              href="#"
              className="inline-flex items-center gap-1 font-medium text-orange-500 hover:underline"
            >
              발급 방법 보기 <ExternalLink className="size-3" />
            </a>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Service Secret */}
          <div className="space-y-2">
            <Label htmlFor="serviceSecret" className="text-sm">
              Service Secret <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="serviceSecret"
                type={revealed1 ? 'text' : 'password'}
                placeholder="32자 이상의 Service Secret"
                className={revealed1 ? 'font-mono text-xs' : ''}
                {...register('serviceSecret')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setRevealed1(!revealed1)}
              >
                {revealed1 ? '숨기기' : '수정'}
              </Button>
            </div>
            {errors.serviceSecret && (
              <p className="text-xs text-red-500">
                {errors.serviceSecret.message}
              </p>
            )}
            <p className="text-xs text-slate-500">
              RMS {'>'} API 설정 {'>'} Service Secret에서 확인
            </p>
          </div>

          {/* License Key */}
          <div className="space-y-2">
            <Label htmlFor="licenseKey" className="text-sm">
              License Key <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="licenseKey"
                type={revealed2 ? 'text' : 'password'}
                placeholder="32자 이상의 License Key"
                className={revealed2 ? 'font-mono text-xs' : ''}
                {...register('licenseKey')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setRevealed2(!revealed2)}
              >
                {revealed2 ? '숨기기' : '수정'}
              </Button>
            </div>
            {errors.licenseKey && (
              <p className="text-xs text-red-500">
                {errors.licenseKey.message}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Service Secret과 함께 발급됩니다
            </p>
          </div>

          {/* Shop URL */}
          <div className="space-y-2">
            <Label htmlFor="shopUrl" className="text-sm">
              샵 URL <span className="text-red-500">*</span>
            </Label>
            <div className="flex">
              <span className="flex items-center rounded-l-md border border-r-0 bg-slate-50 px-3 text-xs text-slate-500">
                https://
              </span>
              <Input
                id="shopUrl"
                placeholder="your-shop-name"
                className="rounded-none border-x-0"
                {...register('shopUrl')}
              />
              <span className="flex items-center rounded-r-md border border-l-0 bg-slate-50 px-3 text-xs text-slate-500">
                .shop.rakuten.co.jp
              </span>
            </div>
            {errors.shopUrl && (
              <p className="text-xs text-red-500">{errors.shopUrl.message}</p>
            )}
            {shopUrl && !errors.shopUrl && (
              <p className="text-xs text-orange-500">
                접속 URL: https://{shopUrl}.shop.rakuten.co.jp
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isSubmitting ? '저장 중...' : '저장하기'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
