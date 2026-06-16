/* 대시보드 — 더미 데이터 */
"use client";
import { Badge, Box, Flex, Grid, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { useActiveChannel } from "@/entities/channel";
import { PageHeader } from "@/shared/ui";

// ─── 더미 데이터 ────────────────────────────────────────────────

type ClaimType = "cancel" | "return" | "exchange";

const DUMMY = {
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
      { name: "남성 스트레치 치노 팬츠 (네이비)", qty: 312, revenue: 9_547_200 },
      { name: "여성 린넨 블렌드 셔츠 (화이트)", qty: 278, revenue: 7_931_800 },
      { name: "유니섹스 오버핏 후드 (블랙)", qty: 241, revenue: 7_229_990 },
      { name: "캐주얼 크로스백 (베이지)", qty: 198, revenue: 5_821_200 },
      { name: "슬림핏 데님 자켓 (인디고)", qty: 143, revenue: 4_289_700 },
    ],
    recentClaims: [
      { orderNo: "QO-20260428-0831", item: "남성 스트레치 치노 팬츠", type: "return" as ClaimType, date: "2026-04-28", reason: "사이즈 불만족" },
      { orderNo: "QO-20260427-0614", item: "유니섹스 오버핏 후드", type: "cancel" as ClaimType, date: "2026-04-27", reason: "단순 변심" },
      { orderNo: "QO-20260425-0392", item: "캐주얼 크로스백", type: "exchange" as ClaimType, date: "2026-04-25", reason: "색상 상이" },
      { orderNo: "QO-20260424-0281", item: "여성 린넨 블렌드 셔츠", type: "return" as ClaimType, date: "2026-04-24", reason: "상품 불량" },
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
  blue:    { border: "blue.200",   bg: "blue.50",   label: "blue.600",   value: "blue.800" },
  green:   { border: "green.200",  bg: "green.50",  label: "green.600",  value: "green.800" },
  orange:  { border: "orange.200", bg: "orange.50", label: "orange.600", value: "orange.800" },
  red:     { border: "red.200",    bg: "red.50",    label: "red.500",    value: "red.700" },
  purple:  { border: "purple.200", bg: "purple.50", label: "purple.600", value: "purple.800" },
  default: { border: "gray.200",   bg: "white",     label: "gray.500",   value: "gray.900" },
};

function KpiCard({ label, value, sub, color = "default", badge, onClick }: KpiCardProps) {
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
      <Text fontSize="xs" fontWeight="semibold" color={c.label} mb={2} letterSpacing="wide" textTransform="uppercase">
        {label}
      </Text>
      <Box fontSize="2xl" fontWeight="extrabold" color={c.value} lineHeight="1.2">
        {value}
      </Box>
      {sub && <Text fontSize="xs" color="gray.400" mt={1}>{sub}</Text>}
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="sm" fontWeight="bold" color="gray.600" mb={3} mt={7} letterSpacing="wide" textTransform="uppercase">
      {children}
    </Text>
  );
}

const CLAIM_COLOR: Record<ClaimType, string> = {
  return: "orange",
  cancel: "red",
  exchange: "purple",
};

// ─── Qoo10 대시보드 ────────────────────────────────────────────

