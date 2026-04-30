'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { cn } from '@/lib/utils'

interface BulkActionBarProps {
  selectedCount: number
  totalCount: number
  isAllSelected: boolean
  onSelectAll: (checked: boolean) => void
  onBulkShip: () => void
  onBulkCancel: () => void
  onClearSelection: () => void
  className?: string
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  isAllSelected,
  onSelectAll,
  onBulkShip,
  onBulkCancel,
  onClearSelection,
  className,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            // B&W: Gray background instead of indigo
            'sticky z-[9] border-b border-neutral-200',
            className
          )}
          style={{ 
            top: 'var(--filter-bar-height, 120px)',
            backgroundColor: 'rgb(250, 250, 250)' // neutral-50 in rgb to fix framer motion oklab error
          }}
        >
          <div className="flex items-center justify-between px-4 py-2">
            {/* Left: Select All + Count */}
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={onSelectAll}
                // B&W: Black checkbox
                className="data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
              />
              <span className="text-[13px] font-medium text-neutral-900">
                {selectedCount}건 선택됨
              </span>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {/* B&W: Black primary button */}
              <Button
                size="sm"
                className="h-8 bg-neutral-900 hover:bg-neutral-700 text-white"
                onClick={onBulkShip}
              >
                배송 처리
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  {/* B&W: Outline button, no red */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-neutral-300 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    취소 처리
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>주문 취소 확인</AlertDialogTitle>
                    <AlertDialogDescription>
                      선택한 {selectedCount}건 주문을 취소하시겠습니까?
                      <br />이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>닫기</AlertDialogCancel>
                    {/* B&W: Black confirm button */}
                    <AlertDialogAction
                      className="bg-neutral-900 hover:bg-neutral-700"
                      onClick={onBulkCancel}
                    >
                      {selectedCount}건 취소하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-neutral-500 hover:text-neutral-900"
                onClick={onClearSelection}
              >
                선택 해제
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
