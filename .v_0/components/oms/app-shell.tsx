'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Settings,
  Bell,
  User,
  Search,
  ChevronRight,
  Home,
  Link2,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Channel } from '@/types/channel'
import { DEFAULT_CHANNELS, CHANNEL_CONFIG } from '@/constants/channels'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    title: '운영',
    items: [
      { label: '대시보드', href: '/', icon: LayoutDashboard },
      { label: '주문관리', href: '/orders', icon: ShoppingCart, badge: 12 },
    ],
  },
  {
    title: '설정',
    items: [
      { label: '채널설정', href: '/settings/channels', icon: Link2 },
      { label: '계정', href: '/settings/account', icon: User },
    ],
  },
]

interface AppShellProps {
  children: React.ReactNode
  channels?: Channel[]
}

export function AppShell({
  children,
  channels = DEFAULT_CHANNELS,
}: AppShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const connectedChannels = channels.filter((c) => c.isConnected)

  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs = [{ label: '홈', href: '/' }]

    const labelMap: Record<string, string> = {
      orders: '주문관리',
      settings: '설정',
      channels: '채널설정',
      account: '계정',
    }

    let currentPath = ''
    for (const path of paths) {
      currentPath += `/${path}`
      breadcrumbs.push({
        label: labelMap[path] || path,
        href: currentPath,
      })
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - B&W: white background, border right */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white border-r border-neutral-200 transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-4">
          <div className="px-2">
            <h1 className="text-base font-semibold tracking-tight text-neutral-900">
              OMS
            </h1>
            <p className="text-[11px] text-neutral-400 mt-px">멀티채널 커머스</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Connected Channels - B&W: initials only */}
        <div className="border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2 px-2">
            {connectedChannels.length > 0 ? (
              connectedChannels.map((channel) => {
                const config = CHANNEL_CONFIG[channel.id]
                return (
                  <div
                    key={channel.id}
                    className="flex items-center justify-center size-7 rounded border border-neutral-200 text-xs font-bold text-neutral-600"
                    title={channel.name}
                  >
                    {config?.initial || channel.name[0]}
                  </div>
                )
              })
            ) : (
              <span className="text-xs text-neutral-400">
                연결된 채널이 없습니다
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          {navigation.map((section, sectionIndex) => (
            <div key={section.title} className={cn(sectionIndex > 0 && 'mt-6')}>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-2 py-[7px] text-sm transition-colors',
                          isActive
                            ? 'bg-neutral-100 font-medium text-neutral-900'
                            : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className="size-[18px]" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header - B&W */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 lg:hidden"
            >
              <Menu className="size-5" />
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-[13px]">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-1">
                  {index > 0 && (
                    <span className="text-neutral-300 mx-1">/</span>
                  )}
                  {index === 0 ? (
                    <Link
                      href={crumb.href}
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      <Home className="size-4" />
                    </Link>
                  ) : index === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-neutral-900">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-900">
              <Search className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="relative text-neutral-500 hover:text-neutral-900">
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-neutral-900" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative size-8 rounded-full"
                >
                  <Avatar className="size-8">
                    <AvatarImage src="/avatar.png" alt="사용자" />
                    <AvatarFallback className="bg-neutral-900 text-white text-xs">
                      관
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">관리자</span>
                    <span className="text-xs text-neutral-500">
                      admin@example.com
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 size-4" />
                  프로필 설정
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 size-4" />
                  계정 설정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-neutral-500">
                  <LogOut className="mr-2 size-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden bg-white">{children}</main>
      </div>
    </div>
  )
}
