'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check, X } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type ResendState = 'idle' | 'loading' | 'success' | 'error'

interface ResendTrackingButtonProps {
  historyId: string
  onResend: (historyId: string) => Promise<void>
}

export function ResendTrackingButton({ historyId, onResend }: ResendTrackingButtonProps) {
  const [state, setState] = useState<ResendState>('idle')
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleResend = async () => {
    setDialogOpen(false)
    setState('loading')

    try {
      await onResend(historyId)
      setState('success')
      // Reset to idle after 2 seconds
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
    }
  }

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                재전송
              </Button>
            </AlertDialogTrigger>
          </motion.div>
        )}

        {state === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-amber-600"
          >
            <Loader2 className="size-3.5 animate-spin" />
            <span className="text-xs">전송 중...</span>
          </motion.div>
        )}

        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-green-600"
          >
            <Check className="size-3.5" />
            <span className="text-xs font-medium">완료</span>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <X className="size-3.5" />
                    <span className="text-xs font-medium">실패</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  다시 시도하거나 고객센터에 문의하세요
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>송장 재전송</AlertDialogTitle>
          <AlertDialogDescription>
            이 건의 송장 정보를 Qoo10에 다시 전송하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleResend}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            전송하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
