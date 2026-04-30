'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Channel } from '@/types/channel'

interface ConnectedPanelProps {
  channel: Channel
  onDisconnected: () => void
}

// Count-up animation component
function CountUpText({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const duration = 600
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(eased * value))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  return <span className={className}>{display.toLocaleString('ko-KR')}</span>
}

// B&W Stat box component
function StatBox({
  label,
  value,
  unit,
  isText,
}: {
  label: string
  value: number | string
  unit?: string
  isText?: boolean
}) {
  return (
    <div className="rounded-md bg-neutral-50 p-4 text-center">
      <p className="mb-1 text-[11px] text-neutral-400">{label}</p>
      {isText ? (
        <p className="text-sm font-semibold text-neutral-700">{value}</p>
      ) : (
        <div className="flex items-baseline justify-center gap-0.5">
          <CountUpText
            value={value as number}
            className="text-xl font-bold text-neutral-900"
          />
          {unit && <span className="text-xs text-neutral-500">{unit}</span>}
        </div>
      )}
    </div>
  )
}

export function ConnectedPanel({ channel, onDisconnected }: ConnectedPanelProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  const handleSync = async () => {
    setIsSyncing(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSyncing(false)
    toast({
      title: '수집을 시작했습니다',
      description: `${channel.name}에서 새 주문을 수집합니다.`,
    })
  }

  const handleDisconnect = () => {
    onDisconnected()
    toast({
      title: `${channel.name} 연결이 해제됐습니다`,
      description: '기존 수집 데이터는 유지됩니다.',
    })
  }

  const stats =
    channel.id === 'qoo10'
      ? { today: 47, month: 1247, lastSync: '3분 전' }
      : { today: 12, month: 384, lastSync: '5분 전' }

  return (
    <div className="flex flex-col gap-4">
      {/* Card 1: Connection Status Header - B&W */}
      <Card className="border-neutral-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* B&W: Channel initial in bordered box */}
              <div className="flex size-9 items-center justify-center rounded-md border border-neutral-200">
                <span className="text-sm font-bold text-neutral-600">
                  {channel.initial}
                </span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  {channel.name}
                </h3>
                <div className="flex items-center gap-1.5">
                  {/* B&W: Black square for connected */}
                  <span className="size-1.5 rounded-[2px] bg-neutral-900" />
                  <span className="text-xs text-neutral-400">
                    연결됨 · 마지막 확인: 2분 전
                  </span>
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  연결 해제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{channel.name} 연결 해제</AlertDialogTitle>
                  <AlertDialogDescription>
                    연결을 해제하면 새 주문 수집이 중단됩니다. 기존 수집 데이터는
                    유지됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  {/* B&W: Black confirm button */}
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-neutral-900 hover:bg-neutral-700"
                  >
                    연결 해제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Collection Status - B&W */}
      <Card className="border-neutral-200">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-medium text-neutral-800">수집 현황</h4>
            {/* B&W: Gray outline badge */}
            <span className="rounded border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-500">
              자동 수집 중
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <StatBox label="오늘 수집" value={stats.today} unit="건" />
            <StatBox label="이번 달" value={stats.month} unit="건" />
            <StatBox label="마지막 수집" value={stats.lastSync} isText />
            <StatBox label="다음 수집" value="2분 후" isText />
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="border-neutral-200 text-neutral-700 hover:border-neutral-400"
            >
              {isSyncing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              {isSyncing ? '수집 중...' : '지금 수집하기'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: API Credentials - B&W */}
      <Card className="border-neutral-200">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-medium text-neutral-800">
              API 자격 증명
            </h4>
            <span className="text-[11px] text-neutral-400">암호화 저장됨</span>
          </div>

          {channel.id === 'qoo10' && <Qoo10ApiFormInline />}
          {channel.id === 'rakuten' && <RakutenApiFormInline />}
        </CardContent>
      </Card>
    </div>
  )
}

// B&W Inline API forms for edit mode
function Qoo10ApiFormInline() {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    toast({
      title: '저장됐습니다',
      description: 'Qoo10 API 키가 저장되었습니다.',
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">API 키</label>
        <div className="flex gap-2">
          <input
            type={isRevealed ? 'text' : 'password'}
            defaultValue="GMKT-LIVE-••••••••••"
            className={`flex h-9 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900 ${isRevealed ? 'font-mono' : ''}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-neutral-500 hover:text-neutral-900"
            onClick={() => setIsRevealed(!isRevealed)}
          >
            {isRevealed ? '숨기기' : '수정'}
          </Button>
        </div>
        <p className="text-xs text-neutral-400">
          Qoo10 판매자 센터 {'>'} 환경설정 {'>'} API 키 관리에서 발급
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">판매자 ID</label>
        <input
          type="text"
          defaultValue="my_seller_id"
          readOnly
          className="flex h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={isSubmitting}
        className="bg-neutral-900 hover:bg-neutral-700"
      >
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        {isSubmitting ? '저장 중...' : '저장하기'}
      </Button>
    </div>
  )
}

function RakutenApiFormInline() {
  const [revealed1, setRevealed1] = useState(false)
  const [revealed2, setRevealed2] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    toast({
      title: '저장됐습니다',
      description: '라쿠텐 API 키가 저장되었습니다.',
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">
          Service Secret
        </label>
        <div className="flex gap-2">
          <input
            type={revealed1 ? 'text' : 'password'}
            defaultValue="••••••••••••••••••••••••••••••••"
            className={`flex h-9 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900 ${revealed1 ? 'font-mono text-xs' : ''}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-neutral-500 hover:text-neutral-900"
            onClick={() => setRevealed1(!revealed1)}
          >
            {revealed1 ? '숨기기' : '수정'}
          </Button>
        </div>
        <p className="text-xs text-neutral-400">
          RMS {'>'} API 설정 {'>'} Service Secret에서 확인
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">
          License Key
        </label>
        <div className="flex gap-2">
          <input
            type={revealed2 ? 'text' : 'password'}
            defaultValue="••••••••••••••••••••••••••••••••"
            className={`flex h-9 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900 ${revealed2 ? 'font-mono text-xs' : ''}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-neutral-500 hover:text-neutral-900"
            onClick={() => setRevealed2(!revealed2)}
          >
            {revealed2 ? '숨기기' : '수정'}
          </Button>
        </div>
        <p className="text-xs text-neutral-400">
          Service Secret과 함께 발급됩니다
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">샵 URL</label>
        <div className="flex">
          <span className="flex items-center rounded-l-md border border-r-0 border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500">
            https://
          </span>
          <input
            type="text"
            defaultValue="my-shop"
            readOnly
            className="flex h-9 w-full border border-x-0 border-neutral-200 bg-neutral-50 px-3 py-1 text-sm"
          />
          <span className="flex items-center rounded-r-md border border-l-0 border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500">
            .shop.rakuten.co.jp
          </span>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isSubmitting}
        className="bg-neutral-900 hover:bg-neutral-700"
      >
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        {isSubmitting ? '저장 중...' : '저장하기'}
      </Button>
    </div>
  )
}
