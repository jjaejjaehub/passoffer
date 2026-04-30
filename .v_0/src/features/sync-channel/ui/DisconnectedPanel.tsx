'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Link2,
  ArrowLeft,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Channel } from '@/types/channel'

interface DisconnectedPanelProps {
  channel: Channel
  onConnected: () => void
}

export function DisconnectedPanel({
  channel,
  onConnected,
}: DisconnectedPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const { toast } = useToast()

  const handleConnected = () => {
    onConnected()
    toast({
      title: `${channel.name} 연결이 완료됐습니다`,
      description: '주문 수집이 시작됩니다.',
    })
  }

  const features = [
    { icon: ShoppingCart, label: '주문 자동 수집' },
    { icon: Package, label: '상품·재고 동기화' },
    { icon: TrendingUp, label: '매출 통합 관리' },
  ]

  const descriptionText =
    channel.id === 'rakuten'
      ? 'Rakuten RMS API 키를 등록하면 일본 라쿠텐 주문을 자동으로 수집할 수 있습니다.'
      : 'API 키를 등록하면 주문을 자동으로 수집할 수 있습니다.'

  return (
    <AnimatePresence mode="wait">
      {!showForm ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          {/* B&W Empty State Card */}
          <Card className="border-neutral-200">
            <CardContent className="p-12">
              <div className="flex flex-col items-center gap-8">
                {/* B&W: Disconnected Icon - bordered box with gray initial */}
                <div className="relative inline-flex">
                  <div className="flex size-16 items-center justify-center rounded-xl border border-neutral-200">
                    <span className="text-2xl font-bold text-neutral-300">
                      {channel.initial}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-white bg-neutral-400">
                    <X className="size-2.5 text-white" />
                  </div>
                </div>

                {/* Title & Description */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {channel.name} 미연결
                  </h2>
                  <p className="max-w-[320px] text-[13px] text-neutral-400">
                    {descriptionText}
                  </p>
                </div>

                {/* B&W Feature Grid */}
                <div className="grid w-full max-w-[380px] grid-cols-3 gap-3">
                  {features.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <item.icon className="size-4 text-neutral-400" />
                      <span className="text-center text-[11px] text-neutral-500">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* B&W Connect Button - Black */}
                <Button
                  size="default"
                  className="bg-neutral-900 hover:bg-neutral-700"
                  onClick={() => setShowForm(true)}
                >
                  <Link2 className="mr-2 size-4" />
                  {channel.name} 연결하기
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          <Card className="mx-auto max-w-[540px] border-neutral-200">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-neutral-500 hover:text-neutral-900"
                  onClick={() => setShowForm(false)}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <div>
                  <h3 className="font-semibold text-neutral-800">
                    {channel.name} API 키 등록
                  </h3>
                  <p className="text-xs text-neutral-400">
                    아래 정보를 입력하면 즉시 연결됩니다
                  </p>
                </div>
              </div>

              {channel.id === 'qoo10' && (
                <Qoo10ApiFormConnect onSuccess={handleConnected} />
              )}
              {channel.id === 'rakuten' && (
                <RakutenApiFormConnect onSuccess={handleConnected} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// B&W Connect mode API forms
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Info, ExternalLink } from 'lucide-react'

const qoo10Schema = z.object({
  apiKey: z.string().min(1, 'API 키를 입력해 주세요'),
  sellerId: z.string().min(1, '판매자 ID를 입력해 주세요'),
})

type Qoo10FormData = z.infer<typeof qoo10Schema>

function Qoo10ApiFormConnect({ onSuccess }: { onSuccess: () => void }) {
  const [isRevealed, setIsRevealed] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Qoo10FormData>({
    resolver: zodResolver(qoo10Schema),
  })

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="apiKey" className="text-sm">
          API 키 <span className="text-neutral-400">*</span>
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
            className="shrink-0 text-neutral-500 hover:text-neutral-900"
            onClick={() => setIsRevealed(!isRevealed)}
          >
            {isRevealed ? '숨기기' : '보기'}
          </Button>
        </div>
        {errors.apiKey && (
          <p className="text-xs text-neutral-500">{errors.apiKey.message}</p>
        )}
        <p className="text-xs text-neutral-400">
          Qoo10 판매자 센터 {'>'} 환경설정 {'>'} API 키 관리에서 발급
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sellerId" className="text-sm">
          판매자 ID <span className="text-neutral-400">*</span>
        </Label>
        <Input
          id="sellerId"
          placeholder="your_seller_id"
          {...register('sellerId')}
        />
        {errors.sellerId && (
          <p className="text-xs text-neutral-500">{errors.sellerId.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-neutral-900 hover:bg-neutral-700"
      >
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        {isSubmitting ? '연결 중...' : '연결하기'}
      </Button>
    </form>
  )
}

const rakutenSchema = z.object({
  serviceSecret: z.string().min(32, 'Service Secret은 32자 이상입니다'),
  licenseKey: z.string().min(32, 'License Key는 32자 이상입니다'),
  shopUrl: z
    .string()
    .min(1, '샵 URL을 입력해 주세요')
    .regex(/^[a-z0-9-]+$/, '영소문자, 숫자, 하이픈(-)만 사용 가능합니다'),
})

type RakutenFormData = z.infer<typeof rakutenSchema>

function RakutenApiFormConnect({ onSuccess }: { onSuccess: () => void }) {
  const [revealed1, setRevealed1] = useState(false)
  const [revealed2, setRevealed2] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RakutenFormData>({
    resolver: zodResolver(rakutenSchema),
  })

  const shopUrl = watch('shopUrl')

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* B&W Alert */}
      <Alert className="border-l-[3px] border-l-neutral-300 bg-neutral-50">
        <Info className="size-4 text-neutral-500" />
        <AlertDescription className="text-xs text-neutral-600">
          Rakuten RMS (Merchant Server) API 키가 필요합니다.{' '}
          <a
            href="#"
            className="inline-flex items-center gap-1 font-medium text-neutral-900 hover:underline"
          >
            발급 방법 보기 <ExternalLink className="size-3" />
          </a>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="serviceSecret" className="text-sm">
          Service Secret <span className="text-neutral-400">*</span>
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
            className="shrink-0 text-neutral-500 hover:text-neutral-900"
            onClick={() => setRevealed1(!revealed1)}
          >
            {revealed1 ? '숨기기' : '보기'}
          </Button>
        </div>
        {errors.serviceSecret && (
          <p className="text-xs text-neutral-500">
            {errors.serviceSecret.message}
          </p>
        )}
        <p className="text-xs text-neutral-400">
          RMS {'>'} API 설정 {'>'} Service Secret에서 확인
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="licenseKey" className="text-sm">
          License Key <span className="text-neutral-400">*</span>
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
            className="shrink-0 text-neutral-500 hover:text-neutral-900"
            onClick={() => setRevealed2(!revealed2)}
          >
            {revealed2 ? '숨기기' : '보기'}
          </Button>
        </div>
        {errors.licenseKey && (
          <p className="text-xs text-neutral-500">{errors.licenseKey.message}</p>
        )}
        <p className="text-xs text-neutral-400">
          Service Secret과 함께 발급됩니다
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shopUrl" className="text-sm">
          샵 URL <span className="text-neutral-400">*</span>
        </Label>
        <div className="flex">
          <span className="flex items-center rounded-l-md border border-r-0 border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500">
            https://
          </span>
          <Input
            id="shopUrl"
            placeholder="your-shop-name"
            className="rounded-none border-x-0"
            {...register('shopUrl')}
          />
          <span className="flex items-center rounded-r-md border border-l-0 border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500">
            .shop.rakuten.co.jp
          </span>
        </div>
        {errors.shopUrl && (
          <p className="text-xs text-neutral-500">{errors.shopUrl.message}</p>
        )}
        {shopUrl && !errors.shopUrl && (
          <p className="text-xs text-neutral-500">
            접속 URL: https://{shopUrl}.shop.rakuten.co.jp
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-neutral-900 hover:bg-neutral-700"
      >
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        {isSubmitting ? '연결 중...' : '연결하기'}
      </Button>
    </form>
  )
}
