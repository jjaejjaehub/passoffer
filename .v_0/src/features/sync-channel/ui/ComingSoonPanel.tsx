'use client'

import { useState } from 'react'
import type { ChannelId } from '@/types/channel'
import { CHANNEL_CONFIG } from '@/constants/channels'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Bell, Check, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ComingSoonPanelProps {
  channelId: ChannelId
}

const colorMap: Record<string, { bg: string; text: string }> = {
  rose: { bg: 'bg-rose-100', text: 'text-rose-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600' },
}

const COMING_SOON_FEATURES: Record<ChannelId, string[]> = {
  qoo10: [],
  rakuten: [],
  amazon: [
    '주문 자동 수집 (MWS/SP-API)',
    '상품·재고 동기화',
    'FBA 재고 연동',
    '운송장 번호 전송',
    '정산 데이터 연동',
  ],
  shopify: [
    '주문 Webhook 실시간 수신',
    '상품·재고 양방향 동기화',
    '배송 추적 자동 업데이트',
    '멀티 스토어 지원',
  ],
}

export function ComingSoonPanel({ channelId }: ComingSoonPanelProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const channel = CHANNEL_CONFIG[channelId]
  const colors = colorMap[channel.color] || colorMap.amber
  const features = COMING_SOON_FEATURES[channelId] || []

  const getRegionText = () => {
    if (channel.region === 'US') return '미국 마켓 지원 예정'
    if (channel.region === 'GLOBAL') return '글로벌 마켓 지원 예정'
    return ''
  }

  const handleSubmit = () => {
    setSubmitted(true)
    setIsOpen(false)
    toast({
      title: '신청됐습니다',
      description: `${channel.name} 출시 시 ${email}로 알려드립니다.`,
    })
  }

  const isValidEmail = email.includes('@') && email.includes('.')

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 p-8">
        {/* Channel icon (dimmed) */}
        <div
          className={cn(
            'flex size-16 items-center justify-center rounded-2xl opacity-60',
            'bg-slate-100'
          )}
        >
          <span className="text-2xl font-extrabold text-slate-400">
            {channel.initial}
          </span>
        </div>

        {/* Channel info */}
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-600">
              {channel.name}
            </span>
            <Badge variant="outline" className="text-slate-400">
              준비 중
            </Badge>
          </div>
          <p className="text-sm text-slate-400">{channel.description}</p>
          {getRegionText() && (
            <p className="text-sm text-slate-400">{getRegionText()}</p>
          )}
        </div>

        <Separator className="max-w-[200px]" />

        {/* Feature list */}
        <div className="flex w-full max-w-[320px] flex-col items-start gap-2">
          <span className="mb-1 text-xs font-semibold text-slate-500">
            지원 예정 기능
          </span>
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="size-4 text-slate-400" />
              <span className="text-sm text-slate-600">{feature}</span>
            </div>
          ))}
        </div>

        {/* Notification signup */}
        {!submitted ? (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsOpen(true)}
          >
            <Bell className="size-4" />
            출시 알림 신청하기
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="size-4" />
            <span className="text-sm font-medium">알림 신청 완료</span>
          </div>
        )}

        {/* Notification signup modal */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{channel.name} 출시 알림 신청</DialogTitle>
              <DialogDescription>
                {channel.name} 채널이 출시되면 이메일로 알려드립니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="email" className="text-sm">
                이메일 주소
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValidEmail) {
                    handleSubmit()
                  }
                }}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                disabled={!isValidEmail}
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                신청하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
