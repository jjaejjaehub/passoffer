"use client";

import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Grid,
  Icon,
  Input,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChevronRight,
  Package,
  Send,
  ShoppingBag,
  Star,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Seller {
  id: string;
  name: string;
  description: string;
  categories: string[];
  monthlyRevenue: string;
  productCount: number;
  partnerCount: number;
  rating: number;
  verified: boolean;
  mainMarkets: string[];
  founded: string;
  minOrderQty: number;
}

// ─────────────────────────────────────────────
// Dummy data
// ─────────────────────────────────────────────

const SELLERS: Seller[] = [
  {
    id: "s1",
    name: "스타일코리아",
    description: "K-패션 전문 셀러. Qoo10·Shopee·Lazada에서 국내 의류·잡화 브랜드를 유통합니다.",
    categories: ["의류", "잡화", "악세서리"],
    monthlyRevenue: "₩ 4.2억",
    productCount: 1_840,
    partnerCount: 38,
    rating: 4.8,
    verified: true,
    mainMarkets: ["Qoo10", "Shopee SG", "Lazada MY"],
    founded: "2019",
    minOrderQty: 10,
  },
  {
    id: "s2",
    name: "뷰티플래닛",
    description: "K-뷰티 특화 셀러. 싱가포르·말레이시아 시장에서 높은 리뷰 점수를 보유하고 있습니다.",
    categories: ["스킨케어", "색조", "헤어케어"],
    monthlyRevenue: "₩ 2.8억",
    productCount: 620,
    partnerCount: 21,
    rating: 4.9,
    verified: true,
    mainMarkets: ["Shopee SG", "Shopee MY", "Qoo10"],
    founded: "2020",
    minOrderQty: 30,
  },
  {
    id: "s3",
    name: "홈리빙마켓",
    description: "가구·인테리어·주방용품 전문. 일본 Qoo10에서 상위 0.5% 판매자입니다.",
    categories: ["가구", "인테리어", "주방용품"],
    monthlyRevenue: "₩ 1.5억",
    productCount: 980,
    partnerCount: 14,
    rating: 4.6,
    verified: false,
    mainMarkets: ["Qoo10 JP", "Rakuten"],
    founded: "2021",
    minOrderQty: 5,
  },
  {
    id: "s4",
    name: "테크기어코리아",
    description: "IT 주변기기·전자제품 유통 전문. 동남아 전 지역에 빠른 배송 네트워크를 갖추고 있습니다.",
    categories: ["전자제품", "IT 주변기기", "스마트홈"],
    monthlyRevenue: "₩ 6.1억",
    productCount: 430,
    partnerCount: 52,
    rating: 4.7,
    verified: true,
    mainMarkets: ["Shopee TH", "Shopee PH", "Lazada"],
    founded: "2018",
    minOrderQty: 20,
  },
  {
    id: "s5",
    name: "키즈월드",
    description: "유아·아동 카테고리 전문 셀러. 안전 인증 제품만 취급하며 높은 재구매율을 자랑합니다.",
    categories: ["유아용품", "완구", "아동의류"],
    monthlyRevenue: "₩ 0.9억",
    productCount: 310,
    partnerCount: 9,
    rating: 4.5,
    verified: false,
    mainMarkets: ["Qoo10", "Shopee MY"],
    founded: "2022",
    minOrderQty: 15,
  },
  {
    id: "s6",
    name: "스포츠엔라이프",
    description: "스포츠·아웃도어 전문 멀티채널 셀러. 자체 물류센터 보유로 빠른 출고가 가능합니다.",
    categories: ["스포츠", "아웃도어", "피트니스"],
    monthlyRevenue: "₩ 3.3억",
    productCount: 760,
    partnerCount: 27,
    rating: 4.7,
    verified: true,
    mainMarkets: ["Shopee SG", "Lazada TH", "Qoo10"],
    founded: "2019",
    minOrderQty: 10,
  },
];

// ─────────────────────────────────────────────
// SellerCard
// ─────────────────────────────────────────────

