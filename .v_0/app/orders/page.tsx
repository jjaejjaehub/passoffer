'use client'

import { Suspense, useState, useCallback, useMemo } from 'react'
import { AppShell } from '@/components/oms/app-shell'
import { EmptyState } from '@/components/oms/empty-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  OrderFilterBar,
  FilterDrawer,
  BulkActionBar,
  OrderTable,
} from '@/src/widgets/order-table'
import { OrderQuickDrawer } from '@/src/widgets/order-detail-panel'
import { BulkTrackingModal } from '@/src/features/register-tracking'
import { useOrderFilter } from '@/src/features/filter-orders'
import type { Order, OrderFilters } from '@/src/entities/order'
import type { OrderStatus } from '@/types/channel'
import type { CarrierId } from '@/src/entities/delivery/model/types'
import { CARRIER_CONFIG } from '@/src/entities/delivery/model/constants'
import { CHANNEL_NAMES } from '@/constants/channels'
import { MOCK_ORDERS } from '@/src/shared/mocks/orders'
import { Plug, ShoppingBag, SearchX, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Simulated states
type EmptyStateType = 'none' | 'no-channel' | 'no-orders' | 'no-results'

function OrdersPageContent() {
  // Orders state (simulated)
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // useOrderFilter hook with URL sync
  const {
    channelId,
    status,
    dateRange,
    search,
    channelCounts,
    statusCounts,
    filteredOrders,
    setChannel,
    setStatus,
    setDateRange,
    setSearch,
  } = useOrderFilter(orders)

  // UI state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Additional filters (for filter drawer)
  const [advancedFilters, setAdvancedFilters] = useState<Partial<OrderFilters>>({
    sortBy: 'latest',
  })

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (advancedFilters.shippingMethods?.length) count++
    if (advancedFilters.minAmount || advancedFilters.maxAmount) count++
    if (advancedFilters.sortBy !== 'latest') count++
    if (advancedFilters.assignee) count++
    return count
  }, [advancedFilters])

  // Determine empty state
  const emptyStateType: EmptyStateType = useMemo(() => {
    if (filteredOrders.length === 0) {
      if (search || status !== '전체') {
        return 'no-results'
      }
      return 'no-orders'
    }
    return 'none'
  }, [filteredOrders, search, status])

  // Selected orders for bulk modal
  const selectedOrders = useMemo(() => {
    return orders.filter((o) => selectedIds.includes(o.id))
  }, [orders, selectedIds])

  // Handlers
  const handleAdvancedFiltersChange = useCallback(
    (newFilters: Partial<OrderFilters>) => {
      setAdvancedFilters((prev) => ({ ...prev, ...newFilters }))
    },
    []
  )

  const handleResetFilters = useCallback(() => {
    setChannel('all')
    setStatus('전체')
    setSearch('')
    setAdvancedFilters({ sortBy: 'latest' })
  }, [setChannel, setStatus, setSearch])

  const handleStatusChange = useCallback(
    (orderId: string, newStatus: OrderStatus) => {
      // If shipping, open bulk modal for single order
      if (newStatus === '배송중') {
        const order = orders.find((o) => o.id === orderId)
        if (order) {
          setSelectedIds([orderId])
          setBulkModalOpen(true)
        }
        return
      }

      // Otherwise, update status directly
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                updatedAt: new Date(),
                history: [
                  ...order.history,
                  {
                    id: `hist-${Date.now()}`,
                    status: newStatus,
                    timestamp: new Date(),
                    actor: '김운영',
                  },
                ],
              }
            : order
        )
      )
      toast.success(`주문 ${orderId}이(가) ${newStatus}으로 변경되었습니다`)
    },
    [orders]
  )

  const handleBulkShip = useCallback(() => {
    setBulkModalOpen(true)
  }, [])

  const handleBulkCancel = useCallback(() => {
    setOrders((prev) =>
      prev.map((order) =>
        selectedIds.includes(order.id)
          ? {
              ...order,
              status: '취소' as OrderStatus,
              updatedAt: new Date(),
              history: [
                ...order.history,
                {
                  id: `hist-${Date.now()}`,
                  status: '취소' as OrderStatus,
                  timestamp: new Date(),
                  actor: '김운영',
                  note: '일괄 취소 처리',
                },
              ],
            }
          : order
      )
    )
    toast.success(`${selectedIds.length}건 주문이 취소되었습니다`)
    setSelectedIds([])
  }, [selectedIds])

  const handleBulkComplete = useCallback(
    (results: { orderId: string; success: boolean; channelSent: boolean }[]) => {
      // Update orders with tracking info
      const successOrderIds = results.filter((r) => r.success).map((r) => r.orderId)

      setOrders((prev) =>
        prev.map((order) => {
          if (!successOrderIds.includes(order.id)) return order
          return {
            ...order,
            status: '배송중' as OrderStatus,
            updatedAt: new Date(),
            history: [
              ...order.history,
              {
                id: `hist-${Date.now()}`,
                status: '배송중' as OrderStatus,
                timestamp: new Date(),
                actor: '김운영',
                note: '일괄 배송 처리',
              },
            ],
          }
        })
      )

      setSelectedIds([])
      setBulkModalOpen(false)

      const successCount = results.filter((r) => r.success).length
      const failedSyncCount = results.filter((r) => r.success && !r.channelSent).length

      if (failedSyncCount > 0) {
        toast.warning(
          `${successCount}건이 등록됐습니다. ${failedSyncCount}건은 채널 전송에 실패했습니다.`,
          { duration: 5000 }
        )
      } else {
        toast.success(`${successCount}건이 등록됐습니다`)
      }
    },
    []
  )

  const handleShipDateChange = useCallback(
    (orderId: string, shipDate: string | null) => {
      // In real app, this would update the order's ship date
    },
    []
  )

  const handleTrackingSave = useCallback(
    async (
      orderId: string,
      data: { carrierId: CarrierId; trackingNumber: string }
    ): Promise<{ success: boolean; channelSyncFailed?: boolean }> => {
      await new Promise((resolve) => setTimeout(resolve, 800))

      const order = orders.find((o) => o.id === orderId)
      if (!order) return { success: false }

      const channelName = CHANNEL_NAMES[order.channelId]
      const carrierName = CARRIER_CONFIG[data.carrierId].name

      // 15% chance of channel sync failure
      const channelSyncFailed = Math.random() < 0.15

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: '배송중' as OrderStatus,
                tracking: {
                  carrierId: data.carrierId,
                  carrierName,
                  trackingNumber: data.trackingNumber,
                  registeredAt: new Date(),
                  sentToChannel: !channelSyncFailed,
                },
                updatedAt: new Date(),
                history: [
                  ...o.history,
                  {
                    id: `hist-${Date.now()}`,
                    status: '배송중' as OrderStatus,
                    timestamp: new Date(),
                    actor: '김운영',
                    note: `송장번호: ${data.trackingNumber}`,
                  },
                ],
              }
            : o
        )
      )

      if (channelSyncFailed) {
        toast.warning(
          `운송장은 저장됐으나 ${channelName} 전송에 실패했습니다. 처리 이력에서 재전송할 수 있습니다.`,
          { duration: 6000 }
        )
      } else {
        toast.success(`운송장이 등록됐고 ${channelName}에 전송됐습니다`)
      }

      return { success: true, channelSyncFailed }
    },
    [orders]
  )

  const handleRetry = useCallback(() => {
    setError(null)
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  // Render empty state
  const renderEmptyState = () => {
    switch (emptyStateType) {
      case 'no-channel':
        return (
          <EmptyState
            icon={Plug}
            title="연결된 채널이 없습니다"
            description="채널 설정에서 Qoo10을 연결하면 주문이 자동으로 수집됩니다"
            action={{
              label: '채널 연결하러 가기',
              onClick: () => (window.location.href = '/settings/channels'),
            }}
          />
        )
      case 'no-orders':
        return (
          <EmptyState
            icon={ShoppingBag}
            title="아직 주문이 없습니다"
            description="Qoo10에서 신규 주문이 발생하면 자동으로 수집됩니다 (최대 5분 소요)"
          />
        )
      case 'no-results':
        return (
          <EmptyState
            icon={SearchX}
            title="검색 결과가 없습니다"
            description="검색 조건을 변경하거나 필터를 초기화해 주세요"
            action={{
              label: '필터 초기화',
              onClick: handleResetFilters,
            }}
          />
        )
      default:
        return null
    }
  }

  // Show channel column only when "전체" channel is selected
  const showChannelColumn = channelId === 'all'

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <OrderFilterBar
        channelId={channelId}
        status={status}
        dateRange={dateRange}
        search={search}
        channelCounts={channelCounts}
        statusCounts={statusCounts}
        onChannelChange={setChannel}
        onStatusChange={setStatus}
        onDateChange={setDateRange}
        onSearchChange={setSearch}
        onOpenFilterDrawer={() => setFilterDrawerOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filteredOrders.length}
        isAllSelected={
          selectedIds.length > 0 && selectedIds.length === filteredOrders.length
        }
        onSelectAll={(checked) => {
          if (checked) {
            setSelectedIds(filteredOrders.map((o) => o.id))
          } else {
            setSelectedIds([])
          }
        }}
        onBulkShip={handleBulkShip}
        onBulkCancel={handleBulkCancel}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>오류</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  주문 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                </span>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  다시 시도
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : emptyStateType !== 'none' ? (
          <div className="flex items-center justify-center h-full">
            {renderEmptyState()}
          </div>
        ) : (
          <OrderTable
            orders={filteredOrders}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onStatusChange={handleStatusChange}
            onShipDateChange={handleShipDateChange}
            onTrackingSave={handleTrackingSave}
            lastSelectedIndex={lastSelectedIndex}
            setLastSelectedIndex={setLastSelectedIndex}
            showChannelColumn={showChannelColumn}
            onOrderIdClick={setSelectedOrderId}
          />
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        filters={{
          status: status as any,
          dateRange: dateRange as any,
          channels: channelId === 'all' ? 'all' : [channelId],
          ...advancedFilters,
        }}
        onFiltersChange={handleAdvancedFiltersChange}
        onReset={handleResetFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Order Quick Drawer */}
      <OrderQuickDrawer
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
        order={orders.find((o) => o.id === selectedOrderId) || null}
        onStatusChange={handleStatusChange}
      />

      {/* Bulk Tracking Modal */}
      <BulkTrackingModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        orders={selectedOrders}
        onComplete={handleBulkComplete}
      />
    </div>
  )
}

// Loading fallback
function OrdersPageLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        <p className="text-sm text-neutral-500">로딩 중...</p>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <AppShell>
      <Suspense fallback={<OrdersPageLoading />}>
        <OrdersPageContent />
      </Suspense>
    </AppShell>
  )
}
