'use client'

import { useState, useCallback } from 'react'
import { format, addDays, isAfter, startOfDay, parse, isValid } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShipDateCellProps {
  orderId: string
  value: string | null // "2024.01.17" 형식
  onChange: (date: string | null) => void
  isDisabled?: boolean
  onDateSelected?: () => void // 날짜 선택 완료 후 콜백 (운송장 입력으로 포커스 이동)
}

const today = startOfDay(new Date())

export function ShipDateCell({
  orderId,
  value,
  onChange,
  isDisabled = false,
  onDateSelected,
}: ShipDateCellProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const [inputError, setInputError] = useState(false)

  const quickDates = [
    { label: '오늘', date: today },
    { label: '내일', date: addDays(today, 1) },
    { label: '모레', date: addDays(today, 2) },
  ]

  const handleQuickSelect = useCallback(
    (date: Date) => {
      const formatted = format(date, 'yyyy.MM.dd')
      setInputValue(formatted)
      setInputError(false)
      onChange(formatted)
      setOpen(false)
      onDateSelected?.()
    },
    [onChange, onDateSelected]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value
      // 자동 포맷팅: 숫자만 추출 후 YYYY.MM.DD 형식으로
      const digits = val.replace(/\D/g, '')
      if (digits.length <= 4) {
        val = digits
      } else if (digits.length <= 6) {
        val = `${digits.slice(0, 4)}.${digits.slice(4)}`
      } else {
        val = `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`
      }
      setInputValue(val)

      // 유효성 검사
      if (val.length === 10) {
        const parsed = parse(val, 'yyyy.MM.dd', new Date())
        if (isValid(parsed) && isAfter(parsed, addDays(today, -1))) {
          setInputError(false)
        } else {
          setInputError(true)
        }
      } else {
        setInputError(false)
      }
    },
    []
  )

  const handleConfirm = useCallback(() => {
    if (inputValue.length === 10) {
      const parsed = parse(inputValue, 'yyyy.MM.dd', new Date())
      if (isValid(parsed) && isAfter(parsed, addDays(today, -1))) {
        onChange(inputValue)
        setOpen(false)
        onDateSelected?.()
        return
      }
    }
    setInputError(true)
  }, [inputValue, onChange, onDateSelected])

  const handleReset = useCallback(() => {
    setInputValue('')
    setInputError(false)
    onChange(null)
    setOpen(false)
  }, [onChange])

  if (isDisabled) {
    return (
      <span className="text-sm text-slate-400">
        {value || '—'}
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 px-2 text-xs font-normal justify-start',
            value ? 'text-slate-700' : 'text-slate-400'
          )}
        >
          {value ? (
            <>
              <span>{value}</span>
              <Pencil className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              <Calendar className="mr-1 h-3 w-3" />
              <span>날짜 선택</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start">
        <div className="space-y-3">
          {/* Quick Select */}
          <div className="flex gap-1">
            {quickDates.map((qd) => (
              <Button
                key={qd.label}
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => handleQuickSelect(qd.date)}
              >
                {qd.label}
              </Button>
            ))}
          </div>

          {/* Manual Input */}
          <div className="space-y-1">
            <Input
              placeholder="YYYY.MM.DD"
              value={inputValue}
              onChange={handleInputChange}
              className={cn(
                'h-8 text-sm font-mono',
                inputError && 'border-red-300 focus-visible:ring-red-200'
              )}
              maxLength={10}
            />
            <p className="text-xs text-slate-400">
              오늘 이후 날짜를 입력하세요
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleReset}
            >
              초기화
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
              onClick={handleConfirm}
              disabled={inputError || inputValue.length !== 10}
            >
              확인
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