function Qoo10Dashboard(): React.JSX.Element {
  const t = useTranslations("pages.dashboard");
  const router = useRouter();
  const d = DUMMY.qoo10;
  const month = t("month");

  return (
    <Box>
      {/* 헤더 */}
      <Flex align="center" justify="space-between" mb={5}>
        <Box>
          <Text fontSize="xl" fontWeight="bold" color="gray.900">{t("qoo10Header", { month })}</Text>
          <Text fontSize="xs" color="gray.400" mt={0.5}>{t("asOfDate")}</Text>
        </Box>
        <Badge colorPalette="green" variant="subtle" px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="semibold">
          {t("realtime")}
        </Badge>
      </Flex>

      {/* 주요 KPI */}
      <Grid templateColumns="repeat(4, 1fr)" gap={3}>
        <KpiCard label={t("kpi.orderCount")} value={t("kpi.ordersUnit", { count: d.orderCount.toLocaleString() })} sub={t("kpi.monthOverMonth", { delta: "+12%" })} color="blue" />
        <KpiCard label={t("kpi.salesAmount")} value={`₩${d.salesKrw.toLocaleString()}`} sub={t("kpi.vatIncluded")} color="green" />
        <KpiCard label={t("kpi.avgOrderValue")} value={`₩${d.avgOrderKrw.toLocaleString()}`} color="purple" />
        <KpiCard
          label={t("kpi.pendingShip")}
          value={t("kpi.ordersUnit", { count: d.pendingShip.toString() })}
          sub={t("kpi.needAction")}
          color="orange"
          badge={t("kpi.actionBadge")}
          onClick={() => router.push("/orders")}
        />
      </Grid>

      {/* 클레임 */}
      <SectionTitle>{t("section.claims")}</SectionTitle>
      <Grid templateColumns="repeat(3, 1fr)" gap={3}>
        <KpiCard label={t("kpi.cancel")} value={t("kpi.ordersUnit", { count: d.cancelCount.toString() })} color="red" />
        <KpiCard label={t("kpi.return")} value={t("kpi.ordersUnit", { count: d.returnCount.toString() })} color="orange" />
        <KpiCard label={t("kpi.exchange")} value={t("kpi.ordersUnit", { count: d.exchangeCount.toString() })} color="purple" />
      </Grid>

      {/* 인기 상품 */}
      <SectionTitle>{t("section.topItems")}</SectionTitle>
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" overflow="hidden" shadow="xs">
        <Box as="table" w="100%" fontSize="sm" style={{ borderCollapse: "collapse" }}>
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {[t("topItems.rank"), t("topItems.name"), t("topItems.qty"), t("topItems.revenue")].map((h) => (
                <Box key={h} as="th" px={4} py={3} textAlign="left" fontSize="xs" fontWeight="semibold" color="gray.500" borderBottomWidth="1px" borderColor="gray.200">
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {d.topItems.map((item, i) => (
              <Box key={item.name} as="tr" _hover={{ bg: "gray.50" }} transition="background 0.1s">
                <Box as="td" px={4} py={3} borderBottomWidth="1px" borderColor="gray.100">
                  <Box
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    w={6}
                    h={6}
                    borderRadius="full"
                    bg={i === 0 ? "yellow.400" : i === 1 ? "gray.300" : i === 2 ? "orange.300" : "gray.100"}
                    fontSize="xs"
                    fontWeight="bold"
                    color={i < 3 ? "white" : "gray.500"}
                  >
                    {i + 1}
                  </Box>
                </Box>
                <Box as="td" px={4} py={3} color="gray.800" fontWeight="medium" borderBottomWidth="1px" borderColor="gray.100">
                  {item.name}
                </Box>
                <Box as="td" px={4} py={3} color="gray.600" borderBottomWidth="1px" borderColor="gray.100">
                  {t("topItems.qtyUnit", { count: item.qty.toLocaleString() })}
                </Box>
                <Box as="td" px={4} py={3} fontWeight="semibold" color="gray.900" borderBottomWidth="1px" borderColor="gray.100">
                  ₩{item.revenue.toLocaleString()}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* 최근 클레임 */}
      <SectionTitle>{t("section.recentClaims")}</SectionTitle>
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" overflow="hidden" shadow="xs">
        <Box as="table" w="100%" fontSize="sm" style={{ borderCollapse: "collapse" }}>
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {[t("recentClaims.type"), t("recentClaims.orderNo"), t("recentClaims.name"), t("recentClaims.date"), t("recentClaims.reason")].map((h) => (
                <Box key={h} as="th" px={4} py={3} textAlign="left" fontSize="xs" fontWeight="semibold" color="gray.500" borderBottomWidth="1px" borderColor="gray.200">
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {d.recentClaims.map((claim) => (
              <Box key={claim.orderNo} as="tr" _hover={{ bg: "gray.50" }} transition="background 0.1s">
                <Box as="td" px={4} py={3} borderBottomWidth="1px" borderColor="gray.100">
                  <Badge colorPalette={CLAIM_COLOR[claim.type] ?? "gray"} variant="subtle" borderRadius="full" px={2} fontSize="xs">
                    {t(`kpi.${claim.type}`)}
                  </Badge>
                </Box>
                <Box as="td" px={4} py={3} color="gray.600" fontSize="xs" fontFamily="mono" borderBottomWidth="1px" borderColor="gray.100">
                  {claim.orderNo}
                </Box>
                <Box as="td" px={4} py={3} color="gray.800" borderBottomWidth="1px" borderColor="gray.100">{claim.item}</Box>
                <Box as="td" px={4} py={3} color="gray.500" fontSize="xs" borderBottomWidth="1px" borderColor="gray.100">{claim.date}</Box>
                <Box as="td" px={4} py={3} color="gray.600" borderBottomWidth="1px" borderColor="gray.100">{claim.reason}</Box>
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
  const t = useTranslations("pages.dashboard");
  const router = useRouter();
  const d = DUMMY.shopify;
  const month = t("month");

  return (
    <Box>
      {/* 헤더 */}
      <Flex align="center" justify="space-between" mb={5}>
        <Box>
          <Text fontSize="xl" fontWeight="bold" color="gray.900">{t("shopifyHeader", { month })}</Text>
          <Text fontSize="xs" color="gray.400" mt={0.5}>{t("asOfDate")}</Text>
        </Box>
        <Badge colorPalette="green" variant="subtle" px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="semibold">
          {t("realtime")}
        </Badge>
      </Flex>

      {/* 주요 KPI */}
      <Grid templateColumns="repeat(4, 1fr)" gap={3}>
        <KpiCard label={t("kpi.orderCount")} value={t("kpi.ordersUnit", { count: d.orderCount.toLocaleString() })} sub={t("kpi.monthOverMonth", { delta: "+8%" })} color="blue" />
        <KpiCard label={t("kpi.salesAmount")} value={`${d.currency} ${d.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub={t("kpi.taxExcluded")} color="green" />
        <KpiCard
          label={t("kpi.pendingShip")}
          value={t("kpi.ordersUnit", { count: d.pendingFulfillment.toString() })}
          sub={t("kpi.needAction")}
          color="orange"
          badge={t("kpi.actionBadge")}
          onClick={() => router.push("/orders?channel=shopify")}
        />
        <KpiCard label={t("kpi.fulfilled")} value={t("kpi.ordersUnit", { count: d.fulfilled.toLocaleString() })} color="default" />
      </Grid>

      {/* 반품/취소 */}
      <SectionTitle>{t("section.returnsCancels")}</SectionTitle>
      <Grid templateColumns="repeat(3, 1fr)" gap={3}>
        <KpiCard label={t("kpi.cancel")} value={t("kpi.ordersUnit", { count: d.cancelCount.toString() })} color="red" />
        <KpiCard label={t("kpi.return")} value={t("kpi.ordersUnit", { count: d.returnCount.toString() })} color="orange" />
        <KpiCard
          label={t("kpi.totalRefund")}
          value={`${d.currency} ${d.refundedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color="red"
        />
      </Grid>

      {/* 인기 상품 */}
      <SectionTitle>{t("section.topItems")}</SectionTitle>
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" overflow="hidden" shadow="xs">
        <Box as="table" w="100%" fontSize="sm" style={{ borderCollapse: "collapse" }}>
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {[t("topItems.rank"), t("topItems.name"), t("topItems.qty"), t("topItems.revenue")].map((h) => (
                <Box key={h} as="th" px={4} py={3} textAlign="left" fontSize="xs" fontWeight="semibold" color="gray.500" borderBottomWidth="1px" borderColor="gray.200">
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {d.topItems.map((item, i) => (
              <Box key={item.name} as="tr" _hover={{ bg: "gray.50" }} transition="background 0.1s">
                <Box as="td" px={4} py={3} borderBottomWidth="1px" borderColor="gray.100">
                  <Box
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    w={6}
                    h={6}
                    borderRadius="full"
                    bg={i === 0 ? "yellow.400" : i === 1 ? "gray.300" : i === 2 ? "orange.300" : "gray.100"}
                    fontSize="xs"
                    fontWeight="bold"
                    color={i < 3 ? "white" : "gray.500"}
                  >
                    {i + 1}
                  </Box>
                </Box>
                <Box as="td" px={4} py={3} color="gray.800" fontWeight="medium" borderBottomWidth="1px" borderColor="gray.100">
                  {item.name}
                </Box>
                <Box as="td" px={4} py={3} color="gray.600" borderBottomWidth="1px" borderColor="gray.100">
                  {t("topItems.qtyUnit", { count: item.qty.toLocaleString() })}
                </Box>
                <Box as="td" px={4} py={3} fontWeight="semibold" color="gray.900" borderBottomWidth="1px" borderColor="gray.100">
                  {d.currency} {item.revenue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
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
  const t = useTranslations("pages.dashboard");
  const { activeChannel } = useActiveChannel();
  const isShopify = activeChannel === "shopify";

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title={t("title")}
        description={t("description")}
        mb={4}
      />
      <Box flex="1" minW={0}>
        {isShopify ? <ShopifyDashboard /> : <Qoo10Dashboard />}
      </Box>
    </Box>
  );
}
