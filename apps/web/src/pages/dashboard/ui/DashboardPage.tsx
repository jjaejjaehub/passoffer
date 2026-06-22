/* 대시보드 — 더미 데이터 */
"use client";
import { Badge, Box, Flex, Grid, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";

import { useActiveChannel } from "@/entities/channel";
import { PageHeader } from "@/shared/ui";

// ─── 더미 데이터 ────────────────────────────────────────────────

const DUMMY = {
  month: "2026년 5월",
  qoo10: {
    orderCount: 1284,
    salesKrw: 38_720_400,
    avgOrderKrw: 30_156,
    cancelCount: 14,
    returnCount: 8,
    exchangeCount: 3,
    pendingShip: 42,
    shipped: 1201,
    topItems: [
      {
        name: "남성 스트레치 치노 팬츠 (네이비)",
        qty: 312,
        revenue: 9_547_200,
      },
      { name: "여성 린넨 블렌드 셔츠 (화이트)", qty: 278, revenue: 7_931_800 },
      { name: "유니섹스 오버핏 후드 (블랙)", qty: 241, revenue: 7_229_990 },
      { name: "캐주얼 크로스백 (베이지)", qty: 198, revenue: 5_821_200 },
      { name: "슬림핏 데님 자켓 (인디고)", qty: 143, revenue: 4_289_700 },
    ],
    recentClaims: [
      {
        orderNo: "QO-20260428-0831",
        item: "남성 스트레치 치노 팬츠",
        type: "반품",
        date: "2026-04-28",
        reason: "사이즈 불만족",
      },
      {
        orderNo: "QO-20260427-0614",
        item: "유니섹스 오버핏 후드",
        type: "취소",
        date: "2026-04-27",
        reason: "단순 변심",
      },
      {
        orderNo: "QO-20260425-0392",
        item: "캐주얼 크로스백",
        type: "교환",
        date: "2026-04-25",
        reason: "색상 상이",
      },
      {
        orderNo: "QO-20260424-0281",
        item: "여성 린넨 블렌드 셔츠",
        type: "반품",
        date: "2026-04-24",
        reason: "상품 불량",
      },
    ],
  },
  shopify: {
    orderCount: 847,
    totalRevenue: 124_830.5,
    currency: "USD",
    pendingFulfillment: 31,
    fulfilled: 798,
    cancelCount: 12,
    returnCount: 6,
    refundedAmount: 3_241.8,
    topItems: [
      { name: "Stretch Chino Pants (Navy)", qty: 198, revenue: 28_910.4 },
      { name: "Linen Blend Shirt (White)", qty: 167, revenue: 21_344.9 },
      { name: "Oversized Hoodie (Black)", qty: 154, revenue: 20_020.5 },
      { name: "Casual Crossbody Bag (Beige)", qty: 132, revenue: 17_822.6 },
      { name: "Slim Denim Jacket (Indigo)", qty: 98, revenue: 13_121.1 },
    ],
  },
};

// ─── 공통 컴포넌트 ──────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: "blue" | "green" | "orange" | "red" | "purple" | "default";
  badge?: string;
  onClick?: () => void;
}

const COLOR_MAP = {
  blue: {
    border: "blue.200",
    bg: "blue.50",
    label: "blue.600",
    value: "blue.800",
  },
  green: {
    border: "green.200",
    bg: "green.50",
    label: "green.600",
    value: "green.800",
  },
  orange: {
    border: "orange.200",
    bg: "orange.50",
    label: "orange.600",
    value: "orange.800",
  },
  red: { border: "red.200", bg: "red.50", label: "red.500", value: "red.700" },
  purple: {
    border: "purple.200",
    bg: "purple.50",
    label: "purple.600",
    value: "purple.800",
  },
  default: {
    border: "gray.200",
    bg: "white",
    label: "gray.500",
    value: "gray.900",
  },
};

function KpiCard({
  label,
  value,
  sub,
  color = "default",
  badge,
  onClick,
}: KpiCardProps) {
  const c = COLOR_MAP[color];
  return (
    <Box
      border="1px solid"
      borderColor={c.border}
      borderRadius="xl"
      p={5}
      bg={c.bg}
      cursor={onClick ? "pointer" : undefined}
      _hover={{ shadow: "md", transform: "translateY(-1px)" }}
      transition="all 0.18s"
      onClick={onClick}
      position="relative"
    >
      {badge && (
        <Badge
          position="absolute"
          top={3}
          right={3}
          colorPalette="red"
          variant="solid"
          borderRadius="full"
          fontSize="9px"
          px={2}
        >
          {badge}
        </Badge>
      )}
      <Text
        fontSize="xs"
        fontWeight="semibold"
        color={c.label}
        mb={2}
        letterSpacing="wide"
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Box
        fontSize="2xl"
        fontWeight="extrabold"
        color={c.value}
        lineHeight="1.2"
      >
        {value}
      </Box>
      {sub && (
        <Text fontSize="xs" color="gray.400" mt={1}>
          {sub}
        </Text>
      )}
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="sm"
      fontWeight="bold"
      color="gray.600"
      mb={3}
      mt={7}
      letterSpacing="wide"
      textTransform="uppercase"
    >
      {children}
    </Text>
  );
}