function SellerCard({ seller, onClick }: { seller: Seller; onClick: () => void }) {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      p={5}
      cursor="pointer"
      _hover={{ borderColor: "blue.300", shadow: "md" }}
      transition="all 0.15s"
      onClick={onClick}
    >
      <Flex align="flex-start" justify="space-between" mb={3}>
        <Flex align="center" gap={3}>
          <Flex
            w={10}
            h={10}
            bg="blue.50"
            borderRadius="lg"
            align="center"
            justify="center"
            flexShrink={0}
          >
            <Icon as={Store} boxSize={5} color="blue.500" />
          </Flex>
          <Box>
            <Flex align="center" gap={1.5}>
              <Text fontWeight="semibold" fontSize="sm" color="gray.900">
                {seller.name}
              </Text>
              {seller.verified && (
                <Icon as={BadgeCheck} boxSize={4} color="blue.500" />
              )}
            </Flex>
            <Text fontSize="xs" color="gray.500">{seller.founded}년 설립</Text>
          </Box>
        </Flex>
        <Flex align="center" gap={1}>
          <Icon as={Star} boxSize={3.5} color="yellow.400" />
          <Text fontSize="xs" fontWeight="medium" color="gray.700">{seller.rating}</Text>
        </Flex>
      </Flex>

      <Text fontSize="xs" color="gray.600" mb={3} lineClamp={2}>
        {seller.description}
      </Text>

      <Flex gap={1.5} flexWrap="wrap" mb={4}>
        {seller.categories.map((c) => (
          <Badge key={c} size="sm" variant="subtle" colorPalette="blue" borderRadius="full" px={2}>
            {c}
          </Badge>
        ))}
      </Flex>

      <Grid templateColumns="repeat(3, 1fr)" gap={2} mb={4}>
        <Box textAlign="center" bg="gray.50" borderRadius="lg" py={2}>
          <Flex align="center" justify="center" gap={1} mb={0.5}>
            <Icon as={TrendingUp} boxSize={3} color="green.500" />
            <Text fontSize="xs" color="gray.500">월 매출</Text>
          </Flex>
          <Text fontSize="sm" fontWeight="semibold" color="gray.900">{seller.monthlyRevenue}</Text>
        </Box>
        <Box textAlign="center" bg="gray.50" borderRadius="lg" py={2}>
          <Flex align="center" justify="center" gap={1} mb={0.5}>
            <Icon as={Package} boxSize={3} color="purple.500" />
            <Text fontSize="xs" color="gray.500">상품 수</Text>
          </Flex>
          <Text fontSize="sm" fontWeight="semibold" color="gray.900">{seller.productCount.toLocaleString()}</Text>
        </Box>
        <Box textAlign="center" bg="gray.50" borderRadius="lg" py={2}>
          <Flex align="center" justify="center" gap={1} mb={0.5}>
            <Icon as={Users} boxSize={3} color="orange.500" />
            <Text fontSize="xs" color="gray.500">파트너 수</Text>
          </Flex>
          <Text fontSize="sm" fontWeight="semibold" color="gray.900">{seller.partnerCount}</Text>
        </Box>
      </Grid>

      <Flex align="center" justify="space-between">
        <Flex gap={1.5} flexWrap="wrap">
          {seller.mainMarkets.slice(0, 2).map((m) => (
            <Badge key={m} size="sm" variant="outline" colorPalette="gray" borderRadius="full" px={2} fontSize="10px">
              {m}
            </Badge>
          ))}
          {seller.mainMarkets.length > 2 && (
            <Badge size="sm" variant="outline" colorPalette="gray" borderRadius="full" px={2} fontSize="10px">
              +{seller.mainMarkets.length - 2}
            </Badge>
          )}
        </Flex>
        <Flex align="center" gap={1} color="blue.500">
          <Text fontSize="xs" fontWeight="medium">입점 신청</Text>
          <Icon as={ChevronRight} boxSize={3.5} />
        </Flex>
      </Flex>
    </Box>
  );
}

// ─────────────────────────────────────────────
// RequestFormModal
// ─────────────────────────────────────────────

