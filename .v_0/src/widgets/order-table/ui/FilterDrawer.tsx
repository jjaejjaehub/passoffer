'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SHIPPING_METHODS, ASSIGNEES } from '@/src/entities/order'
import type { OrderFilters } from '@/src/entities/order'

interface FilterDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: OrderFilters
  onFiltersChange: (filters: Partial<OrderFilters>) => void
  onReset: () => void
  activeFilterCount: number
}

export function FilterDrawer({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onReset,
  activeFilterCount,
}: FilterDrawerProps) {
  const handleShippingMethodToggle = (methodId: string) => {
    const current = filters.shippingMethods || []
    const updated = current.includes(methodId)
      ? current.filter((id) => id !== methodId)
      : [...current, methodId]
    onFiltersChange({ shippingMethods: updated.length ? updated : undefined })
  }

  const handleApply = () => {
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:max-w-[360px]">
        <SheetHeader>
          <SheetTitle>상세 필터</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Section 1: Shipping Method */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-900">
              배송 방법
            </Label>
            <div className="space-y-2">
              {SHIPPING_METHODS.map((method) => (
                <div key={method.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`shipping-${method.id}`}
                    checked={
                      filters.shippingMethods?.includes(method.id) || false
                    }
                    onCheckedChange={() =>
                      handleShippingMethodToggle(method.id)
                    }
                  />
                  <Label
                    htmlFor={`shipping-${method.id}`}
                    className="text-sm font-normal text-slate-700 cursor-pointer"
                  >
                    {method.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Amount Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-900">
              금액 범위
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="₩0"
                className="h-9"
                value={filters.minAmount || ''}
                onChange={(e) =>
                  onFiltersChange({
                    minAmount: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
              <span className="text-slate-400">~</span>
              <Input
                type="number"
                placeholder="₩0"
                className="h-9"
                value={filters.maxAmount || ''}
                onChange={(e) =>
                  onFiltersChange({
                    maxAmount: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          {/* Section 3: Sort */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-900">
              정렬 기준
            </Label>
            <RadioGroup
              value={filters.sortBy}
              onValueChange={(value) =>
                onFiltersChange({
                  sortBy: value as 'latest' | 'amount_high' | 'delayed',
                })
              }
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="latest" id="sort-latest" />
                <Label
                  htmlFor="sort-latest"
                  className="text-sm font-normal text-slate-700 cursor-pointer"
                >
                  최신순
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="amount_high" id="sort-amount" />
                <Label
                  htmlFor="sort-amount"
                  className="text-sm font-normal text-slate-700 cursor-pointer"
                >
                  금액 높은순
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="delayed" id="sort-delayed" />
                <Label
                  htmlFor="sort-delayed"
                  className="text-sm font-normal text-slate-700 cursor-pointer"
                >
                  처리 지연순
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Section 4: Assignee */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-900">
              처리 담당자
            </Label>
            <Select
              value={filters.assignee || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  assignee: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="담당자 선택" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNEES.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="flex-row justify-between gap-2 border-t pt-4">
          <Button
            variant="ghost"
            onClick={onReset}
            className="text-slate-600 gap-1.5"
          >
            초기화
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="h-5 min-w-5 px-1.5 bg-slate-100"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Button
            onClick={handleApply}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            필터 적용
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