const CLAIM_COLOR: Record<string, string> = {
  반품: "orange",
  취소: "red",
  교환: "purple",
};

// ─── Qoo10 대시보드 ────────────────────────────────────────────

function Qoo10Dashboard(): React.JSX.Element {
  const router = useRouter();
  const d = DUMMY.qoo10;

  return (
    <Box>
      {/* 헤더 */}
      <Flex align="center" justify="space-between" mb={5}>
        <Box>
          <Text fontSize="xl" fontWeight="bold" color="gray.900">
            {DUMMY.month} Qoo10 현황
          </Text>
          <Text fontSize="xs" color="gray.400" mt={0.5}>
            2026-05-01 기준
          </Text>
        </Box>
        <Badge
          colorPalette="green"
          variant="subtle"
          px={3}
          py={1}
          borderRadius="full"
          fontSize="xs"
          fontWeight="semibold"
        >
          ● 실시간
        </Badge>
      </Flex>

      {/* 주요 KPI */}
      <Grid templateColumns="repeat(4, 1fr)" gap={3}>
        <KpiCard
          label="이번달 주문"
          value={`${d.orderCount.toLocaleString()}건`}
          sub="전월 대비 +12%"
          color="blue"
        />
        <KpiCard
          label="이번달 매출"
          value={`₩${d.salesKrw.toLocaleString()}`}
          sub="옵 기준 부가세 포함"
          color="green"
        />
        <KpiCard
          label="평균 객단가"
          value={`₩${d.avgOrderKrw.toLocaleString()}`}
          color="purple"
        />
        <KpiCard
          label="배송 대기"
          value={`${d.pendingShip}건`}
          sub="즉시 처리 필요"
          color="orange"
          badge="처리필요"
          onClick={() => router.push("/orders")}
        />
      </Grid>

      {/* 클레임 */}
      <SectionTitle>클레임 현황</SectionTitle>
      <Grid templateColumns="repeat(3, 1fr)" gap={3}>
        <KpiCard label="취소" value={`${d.cancelCount}건`} color="red" />
        <KpiCard label="반품" value={`${d.returnCount}건`} color="orange" />
        <KpiCard label="교환" value={`${d.exchangeCount}건`} color="purple" />
      </Grid>

      {/* 인기 상품 */}
      <SectionTitle>인기 상품 TOP 5</SectionTitle>
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="xl"
        overflow="hidden"
        shadow="xs"
      >
        <Box
          as="table"
          w="100%"
          fontSize="sm"
          style={{ borderCollapse: "collapse" }}
        >
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {["#", "상품명", "판매수량", "매출"].map((h) => (
                <Box
                  key={h}
                  as="th"
                  px={4}
                  py={3}
                  textAlign="left"
                  fontSize="xs"
                  fontWeight="semibold"
                  color="gray.500"
                  borderBottomWidth="1px"
                  borderColor="gray.200"
                >
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {d.topItems.map((item, i) => (
              <Box
                key={item.name}
                as="tr"
                _hover={{ bg: "gray.50" }}
                transition="background 0.1s"
              >
                <Box
                  as="td"
                  px={4}
                  py={3}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  <Box
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    w={6}
                    h={6}
                    borderRadius="full"
                    bg={
                      i === 0
                        ? "yellow.400"
                        : i === 1
                          ? "gray.300"
                          : i === 2
                            ? "orange.300"
                            : "gray.100"
                    }
                    fontSize="xs"
                    fontWeight="bold"
                    color={i < 3 ? "white" : "gray.500"}
                  >
                    {i + 1}
                  </Box>
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  color="gray.800"
                  fontWeight="medium"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  {item.name}
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  color="gray.600"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  {item.qty.toLocaleString()}개
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  fontWeight="semibold"
                  color="gray.900"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  ₩{item.revenue.toLocaleString()}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* 최근 클레임 */}
      <SectionTitle>최근 클레임 주문</SectionTitle>
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="xl"
        overflow="hidden"
        shadow="xs"
      >
        <Box
          as="table"
          w="100%"
          fontSize="sm"
          style={{ borderCollapse: "collapse" }}
        >
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {["유형", "주문번호", "상품명", "요청일", "사유"].map((h) => (
                <Box
                  key={h}
                  as="th"
                  px={4}
                  py={3}
                  textAlign="left"
                  fontSize="xs"
                  fontWeight="semibold"
                  color="gray.500"
                  borderBottomWidth="1px"
                  borderColor="gray.200"
                >
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {d.recentClaims.map((claim) => (
              <Box
                key={claim.orderNo}
                as="tr"
                _hover={{ bg: "gray.50" }}
                transition="background 0.1s"
              >
                <Box
                  as="td"
                  px={4}
                  py={3}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  <Badge
                    colorPalette={CLAIM_COLOR[claim.type] ?? "gray"}
                    variant="subtle"
                    borderRadius="full"
                    px={2}
                    fontSize="xs"
                  >
                    {claim.type}
                  </Badge>
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  color="gray.600"
                  fontSize="xs"
                  fontFamily="mono"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  {claim.orderNo}
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  color="gray.800"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  {claim.item}
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  color="gray.500"
                  fontSize="xs"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  {claim.date}
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  color="gray.600"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  {claim.reason}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Shopify 대시보드 ───────────────────────────────────────────

function ShopifyDashboard(): React.JSX.Element {
  const router = useRouter();
  const d = DUMMY.shopify;

  return (
    <Box>
      {/* 헤더 */}
      <Flex align="center" justify="space-between" mb={5}>
        <Box>
          <Text fontSize="xl" fontWeight="bold" color="gray.900">
            {DUMMY.month} Shopify 현황
          </Text>
          <Text fontSize="xs" color="gray.400" mt={0.5}>
            2026-05-01 기준
          </Text>
        </Box>
        <Badge
          colorPalette="green"
          variant="subtle"
          px={3}
          py={1}
          borderRadius="full"
          fontSize="xs"
          fontWeight="semibold"
        >
          ● 실시간
        </Badge>
      </Flex>

      {/* 주요 KPI */}
      <Grid templateColumns="repeat(4, 1fr)" gap={3}>
        <KpiCard
          label="이번달 주문"
          value={`${d.orderCount.toLocaleString()}건`}
          sub="전월 대비 +8%"
          color="blue"
        />
        <KpiCard
          label="이번달 매출"
          value={`${d.currency} ${d.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="세금 제외"
          color="green"
        />
        <KpiCard
          label="배송 대기"
          value={`${d.pendingFulfillment}건`}
          sub="즉시 처리 필요"
          color="orange"
          badge="처리필요"
          onClick={() => router.push("/orders?channel=shopify")}
        />
        <KpiCard
          label="배송 완료"
          value={`${d.fulfilled.toLocaleString()}건`}
          color="default"
        />
      </Grid>

      {/* 반품/취소 */}
      <SectionTitle>반품 · 취소 현황</SectionTitle>
      <Grid templateColumns="repeat(3, 1fr)" gap={3}>
        <KpiCard label="취소" value={`${d.cancelCount}건`} color="red" />
        <KpiCard label="반품" value={`${d.returnCount}건`} color="orange" />
        <KpiCard
          label="총 환불액"
          value={`${d.currency} ${d.refundedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color="red"
        />
      </Grid>

      {/* 인기 상품 */}
      <SectionTitle>인기 상품 TOP 5</SectionTitle>
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="xl"
        overflow="hidden"
        shadow="xs"
      >
        <Box
          as="table"
          w="100%"
          fontSize="sm"
          style={{ borderCollapse: "collapse" }}
        >
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {["#", "상품명", "판매수량", "매출"].map((h) => (
                <Box
                  key={h}
                  as="th"
                  px={4}
                  py={3}
                  textAlign="left"
                  fontSize="xs"
                  fontWeight="semibold"
                  color="gray.500"
                  borderBottomWidth="1px"
                  borderColor="gray.200"
                >
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {d.topItems.map((item, i) => (
              <Box
                key={item.name}
                as="tr"
                _hover={{ bg: "gray.50" }}
                transition="background 0.1s"
              >
                <Box
                  as="td"
                  px={4}
                  py={3}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  <Box
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    w={6}
                    h={6}
                    borderRadius="full"
                    bg={
                      i === 0
                        ? "yellow.400"
                        : i === 1
                          ? "gray.300"
                          : i === 2
                            ? "orange.300"
                            : "gray.100"
                    }
                    fontSize="xs"
                    fontWeight="bold"
                    color={i < 3 ? "white" : "gray.500"}
                  >
                    {i + 1}
                  </Box>
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  color="gray.800"
                  fontWeight="medium"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  {item.name}
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  color="gray.600"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  {item.qty.toLocaleString()}개
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  fontWeight="semibold"
                  color="gray.900"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  {d.currency}{" "}
                  {item.revenue.toLocaleString(undefined, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── 메인 ───────────────────────────────────────────────────────

export function DashboardPage(): React.JSX.Element {
  const { activeChannel } = useActiveChannel();
  const isShopify = activeChannel === "shopify";

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title="대시보드"
        description="채널별 이번달 매출 현황을 확인합니다."
        mb={4}
      />
      <Box flex="1" minW={0}>
        {isShopify ? <ShopifyDashboard /> : <Qoo10Dashboard />}
      </Box>
    </Box>
  );
}