function RequestFormModal({
  seller,
  onClose,
  onSubmit,
}: {
  seller: Seller;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [form, setForm] = useState({
    productName: "",
    productCategory: "",
    rs: "",
    fit: "standard",
    minDiscount: "",
    maxDiscount: "",
    minOrderQty: String(seller.minOrderQty),
    contractPeriod: "6",
    targetMarkets: [] as string[],
    message: "",
  });

  function toggleMarket(market: string) {
    setForm((prev) => ({
      ...prev,
      targetMarkets: prev.targetMarkets.includes(market)
        ? prev.targetMarkets.filter((m) => m !== market)
        : [...prev.targetMarkets, market],
    }));
  }

  return (
    <Dialog.Root open onOpenChange={(d) => { if (!d.open) onClose(); }} size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxH="90vh" overflowY="auto">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" pb={4}>
            <Flex align="center" gap={3}>
              <Box
                as="button"
                onClick={onClose}
                color="gray.400"
                _hover={{ color: "gray.700" }}
                p={1}
                borderRadius="md"
              >
                <Icon as={ArrowLeft} boxSize={4} />
              </Box>
              <Box>
                <Dialog.Title fontSize="md">입점 신청서</Dialog.Title>
                <Text fontSize="xs" color="gray.500" mt={0.5}>{seller.name}에 내 상품 등록 요청</Text>
              </Box>
            </Flex>
          </Dialog.Header>

          <Dialog.Body py={6}>
            <Stack gap={6}>
              {/* 기본 상품 정보 */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={3}>
                  등록 상품 정보
                </Text>
                <Stack gap={3}>
                  <Box>
                    <Text fontSize="xs" color="gray.600" mb={1}>상품명 *</Text>
                    <Input
                      size="sm"
                      placeholder="등록할 상품명을 입력하세요"
                      value={form.productName}
                      onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))}
                    />
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.600" mb={1}>상품 카테고리 *</Text>
                    <Input
                      size="sm"
                      placeholder="예: 스킨케어, 의류, IT 주변기기"
                      value={form.productCategory}
                      onChange={(e) => setForm((p) => ({ ...p, productCategory: e.target.value }))}
                    />
                  </Box>
                </Stack>
              </Box>

              {/* R/S & Fit */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={3}>
                  수수료 및 정산 조건
                </Text>
                <Grid templateColumns="1fr 1fr" gap={3}>
                  <Box>
                    <Text fontSize="xs" color="gray.600" mb={1}>R/S (Revenue Share) *</Text>
                    <Flex align="center" gap={2}>
                      <Input
                        size="sm"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="예: 20"
                        value={form.rs}
                        onChange={(e) => setForm((p) => ({ ...p, rs: e.target.value }))}
                        w="100px"
                      />
                      <Text fontSize="sm" color="gray.500">%</Text>
                    </Flex>
                    <Text fontSize="10px" color="gray.400" mt={1}>셀러에게 지급할 판매 수익 비율</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.600" mb={1}>Fit 유형 *</Text>
                    <Flex gap={2}>
                      {[
                        { value: "standard", label: "Standard" },
                        { value: "premium", label: "Premium" },
                        { value: "custom", label: "Custom" },
                      ].map((opt) => (
                        <Box
                          key={opt.value}
                          as="button"
                          px={3}
                          py={1.5}
                          borderRadius="md"
                          borderWidth="1px"
                          fontSize="xs"
                          fontWeight="medium"
                          bg={form.fit === opt.value ? "blue.500" : "white"}
                          color={form.fit === opt.value ? "white" : "gray.600"}
                          borderColor={form.fit === opt.value ? "blue.500" : "gray.200"}
                          onClick={() => setForm((p) => ({ ...p, fit: opt.value }))}
                          transition="all 0.1s"
                        >
                          {opt.label}
                        </Box>
                      ))}
                    </Flex>
                  </Box>
                </Grid>
              </Box>

              {/* 할인율 */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={3}>
                  할인율 범위
                </Text>
                <Grid templateColumns="1fr 1fr" gap={3}>
                  <Box>
                    <Text fontSize="xs" color="gray.600" mb={1}>최소 할인율 *</Text>
                    <Flex align="center" gap={2}>
                      <Input
                        size="sm"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="예: 5"
                        value={form.minDiscount}
                        onChange={(e) => setForm((p) => ({ ...p, minDiscount: e.target.value }))}
                        w="100px"
                      />
                      <Text fontSize="sm" color="gray.500">%</Text>
                    </Flex>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.600" mb={1}>최대 할인율 *</Text>
                    <Flex align="center" gap={2}>
                      <Input
                        size="sm"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="예: 30"
                        value={form.maxDiscount}
                        onChange={(e) => setForm((p) => ({ ...p, maxDiscount: e.target.value }))}
                        w="100px"
                      />
                      <Text fontSize="sm" color="gray.500">%</Text>
                    </Flex>
                  </Box>
                </Grid>
              </Box>

              {/* 계약 조건 */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={3}>
                  계약 조건
                </Text>
                <Grid templateColumns="1fr 1fr" gap={3}>
                  <Box>
                    <Text fontSize="xs" color="gray.600" mb={1}>최소 발주 수량</Text>
                    <Flex align="center" gap={2}>
                      <Input
                        size="sm"
                        type="number"
                        min={1}
                        value={form.minOrderQty}
                        onChange={(e) => setForm((p) => ({ ...p, minOrderQty: e.target.value }))}
                        w="100px"
                      />
                      <Text fontSize="sm" color="gray.500">개</Text>
                    </Flex>
                    <Text fontSize="10px" color="gray.400" mt={1}>셀러 권장: {seller.minOrderQty}개 이상</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.600" mb={1}>계약 기간</Text>
                    <Flex gap={2} flexWrap="wrap">
                      {["3", "6", "12", "24"].map((m) => (
                        <Box
                          key={m}
                          as="button"
                          px={3}
                          py={1.5}
                          borderRadius="md"
                          borderWidth="1px"
                          fontSize="xs"
                          fontWeight="medium"
                          bg={form.contractPeriod === m ? "blue.500" : "white"}
                          color={form.contractPeriod === m ? "white" : "gray.600"}
                          borderColor={form.contractPeriod === m ? "blue.500" : "gray.200"}
                          onClick={() => setForm((p) => ({ ...p, contractPeriod: m }))}
                          transition="all 0.1s"
                        >
                          {m}개월
                        </Box>
                      ))}
                    </Flex>
                  </Box>
                </Grid>
              </Box>

              {/* 판매 마켓 */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={1}>
                  희망 판매 마켓
                </Text>
                <Text fontSize="xs" color="gray.500" mb={3}>셀러가 운영 중인 마켓 중 등록을 원하는 곳을 선택하세요</Text>
                <Flex gap={2} flexWrap="wrap">
                  {seller.mainMarkets.map((market) => (
                    <Box
                      key={market}
                      as="button"
                      px={3}
                      py={1.5}
                      borderRadius="full"
                      borderWidth="1px"
                      fontSize="xs"
                      fontWeight="medium"
                      bg={form.targetMarkets.includes(market) ? "blue.50" : "white"}
                      color={form.targetMarkets.includes(market) ? "blue.600" : "gray.600"}
                      borderColor={form.targetMarkets.includes(market) ? "blue.400" : "gray.200"}
                      onClick={() => toggleMarket(market)}
                      transition="all 0.1s"
                    >
                      {market}
                    </Box>
                  ))}
                </Flex>
              </Box>

              {/* 추가 메시지 */}
              <Box>
                <Text fontSize="xs" color="gray.600" mb={1}>추가 요청사항</Text>
                <Textarea
                  size="sm"
                  placeholder="셀러에게 전달할 내용을 입력하세요 (선택)"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                />
              </Box>
            </Stack>
          </Dialog.Body>

          <Dialog.Footer borderTopWidth="1px" borderColor="gray.100" pt={4}>
            <Flex justify="flex-end" gap={2}>
              <Button size="sm" variant="outline" colorPalette="gray" onClick={onClose}>
                취소
              </Button>
              <Button
                size="sm"
                bg="blue.500"
                color="white"
                _hover={{ bg: "blue.600" }}
                onClick={onSubmit}
              >
                <Icon as={Send} boxSize={3.5} mr={1.5} />
                신청서 제출
              </Button>
            </Flex>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

// ─────────────────────────────────────────────
// SellerListModal
// ─────────────────────────────────────────────

function SellerListModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <Dialog.Root open onOpenChange={(d) => { if (!d.open) { setSubmitted(false); onClose(); } }} size="sm">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Body py={12}>
              <Stack align="center" gap={4}>
                <Flex
                  w={16}
                  h={16}
                  bg="green.50"
                  borderRadius="full"
                  align="center"
                  justify="center"
                >
                  <Icon as={BadgeCheck} boxSize={8} color="green.500" />
                </Flex>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="gray.900" mb={1}>
                    신청이 완료되었습니다
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    셀러가 요청을 검토한 후 영업일 기준 3일 이내에 답변을 드립니다.
                  </Text>
                </Box>
                <Button
                  size="sm"
                  bg="gray.900"
                  color="white"
                  _hover={{ bg: "gray.800" }}
                  onClick={() => { setSubmitted(false); onClose(); }}
                >
                  확인
                </Button>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    );
  }

  if (selectedSeller) {
    return (
      <RequestFormModal
        seller={selectedSeller}
        onClose={() => setSelectedSeller(null)}
        onSubmit={() => {
          setSelectedSeller(null);
          setSubmitted(true);
        }}
      />
    );
  }

  return (
    <Dialog.Root open onOpenChange={(d) => { if (!d.open) onClose(); }} size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxH="90vh">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" pb={4}>
            <Box>
              <Dialog.Title>셀러 목록</Dialog.Title>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                내 상품을 위탁 판매해줄 셀러를 선택하세요
              </Text>
            </Box>
          </Dialog.Header>

          <Dialog.Body py={6} overflowY="auto">
            <Grid
              templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
              gap={4}
            >
              {SELLERS.map((seller) => (
                <SellerCard
                  key={seller.id}
                  seller={seller}
                  onClick={() => setSelectedSeller(seller)}
                />
              ))}
            </Grid>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

// ─────────────────────────────────────────────
// ExternalSellersPage
// ─────────────────────────────────────────────

export function ExternalSellersPage(): React.JSX.Element {
  const [showSellerList, setShowSellerList] = useState(false);

  return (
    <Box h="100%" display="flex" flexDirection="column" bg="gray.50">
      {/* Header */}
      <Box bg="white" borderBottomWidth="1px" borderColor="gray.200" px={8} py={5}>
        <Flex align="center" justify="space-between">
          <Box>
            <Text fontSize="xl" fontWeight="bold" color="gray.900">외부 상품</Text>
            <Text fontSize="sm" color="gray.500" mt={0.5}>
              외부 셀러의 마켓에 내 상품을 위탁 등록할 수 있습니다
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Content */}
      <Box flex="1" display="flex" alignItems="center" justifyContent="center" px={8}>
        <Stack align="center" gap={5}>
          <Flex
            w={20}
            h={20}
            bg="gray.100"
            borderRadius="full"
            align="center"
            justify="center"
          >
            <Icon as={Building2} boxSize={9} color="gray.400" />
          </Flex>
          <Box textAlign="center">
            <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={1}>
              아직 등록된 셀러가 없습니다
            </Text>
            <Text fontSize="sm" color="gray.500">
              셀러에게 내 상품 등록을 신청하면 이곳에 표시됩니다
            </Text>
          </Box>
          <Button
            bg="blue.500"
            color="white"
            _hover={{ bg: "blue.600" }}
            size="md"
            onClick={() => setShowSellerList(true)}
          >
            <Icon as={ShoppingBag} boxSize={4} mr={2} />
            셀러 신청하기
          </Button>
        </Stack>
      </Box>

      {showSellerList && (
        <SellerListModal onClose={() => setShowSellerList(false)} />
      )}
    </Box>
  );
}
