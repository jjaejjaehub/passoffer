'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Bell, Check, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { COMING_SOON_CHANNELS } from '@/constants/channels'
import type { Channel } from '@/types/channel'

const COMING_SOON_FEATURES: Record<string, string[]> = {
  amazon: ['주문 자동 수집 (SP-API)', '상품·재고 동기화', 'FBA 재고 연동'],
  shopify: [
    '주문 Webhook 실시간 수신',
    '상품·재고 양방향 동기화',
    '멀티 스토어 지원',
  ],
}

export function ComingSoonSection() {
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium text-neutral-500">
          추가 예정 채널
        </p>
        <p className="text-xs text-neutral-400">Phase 2</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {COMING_SOON_CHANNELS.map((channel) => (
          <ComingSoonCard key={channel.id} channel={channel} />
        ))}
      </div>
    </div>
  )
}

function ComingSoonCard({ channel }: { channel: Channel }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const isValidEmail = email.includes('@') && email.includes('.')
  const features = COMING_SOON_FEATURES[channel.id] || []

  const handleSubmit = () => {
    setSubmitted(true)
    toast({
      title: '신청됐습니다',
      description: `${channel.name} 출시 시 ${email}로 알려드립니다.`,
    })
    setIsOpen(false)
  }

  return (
    // B&W: Dashed border, reduced opacity
    <Card className="border-dashed border-neutral-200 bg-white opacity-60 transition-all duration-150 hover:opacity-90">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* B&W: Channel initial in bordered box */}
            <div className="flex size-8 items-center justify-center rounded-md border border-neutral-200">
              <span className="text-[11px] font-bold text-neutral-400">
                {channel.initial}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-600">
                  {channel.name}
                </span>
                {/* B&W: Gray outline badge */}
                <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400">
                  준비 중
                </span>
              </div>
              <p className="text-xs text-neutral-400">{channel.description}</p>
            </div>
          </div>

          {!submitted ? (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-neutral-400 hover:text-neutral-700"
                >
                  <Bell className="size-3.5" />
                  알림 신청
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>{channel.name} 출시 알림 신청</DialogTitle>
                  <DialogDescription>
                    출시되면 이메일로 가장 먼저 알려드립니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    type="email"
                    placeholder="example@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-neutral-500"
                    onClick={() => setIsOpen(false)}
                  >
                    취소
                  </Button>
                  {/* B&W: Black submit button */}
                  <Button
                    size="sm"
                    disabled={!isValidEmail}
                    onClick={handleSubmit}
                    className="bg-neutral-900 hover:bg-neutral-700"
                  >
                    신청하기
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <CheckCircle className="size-3.5" />
              신청 완료
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1.5">
          <p className="text-[11px] font-medium text-neutral-400">
            지원 예정 기능
          </p>
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-1.5">
              <Check className="size-3 text-neutral-400" />
              <span className="text-xs text-neutral-500">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
