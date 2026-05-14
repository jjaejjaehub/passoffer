"use client";

import { Box, Flex, Icon, Stack, Text } from "@chakra-ui/react";
import {
  BookOpen,
  Building2,
  ChevronDown,
  Globe,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Package2,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Truck,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/entities/auth";
import { ROUTES } from "@/shared/config";
import { credentialQueries } from "@/shared/lib/credentialQueryKeys";
import { usePrefetchRoute } from "@/shared/lib/usePrefetchRoute";

export function Sidebar(): React.JSX.Element {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  // 클릭 즉시 사이드바 하이라이트 피드백용 (실제 이동은 Link가 담당)
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // pathname이 변경되면 pending 상태 초기화 (렌더 중 setState 방지)
  useEffect(() => {
    if (pendingHref !== null && pathname === pendingHref) {
      setPendingHref(null);
    }
  }, [pendingHref, pathname]);

  const [isProductOpen, setIsProductOpen] = useState<boolean>(true);
  const [isOrderOpen, setIsOrderOpen] = useState<boolean>(true);
  const [isWarehouseOpen, setIsWarehouseOpen] = useState<boolean>(true);
  const queryClient = useQueryClient();
  const { prefetch } = usePrefetchRoute();

  // credential이 캐시에 로드된 후 유휴 상태에서 주요 페이지를 선프리패치한다.
  // credential 미로드 상태에서 warmup을 실행해도 no-op이 되므로,
  // credential 쿼리가 settled될 때마다 재시도한다.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const warmupRoutes = [ROUTES.dashboard, ROUTES.orders, ROUTES.products, ROUTES.claims];

    const warmup = (): void => {
      for (const route of warmupRoutes) {
        prefetch(route);
      }
    };

    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const scheduleWarmup = (): void => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);

      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => warmup(), { timeout: 1200 });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timeoutId = (window as any).setTimeout(warmup, 300) as number;
      }
    };

    // credential 쿼리가 성공적으로 settle되면 warmup을 (재)스케줄한다.
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.action.type === "success" &&
        Array.isArray(event.query.queryKey) &&
        event.query.queryKey[0] === credentialQueries.all()[0]
      ) {
        scheduleWarmup();
      }
    });

    // 이미 credential이 캐시에 있으면 즉시 스케줄
    scheduleWarmup();

    return () => {
      unsubscribe();
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [queryClient, prefetch]);

  // pending 중인 href가 있으면 optimistic active로 처리
  const isActive = (href: string): boolean => {
    if (pendingHref !== null) return pendingHref === href || pendingHref.startsWith(`${href}/`);
    return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
  };

  // 정확 일치 활성화 (자식 경로가 별도 메뉴인 경우용)
  const isExactActive = (href: string): boolean => {
    if (pendingHref !== null) return pendingHref === href;
    return pathname === href;
  };

  const navItemStyle = (active: boolean | undefined) => ({
    align: "center" as const,
    gap: 3,
    px: 3,
    py: 2,
    borderRadius: "md",
    bg: active ? "gray.100" : "transparent",
    color: active ? "gray.900" : "gray.600",
    fontWeight: active ? "medium" : "normal",
    opacity: pendingHref !== null && !active ? 0.6 : 1,
    _hover: { bg: active ? "gray.100" : "gray.50" },
  });

  const subItemStyle = (active: boolean | undefined) => ({
    align: "center" as const,
    px: 3,
    py: 1.5,
    borderRadius: "md",
    bg: active ? "gray.100" : "transparent",
    color: active ? "gray.900" : "gray.600",
    fontWeight: active ? "medium" : "normal",
    opacity: pendingHref !== null && !active ? 0.6 : 1,
    _hover: { bg: active ? "gray.100" : "gray.50" },
  });

  return (
    <Box
      as="aside"
      w={64}
      flexShrink={0}
      h="100%"
      overflowY="auto"
      borderRightWidth="1px"
      borderColor="gray.200"
      bg="white"
      px={4}
      py={6}
      display="flex"
      flexDirection="column"
    >
      {/* 로고 */}
      <Flex align="center" gap={2.5} mb={8}>
        <Flex
          w={8}
          h={8}
          bg="blue.500"
          borderRadius="lg"
          align="center"
          justify="center"
          flexShrink={0}
        >
          <Icon as={ShoppingBag} color="white" boxSize={4} />
        </Flex>
        <Box>
          <Text fontSize="sm" fontWeight="bold" lineHeight="1.2">
            PassOffer
          </Text>
          <Text fontSize="xs" color="gray.400" lineHeight="1.2">
            OMS
          </Text>
        </Box>
      </Flex>


      <Box>
        <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>
          Navigation
        </Text>
        <Stack gap={1}>
          {/* 대시보드 */}
          <Link href={ROUTES.dashboard} style={{ textDecoration: "none" }}
            onClick={() => setPendingHref(ROUTES.dashboard)}
            onMouseEnter={() => prefetch(ROUTES.dashboard)}
          >
            <Flex {...navItemStyle(isActive(ROUTES.dashboard))}>
              <Icon as={LayoutDashboard} boxSize={4} color="gray.500" />
              <Text fontSize="sm">대시보드</Text>
            </Flex>
          </Link>

          {/* 상품 관리 */}
          <Box>
            <Flex
              {...navItemStyle(isActive(ROUTES.products) || isActive(ROUTES.productNew) || isActive(ROUTES.items) || isActive(ROUTES.masterProducts))}
              cursor="pointer"
              onClick={() => setIsProductOpen((prev) => !prev)}
            >
              <Icon
                as={Package2}
                boxSize={4}
                color={(isActive(ROUTES.products) || isActive(ROUTES.productNew) || isActive(ROUTES.items) || isActive(ROUTES.masterProducts)) ? "gray.900" : "gray.500"}
              />
              <Text fontSize="sm" flex="1">
                상품 관리
              </Text>
              <Icon
                as={isProductOpen ? ChevronDown : ChevronRight}
                boxSize={4}
                color="gray.500"
              />
            </Flex>
            {isProductOpen && (
              <Box pl={9} pt={1}>
                <Box>
                  <Link href={ROUTES.masterProducts} style={{ textDecoration: "none" }}
                    onClick={() => setPendingHref(ROUTES.masterProducts)}
                    onMouseEnter={() => prefetch(ROUTES.masterProducts)}
                  >
                    <Flex {...subItemStyle(isActive(ROUTES.masterProducts))}>
                      <Icon as={BookOpen} boxSize={3.5} mr={2} color="gray.400" />
                      <Text fontSize="sm">마스터 상품</Text>
                    </Flex>
                  </Link>
                </Box>
                <Box mt={1}>
                  <Link href={ROUTES.salesProducts} style={{ textDecoration: "none" }}
                    onClick={() => setPendingHref(ROUTES.salesProducts)}
                    onMouseEnter={() => prefetch(ROUTES.salesProducts)}
                  >
                    <Flex {...subItemStyle(isActive(ROUTES.salesProducts))}>
                      <Icon as={Tag} boxSize={3.5} mr={2} color="gray.400" />
                      <Text fontSize="sm">판매 상품</Text>
                    </Flex>
                  </Link>
                </Box>
              </Box>
            )}
          </Box>

          {/* 주문 관리 */}
          <Box>
            <Flex
              {...navItemStyle(isActive(ROUTES.orders) || isActive(ROUTES.claims))}
              cursor="pointer"
              onClick={() => setIsOrderOpen((prev) => !prev)}
            >
              <Icon
                as={ShoppingCart}
                boxSize={4}
                color={(isActive(ROUTES.orders) || isActive(ROUTES.claims)) ? "gray.900" : "gray.500"}
              />
              <Text fontSize="sm" flex="1">
                주문 관리
              </Text>
              <Icon
                as={isOrderOpen ? ChevronDown : ChevronRight}
                boxSize={4}
                color="gray.500"
              />
            </Flex>
            {isOrderOpen && (
              <Box pl={9} pt={1}>
                <Link href={ROUTES.orders} style={{ textDecoration: "none" }}
                  onClick={() => setPendingHref(ROUTES.orders)}
                  onMouseEnter={() => prefetch(ROUTES.orders)}
                >
                  <Flex {...subItemStyle(isActive(ROUTES.orders))}>
                    <Icon as={Truck} boxSize={3} color="gray.400" mr={1} />
                    <Text fontSize="sm">배송 관리</Text>
                  </Flex>
                </Link>
                <Box mt={1}>
                  <Link href={ROUTES.claims} style={{ textDecoration: "none" }}
                    onClick={() => setPendingHref(ROUTES.claims)}
                    onMouseEnter={() => prefetch(ROUTES.claims)}
                  >
                    <Flex {...subItemStyle(isActive(ROUTES.claims))}>
                      <Icon as={Package2} boxSize={3} color="gray.400" mr={1} />
                      <Text fontSize="sm">클레임 관리</Text>
                    </Flex>
                  </Link>
                </Box>
              </Box>
            )}
          </Box>

          {/* 재고 관리 */}
          <Link href={ROUTES.inventory} style={{ textDecoration: "none" }}
            onClick={() => setPendingHref(ROUTES.inventory)}
            onMouseEnter={() => prefetch(ROUTES.inventory)}
            onFocus={() => prefetch(ROUTES.inventory)}
          >
            <Flex {...navItemStyle(isActive(ROUTES.inventory))}>
              <Icon as={Warehouse} boxSize={4} color="gray.500" />
              <Text fontSize="sm">재고 관리</Text>
            </Flex>
          </Link>

          {/* 창고 관리 */}
          <Box>
            <Flex
              {...navItemStyle(
                isActive(ROUTES.adminWarehouses.connections) ||
                  isActive(ROUTES.adminWarehouses.inbound) ||
                  isActive(ROUTES.adminWarehouses.inventory) ||
                  isActive(ROUTES.adminWarehouses.adjustments) ||
                  isActive(ROUTES.adminWarehouses.history) ||
                  isActive(ROUTES.adminWarehouses.locations),
              )}
              cursor="pointer"
              onClick={() => setIsWarehouseOpen((prev) => !prev)}
            >
              <Icon as={Building2} boxSize={4} color="gray.500" />
              <Text fontSize="sm" flex="1">창고 관리</Text>
              <Icon as={isWarehouseOpen ? ChevronDown : ChevronRight} boxSize={4} color="gray.500" />
            </Flex>
            {isWarehouseOpen && (
              <Box pl={9} pt={1}>
                <Link href={ROUTES.adminWarehouses.connections} style={{ textDecoration: "none" }}
                  onClick={() => setPendingHref(ROUTES.adminWarehouses.connections)}
                  onMouseEnter={() => prefetch(ROUTES.adminWarehouses.connections)}
                >
                  <Flex {...subItemStyle(isExactActive(ROUTES.adminWarehouses.connections))}>
                    <Text fontSize="sm">창고 연결</Text>
                  </Flex>
                </Link>
                <Box mt={1}>
                  <Link href={ROUTES.adminWarehouses.inbound} style={{ textDecoration: "none" }}
                    onClick={() => setPendingHref(ROUTES.adminWarehouses.inbound)}
                    onMouseEnter={() => prefetch(ROUTES.adminWarehouses.inbound)}
                  >
                    <Flex {...subItemStyle(isActive(ROUTES.adminWarehouses.inbound))}>
                      <Text fontSize="sm">입고 예정</Text>
                    </Flex>
                  </Link>
                </Box>
                <Box mt={1}>
                  <Link href={ROUTES.adminWarehouses.inventory} style={{ textDecoration: "none" }}
                    onClick={() => setPendingHref(ROUTES.adminWarehouses.inventory)}
                    onMouseEnter={() => prefetch(ROUTES.adminWarehouses.inventory)}
                  >
                    <Flex {...subItemStyle(isActive(ROUTES.adminWarehouses.inventory))}>
                      <Text fontSize="sm">재고 조회</Text>
                    </Flex>
                  </Link>
                </Box>
                <Box mt={1}>
                  <Link href={ROUTES.adminWarehouses.adjustments} style={{ textDecoration: "none" }}
                    onClick={() => setPendingHref(ROUTES.adminWarehouses.adjustments)}
                    onMouseEnter={() => prefetch(ROUTES.adminWarehouses.adjustments)}
                  >
                    <Flex {...subItemStyle(isActive(ROUTES.adminWarehouses.adjustments))}>
                      <Text fontSize="sm">재고 이동/조정</Text>
                    </Flex>
                  </Link>
                </Box>
                <Box mt={1}>
                  <Link href={ROUTES.adminWarehouses.history} style={{ textDecoration: "none" }}
                    onClick={() => setPendingHref(ROUTES.adminWarehouses.history)}
                    onMouseEnter={() => prefetch(ROUTES.adminWarehouses.history)}
                  >
                    <Flex {...subItemStyle(isActive(ROUTES.adminWarehouses.history))}>
                      <Text fontSize="sm">재고 이력</Text>
                    </Flex>
                  </Link>
                </Box>
                <Box mt={1}>
                  <Link href={ROUTES.adminWarehouses.locations} style={{ textDecoration: "none" }}
                    onClick={() => setPendingHref(ROUTES.adminWarehouses.locations)}
                    onMouseEnter={() => prefetch(ROUTES.adminWarehouses.locations)}
                  >
                    <Flex {...subItemStyle(isActive(ROUTES.adminWarehouses.locations))}>
                      <Text fontSize="sm">로케이션 관리</Text>
                    </Flex>
                  </Link>
                </Box>
              </Box>
            )}
          </Box>

          {/* 상품 문의 */}
          <Link href={ROUTES.inquiry} style={{ textDecoration: "none" }}
            onClick={() => setPendingHref(ROUTES.inquiry)}
            onMouseEnter={() => prefetch(ROUTES.inquiry)}
          >
            <Flex {...navItemStyle(isActive(ROUTES.inquiry))}>
              <Icon as={MessageCircle} boxSize={4} color="gray.500" />
              <Text fontSize="sm">상품 문의</Text>
            </Flex>
          </Link>

          {/* 외부 상품 */}
          <Link href={ROUTES.externalSellers} style={{ textDecoration: "none" }}
            onClick={() => setPendingHref(ROUTES.externalSellers)}
            onMouseEnter={() => prefetch(ROUTES.externalSellers)}
            onFocus={() => prefetch(ROUTES.externalSellers)}
          >
            <Flex {...navItemStyle(isActive(ROUTES.externalSellers))}>
              <Icon as={Globe} boxSize={4} color="gray.500" />
              <Text fontSize="sm">외부 상품</Text>
            </Flex>
          </Link>

          {/* 채널 관리 */}
          <Link href={ROUTES.settings.channels} style={{ textDecoration: "none" }}
            onClick={() => setPendingHref(ROUTES.settings.channels)}
            onMouseEnter={() => prefetch(ROUTES.settings.channels)}
            onFocus={() => prefetch(ROUTES.settings.channels)}
          >
            <Flex {...navItemStyle(isActive(ROUTES.settings.channels))}>
              <Icon as={Settings2} boxSize={4} color="gray.500" />
              <Text fontSize="sm">채널 관리</Text>
            </Flex>
          </Link>
        </Stack>
      </Box>

      {/* 하단 유저 정보 */}
      <Box mt="auto" pt={4} borderTopWidth="1px" borderColor="gray.100">
        <Flex align="center" gap={2.5}>
          {/* 아바타 */}
          <Flex
            w={8}
            h={8}
            bg="blue.100"
            borderRadius="full"
            align="center"
            justify="center"
            flexShrink={0}
          >
            <Text fontSize="xs" fontWeight="bold" color="blue.600">
              {user?.name ? user.name.slice(0, 1).toUpperCase() : "?"}
            </Text>
          </Flex>

          <Box flex="1" minW={0}>
            <Text fontSize="sm" fontWeight="medium" color="gray.800" truncate>
              {user?.name ?? "로딩 중..."}
            </Text>
            <Text fontSize="xs" color="gray.400" truncate>
              {user?.email ?? ""}
            </Text>
          </Box>

          {/* 로그아웃 버튼 */}
          <Box
            as="button"
            onClick={logout}
            color="gray.400"
            _hover={{ color: "gray.700" }}
            p={1}
            borderRadius="md"
            title="로그아웃"
            flexShrink={0}
          >
            <Icon as={LogOut} boxSize={4} />
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}
