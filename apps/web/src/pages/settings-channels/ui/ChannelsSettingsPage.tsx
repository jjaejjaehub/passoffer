'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Button, Flex, Input, SimpleGrid, Text } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { z } from 'zod';
import type { ChannelId } from '@/shared/config';
import {
  CHANNEL_CONFIG,
  COMING_SOON_CHANNELS,
  LIVE_CHANNELS,
} from '@/shared/config';
import { PageHeader, appToaster } from '@/shared/ui';
import { useChannelApiKey } from '@/entities/channel';


export function ChannelsSettingsPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [selectedChannelId, setSelectedChannelId] = useState<ChannelId>('qoo10');
  const [showConnectForm, setShowConnectForm] = useState<boolean>(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const {
    keys: qoo10Keys,
    hasKey: hasQoo10Key,
    removeKeys: removeQoo10Keys,
    saveKeys: saveQoo10Keys,
  } = useChannelApiKey('qoo10');
  const {
    keys: rakutenKeys,
    hasKey: hasRakutenKey,
    removeKeys: removeRakutenKeys,
    saveKeys: saveRakutenKeys,
  } = useChannelApiKey('rakuten');
  const {
    keys: shopeeKeys,
    hasKey: hasShopeeKey,
    removeKeys: removeShopeeKeys,
    saveKeys: saveShopeeKeys,
  } = useChannelApiKey('shopee');
  const {
    keys: shopifyKeys,
    hasKey: hasShopifyKey,
    removeKeys: removeShopifyKeys,
  } = useChannelApiKey('shopify');

  // 채널별 연결 상태 — React Query 캐시에서 직접 파생 (별도 로컬 state 불필요)
  const isChannelConnected = (channelId: ChannelId): boolean => {
    if (channelId === 'qoo10') return hasQoo10Key;
    if (channelId === 'rakuten') return hasRakutenKey;
    if (channelId === 'shopee') return hasShopeeKey;
    if (channelId === 'shopify') return hasShopifyKey;
    return false;
  };

  // OAuth 콜백 결과 처리
  useEffect(() => {
    const oauthSuccess = searchParams?.get('oauth_success');
    const shopifyConnected = searchParams?.get('shopify');
    const oauthErrorParam = searchParams?.get('oauth_error');
    if (oauthSuccess === '1' || shopifyConnected === 'connected') {
      setSelectedChannelId('shopify');
      setShowConnectForm(false);
    }
    if (oauthErrorParam) {
      setSelectedChannelId('shopify');
      setShowConnectForm(true);
      setOauthError(decodeURIComponent(oauthErrorParam));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const selectedChannel = CHANNEL_CONFIG[selectedChannelId];
  const isConnected = isChannelConnected(selectedChannelId);

  const handleConnect = (): void => {
    setShowConnectForm(true);
  };

  const handleConnectSuccess = (): void => {
    setShowConnectForm(false);
  };

  const handleDisconnect = (): void => {
    if (selectedChannelId === 'qoo10') {
      removeQoo10Keys();
    }
    if (selectedChannelId === 'rakuten') {
      removeRakutenKeys();
    }
    if (selectedChannelId === 'shopee') {
      removeShopeeKeys();
    }
    if (selectedChannelId === 'shopify') {
      removeShopifyKeys();
    }
  };

  return (
    <Box>
      <PageHeader
        title="채널 관리"
        description="판매 채널을 연결하고 API 키를 관리합니다."
        mb={8}
      />

      {/* Live channel tabs */}
      <Flex
        borderBottomWidth="1px"
        borderColor="gray.100"
        mb={8}
        gap={1}
        wrap="wrap"
      >
        {LIVE_CHANNELS.map((channel) => {
          const isActive = selectedChannelId === channel.id;
          const isLiveConnected = isChannelConnected(channel.id);

          return (
            <Button
              key={channel.id}
              variant="ghost"
              onClick={() => {
                setSelectedChannelId(channel.id);
                setShowConnectForm(false);
              }}
              borderRadius={0}
              color={isActive ? 'gray.900' : 'gray.500'}
              fontWeight={isActive ? 'semibold' : 'normal'}
              px={3}
              py={2}
              height="auto"
              border="none"
              outline="none"
              boxShadow={
                isActive
                  ? 'inset 0 -2px 0 0 var(--chakra-colors-gray-900)'
                  : 'none'
              }
              _hover={{
                bg: 'transparent',
                color: 'gray.900',
                boxShadow: 'inset 0 -2px 0 0 var(--chakra-colors-gray-200)',
              }}
              _active={{ bg: 'transparent' }}
              _focus={{
                boxShadow: isActive
                  ? 'inset 0 -2px 0 0 var(--chakra-colors-gray-900)'
                  : 'none',
              }}
            >
              <Flex align="center" gap={2}>
                <Box
                  w={1.5}
                  h={1.5}
                  borderRadius="2px"
                  bg={isLiveConnected ? 'gray.900' : 'gray.300'}
                />
                <Text fontSize="sm">{channel.name}</Text>
              </Flex>
            </Button>
          );
        })}
      </Flex>

      {/* Main panel for selected live channel */}
      <Box mb={12}>
        <Box
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="lg"
          bg="white"
          p={5}
          mb={4}
        >
            <Flex justify="space-between" align="center">
              <Flex align="center" gap={3}>
                <Box
                  w={9}
                  h={9}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="sm" fontWeight="bold" color="gray.600">
                    {selectedChannel.initial}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                    {selectedChannel.name}
                  </Text>
                  <Flex align="center" gap={1.5}>
                    <Box
                      w={1.5}
                      h={1.5}
                      borderRadius="2px"
                      bg={isConnected ? 'gray.900' : 'gray.300'}
                    />
                    <Text fontSize="xs" color="gray.500">
                      {isConnected ? '연결됨 · 마지막 확인: 2분 전' : '미연결'}
                    </Text>
                  </Flex>
                </Box>
              </Flex>

              <Button
                size="sm"
                variant="ghost"
                color="gray.500"
                _hover={{ color: 'gray.900', bg: 'gray.50' }}
                onClick={isConnected ? handleDisconnect : handleConnect}
              >
                {isConnected ? '연결 해제' : '연결하기'}
              </Button>
            </Flex>
        </Box>

        {/* API credentials panel (moved here; collection status removed) */}
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white" p={5}>
            {!isConnected && !showConnectForm && (
              <Box py={8}>
                <Flex direction="column" align="center" gap={6}>
                  <Box>
                    <Flex
                      justify="center"
                      align="center"
                      mb={4}
                      position="relative"
                    >
                      <Box
                        w={16}
                        h={16}
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor="gray.200"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text fontSize="2xl" fontWeight="bold" color="gray.300">
                          {selectedChannel.initial}
                        </Text>
                      </Box>
                    </Flex>
                    <Box textAlign="center">
                      <Text fontSize="lg" fontWeight="semibold" mb={1} color="gray.900">
                        {selectedChannel.name} 미연결
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {selectedChannelId === 'rakuten'
                          ? 'Rakuten RMS API 키를 등록하면 일본 라쿠텐 주문을 자동으로 수집할 수 있습니다.'
                          : 'API 키를 등록하면 주문을 자동으로 수집할 수 있습니다.'}
                      </Text>
                    </Box>
                  </Box>

                  <SimpleGrid
                    columns={3}
                    gap={3}
                    w="100%"
                    maxW="380px"
                  >
                    <Box
                      borderWidth="1px"
                      borderColor="gray.100"
                      borderRadius="lg"
                      bg="gray.50"
                      p={3}
                      textAlign="center"
                    >
                      <ShoppingCart size={14} color="#a3a3a3" />
                      <Text mt={2} fontSize="11px" color="gray.500">
                        주문 자동 수집
                      </Text>
                    </Box>
                    <Box
                      borderWidth="1px"
                      borderColor="gray.100"
                      borderRadius="lg"
                      bg="gray.50"
                      p={3}
                      textAlign="center"
                    >
                      <Package size={14} color="#a3a3a3" />
                      <Text mt={2} fontSize="11px" color="gray.500">
                        상품·재고 동기화
                      </Text>
                    </Box>
                    <Box
                      borderWidth="1px"
                      borderColor="gray.100"
                      borderRadius="lg"
                      bg="gray.50"
                      p={3}
                      textAlign="center"
                    >
                      <TrendingUp size={14} color="#a3a3a3" />
                      <Text mt={2} fontSize="11px" color="gray.500">
                        매출 통합 관리
                      </Text>
                    </Box>
                  </SimpleGrid>

                  <Button
                    size="sm"
                    bg="gray.900"
                    color="white"
                    _hover={{ bg: 'gray.800' }}
                    onClick={() => setShowConnectForm(true)}
                  >
                    {selectedChannel.name} 연결하기
                  </Button>
                </Flex>
              </Box>
            )}

            {((!isConnected && showConnectForm) ||
              (isConnected && (selectedChannelId === 'qoo10' || selectedChannelId === 'rakuten' || selectedChannelId === 'shopee' || selectedChannelId === 'shopify'))) && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={3} color="gray.800">
                  API 자격 증명
                </Text>
                {selectedChannelId === 'qoo10' && (
                  <Qoo10ConnectForm
                    onSuccess={handleConnectSuccess}
                    onSaveKeys={(values) =>
                      saveQoo10Keys({
                        certificationKey: values.apiKey,
                        sellerId: values.sellerId,
                      })
                    }
                    defaultValues={{
                      apiKey: qoo10Keys?.certificationKey ?? '',
                      sellerId: qoo10Keys?.sellerId ?? '',
                    }}
                  />
                )}
                {selectedChannelId === 'rakuten' && (
                  <RakutenConnectForm
                    onSuccess={handleConnectSuccess}
                    onSaveKeys={(values) =>
                      saveRakutenKeys({
                        serviceSecret: values.serviceSecret,
                        licenseKey: values.licenseKey,
                        shopUrl: values.shopUrl,
                      })
                    }
                    defaultValues={{
                      serviceSecret: rakutenKeys?.serviceSecret ?? '',
                      licenseKey: rakutenKeys?.licenseKey ?? '',
                      shopUrl: rakutenKeys?.shopUrl ?? '',
                    }}
                  />
                )}
                {selectedChannelId === 'shopee' && (
                  <ShopeeConnectForm
                    onSuccess={handleConnectSuccess}
                    onSaveKeys={async (values) => {
                      await saveShopeeKeys({
                        partnerId: values.partnerId,
                        partnerKey: values.partnerKey,
                        shopId: values.shopId,
                        accessToken: '',
                        refreshToken: '',
                        expireAt: 0,
                      });
                    }}
                    defaultValues={{
                      partnerId: shopeeKeys?.partnerId ?? '',
                      partnerKey: shopeeKeys?.partnerKey ?? '',
                      shopId: shopeeKeys?.shopId ?? '',
                    }}
                  />
                )}
                {selectedChannelId === 'shopify' && (
                  <ShopifyConnectForm
                    onSuccess={handleConnectSuccess}
                    oauthError={oauthError}
                    defaultValues={{
                      shopDomain: shopifyKeys?.shopDomain ?? '',
                      clientId: shopifyKeys?.clientId ?? '',
                      clientSecret: shopifyKeys?.clientSecret ?? '',
                    }}
                  />
                )}
              </Box>
            )}

            {isConnected && !showConnectForm && selectedChannelId !== 'qoo10' && selectedChannelId !== 'rakuten' && selectedChannelId !== 'shopee' && selectedChannelId !== 'shopify' && (
              <Text fontSize="sm" color="gray.500">
                이 채널은 연결된 상태이며, API 설정은 별도로 제공되지 않습니다.
              </Text>
            )}
          </Box>
      </Box>

      {/* Coming soon channels */}
      <Box>
        <Flex justify="space-between" align="center" mb={3}>
          <Text fontSize="sm" fontWeight="medium" color="gray.600">
            추가 예정 채널
          </Text>
          <Text fontSize="xs" color="gray.400">
            Phase 2
          </Text>
        </Flex>

        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
          {COMING_SOON_CHANNELS.map((channel) => (
            <Box
              key={channel.id}
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              opacity={0.7}
              px={5}
              py={4}
            >
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={3}>
                  <Box
                    w={8}
                    h={8}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize="xs" fontWeight="bold" color="gray.400">
                      {channel.initial}
                    </Text>
                  </Box>
                  <Box>
                    <Flex align="center" gap={2}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.700">
                        {channel.name}
                      </Text>
                      <Box
                        as="span"
                        borderWidth="1px"
                        borderColor="gray.200"
                        borderRadius="full"
                        px={1.5}
                        py={0.5}
                        fontSize="10px"
                        color="gray.400"
                      >
                        준비 중
                      </Box>
                    </Flex>
                    <Text fontSize="xs" color="gray.400">
                      {channel.description}
                    </Text>
                  </Box>
                </Flex>
              </Flex>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
}

const qoo10Schema = z.object({
  apiKey: z.string().min(1, 'API 키를 입력해 주세요'),
  sellerId: z.string().optional().default(''),
});

type Qoo10FormValues = z.infer<typeof qoo10Schema>;

interface Qoo10ConnectFormProps {
  onSuccess: () => void;
  onSaveKeys: (keys: Qoo10FormValues) => Promise<void>;
  defaultValues?: Partial<Qoo10FormValues>;
}

function Qoo10ConnectForm({
  onSuccess,
  onSaveKeys,
  defaultValues,
}: Qoo10ConnectFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Qoo10FormValues>({
    defaultValues: {
      apiKey: defaultValues?.apiKey ?? '',
      sellerId: defaultValues?.sellerId ?? '',
    },
  });

  useEffect(() => {
    if (defaultValues?.apiKey || defaultValues?.sellerId) {
      reset({ apiKey: defaultValues.apiKey ?? '', sellerId: defaultValues.sellerId ?? '' });
    }
  }, [defaultValues?.apiKey, defaultValues?.sellerId, reset]);

  const onSubmit = async (values: Qoo10FormValues): Promise<void> => {
    try {
      await onSaveKeys(values);
      appToaster.create({ type: 'success', title: 'Qoo10 연결 완료', description: 'API 키가 저장되었습니다.' });
      onSuccess();
    } catch {
      appToaster.create({ type: 'error', title: '저장 실패', description: '연결 정보를 다시 확인해 주세요.' });
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)} display="flex" flexDirection="column" gap={3}>
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          API 키 <Text as="span" color="gray.400">*</Text>
        </Text>
        <Input
          type="password"
          placeholder="GMKT-LIVE-XXXXXXXXXX"
          size="sm"
          {...register('apiKey')}
        />
        {errors.apiKey && (
          <Text fontSize="xs" color="gray.500" mt={1}>
            {errors.apiKey.message}
          </Text>
        )}
        <Text fontSize="xs" color="gray.400" mt={1}>
          Qoo10 판매자 센터 {'>'} 환경설정 {'>'} API 키 관리에서 발급
        </Text>
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          판매자 ID <Text as="span" color="gray.400">(선택)</Text>
        </Text>
        <Input
          type="text"
          placeholder="your_seller_id"
          size="sm"
          {...register('sellerId')}
        />
        {errors.sellerId && (
          <Text fontSize="xs" color="gray.500" mt={1}>
            {errors.sellerId.message}
          </Text>
        )}
      </Box>

      <Button
        type="submit"
        size="sm"
        mt={1}
        bg="gray.900"
        color="white"
        _hover={{ bg: 'gray.800' }}
        loading={isSubmitting}
      >
        연결하기
      </Button>
    </Box>
  );
}

const rakutenSchema = z.object({
  serviceSecret: z.string().min(32, 'Service Secret은 32자 이상입니다'),
  licenseKey: z.string().min(32, 'License Key는 32자 이상입니다'),
  shopUrl: z
    .string()
    .min(1, '샵 URL을 입력해 주세요')
    .regex(/^[a-z0-9-]+$/, '영소문자, 숫자, 하이픈(-)만 사용 가능합니다'),
});

type RakutenFormValues = z.infer<typeof rakutenSchema>;

interface RakutenConnectFormProps {
  onSuccess: () => void;
  onSaveKeys: (keys: RakutenFormValues) => Promise<unknown>;
  defaultValues?: Partial<RakutenFormValues>;
}

function RakutenConnectForm({ onSuccess, onSaveKeys, defaultValues }: RakutenConnectFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RakutenFormValues>({
    defaultValues: {
      serviceSecret: defaultValues?.serviceSecret ?? '',
      licenseKey: defaultValues?.licenseKey ?? '',
      shopUrl: defaultValues?.shopUrl ?? '',
    },
  });

  useEffect(() => {
    if (defaultValues?.serviceSecret || defaultValues?.licenseKey || defaultValues?.shopUrl) {
      reset({
        serviceSecret: defaultValues.serviceSecret ?? '',
        licenseKey: defaultValues.licenseKey ?? '',
        shopUrl: defaultValues.shopUrl ?? '',
      });
    }
  }, [defaultValues?.serviceSecret, defaultValues?.licenseKey, defaultValues?.shopUrl, reset]);

  const shopUrl = watch('shopUrl');

  const onSubmit = async (values: RakutenFormValues): Promise<void> => {
    try {
      await onSaveKeys(values);
      appToaster.create({ type: 'success', title: '라쿠텐 연결 완료', description: 'API 키가 저장되었습니다.' });
      onSuccess();
    } catch {
      appToaster.create({ type: 'error', title: '저장 실패', description: '연결 정보를 다시 확인해 주세요.' });
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)} display="flex" flexDirection="column" gap={3}>
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Service Secret <Text as="span" color="gray.400">*</Text>
        </Text>
        <Input
          type="password"
          placeholder="32자 이상의 Service Secret"
          size="sm"
          {...register('serviceSecret')}
        />
        {errors.serviceSecret && (
          <Text fontSize="xs" color="gray.500" mt={1}>
            {errors.serviceSecret.message}
          </Text>
        )}
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          License Key <Text as="span" color="gray.400">*</Text>
        </Text>
        <Input
          type="password"
          placeholder="32자 이상의 License Key"
          size="sm"
          {...register('licenseKey')}
        />
        {errors.licenseKey && (
          <Text fontSize="xs" color="gray.500" mt={1}>
            {errors.licenseKey.message}
          </Text>
        )}
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          샵 URL <Text as="span" color="gray.400">*</Text>
        </Text>
        <Flex>
          <Box
            as="span"
            px={3}
            display="flex"
            alignItems="center"
            borderWidth="1px"
            borderRightWidth="0"
            borderColor="gray.200"
            borderRadius="md"
            borderTopRightRadius={0}
            borderBottomRightRadius={0}
            fontSize="xs"
            bg="gray.50"
            color="gray.500"
          >
            https://
          </Box>
          <Input
            type="text"
            placeholder="your-shop-name"
            size="sm"
            borderRadius={0}
            borderLeftWidth={0}
            borderRightWidth={0}
            {...register('shopUrl')}
          />
          <Box
            as="span"
            px={3}
            display="flex"
            alignItems="center"
            borderWidth="1px"
            borderLeftWidth="0"
            borderColor="gray.200"
            borderRadius="md"
            borderTopLeftRadius={0}
            borderBottomLeftRadius={0}
            fontSize="xs"
            bg="gray.50"
            color="gray.500"
          >
            .shop.rakuten.co.jp
          </Box>
        </Flex>
        {errors.shopUrl && (
          <Text fontSize="xs" color="gray.500" mt={1}>
            {errors.shopUrl.message}
          </Text>
        )}
        {shopUrl && !errors.shopUrl && (
          <Text fontSize="xs" color="gray.500" mt={1}>
            접속 URL: https://{shopUrl}.shop.rakuten.co.jp
          </Text>
        )}
      </Box>

      <Button
        type="submit"
        size="sm"
        mt={1}
        bg="gray.900"
        color="white"
        _hover={{ bg: 'gray.800' }}
        loading={isSubmitting}
      >
        연결하기
      </Button>
    </Box>
  );
}

// ─── Shopee 연결 폼 ─────────────────────────────────────────────────────────
const shopeeSchema = z.object({
  partnerId: z.string().min(1, 'Partner ID를 입력해 주세요'),
  partnerKey: z.string().min(1, 'Partner Key를 입력해 주세요'),
  shopId: z.string().min(1, 'Shop ID를 입력해 주세요'),
});
type ShopeeFormValues = z.infer<typeof shopeeSchema>;

interface ShopeeConnectFormProps {
  onSuccess: () => void;
  onSaveKeys: (values: ShopeeFormValues) => Promise<void>;
  defaultValues?: Partial<ShopeeFormValues>;
}

function ShopeeConnectForm({ onSuccess, onSaveKeys, defaultValues }: ShopeeConnectFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopeeFormValues>({
    defaultValues: {
      partnerId: defaultValues?.partnerId ?? '',
      partnerKey: defaultValues?.partnerKey ?? '',
      shopId: defaultValues?.shopId ?? '',
    },
  });

  useEffect(() => {
    if (defaultValues?.partnerId || defaultValues?.partnerKey || defaultValues?.shopId) {
      reset({
        partnerId: defaultValues.partnerId ?? '',
        partnerKey: defaultValues.partnerKey ?? '',
        shopId: defaultValues.shopId ?? '',
      });
    }
  }, [defaultValues?.partnerId, defaultValues?.partnerKey, defaultValues?.shopId, reset]);

  const onSubmit = async (values: ShopeeFormValues) => {
    try {
      await onSaveKeys(values);
      appToaster.create({ type: 'success', title: 'Shopee 연결 완료', description: '저장되었습니다.' });
      onSuccess();
    } catch {
      appToaster.create({ type: 'error', title: '저장 실패', description: '연결 정보를 다시 확인해 주세요.' });
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)} display="flex" flexDirection="column" gap={3}>
      <Box>
        <Text fontSize="xs" color="gray.500" mb={1}>
          Partner ID
        </Text>
        <Input
          {...register('partnerId')}
          size="sm"
          placeholder="Shopee Partner ID"
          borderColor={errors.partnerId ? 'red.400' : 'gray.200'}
        />
        {errors.partnerId && (
          <Text fontSize="xs" color="red.500" mt={1}>
            {errors.partnerId.message}
          </Text>
        )}
      </Box>

      <Box>
        <Text fontSize="xs" color="gray.500" mb={1}>
          Partner Key
        </Text>
        <Input
          {...register('partnerKey')}
          size="sm"
          type="password"
          placeholder="Shopee Partner Key"
          borderColor={errors.partnerKey ? 'red.400' : 'gray.200'}
        />
        {errors.partnerKey && (
          <Text fontSize="xs" color="red.500" mt={1}>
            {errors.partnerKey.message}
          </Text>
        )}
      </Box>

      <Box>
        <Text fontSize="xs" color="gray.500" mb={1}>
          Shop ID
        </Text>
        <Input
          {...register('shopId')}
          size="sm"
          placeholder="Shopee Shop ID"
          borderColor={errors.shopId ? 'red.400' : 'gray.200'}
        />
        {errors.shopId && (
          <Text fontSize="xs" color="red.500" mt={1}>
            {errors.shopId.message}
          </Text>
        )}
      </Box>

      <Button
        type="submit"
        size="sm"
        mt={1}
        bg="gray.900"
        color="white"
        _hover={{ bg: 'gray.800' }}
        loading={isSubmitting}
      >
        연결하기
      </Button>
    </Box>
  );
}

// ─── Shopify 연결 폼 (OAuth Authorization Code Flow) ─────────
const shopifySchema = z.object({
  shopDomain: z
    .string()
    .min(1, '스토어 도메인을 입력해 주세요')
    .regex(
      /^[a-z0-9-]+\.myshopify\.com$/,
      'your-store.myshopify.com 형식으로 입력해 주세요',
    ),
  clientId: z.string().min(1, 'Client ID를 입력해 주세요'),
  clientSecret: z.string().min(1, 'Client Secret을 입력해 주세요'),
});

type ShopifyFormValues = z.infer<typeof shopifySchema>;

interface ShopifyConnectFormProps {
  onSuccess: () => void;
  oauthError?: string | null;
  defaultValues?: Partial<ShopifyFormValues>;
}

function ShopifyConnectForm({ onSuccess: _onSuccess, oauthError, defaultValues }: ShopifyConnectFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopifyFormValues>({
    defaultValues: {
      shopDomain: defaultValues?.shopDomain ?? '',
      clientId: defaultValues?.clientId ?? '',
      clientSecret: defaultValues?.clientSecret ?? '',
    },
  });

  useEffect(() => {
    if (defaultValues?.shopDomain || defaultValues?.clientId || defaultValues?.clientSecret) {
      reset({
        shopDomain: defaultValues.shopDomain ?? '',
        clientId: defaultValues.clientId ?? '',
        clientSecret: defaultValues.clientSecret ?? '',
      });
    }
  }, [defaultValues?.shopDomain, defaultValues?.clientId, defaultValues?.clientSecret, reset]);

  const shopDomain = watch('shopDomain');

  const onSubmit = async (values: ShopifyFormValues): Promise<void> => {
    const res = await fetch('/api/shopify/auth/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = (await res.json()) as { redirectUrl?: string; error?: string };
    if (!res.ok || !data.redirectUrl) {
      throw new Error(data.error ?? 'OAuth URL 생성 실패');
    }
    window.location.href = data.redirectUrl;
  };

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)} display="flex" flexDirection="column" gap={3}>
      {oauthError && (
        <Box bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" color="red.600">{oauthError}</Text>
        </Box>
      )}

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          스토어 도메인 <Text as="span" color="gray.400">*</Text>
        </Text>
        <Input
          type="text"
          placeholder="your-store.myshopify.com"
          size="sm"
          {...register('shopDomain')}
        />
        {errors.shopDomain ? (
          <Text fontSize="xs" color="gray.500" mt={1}>
            {errors.shopDomain.message}
          </Text>
        ) : shopDomain ? (
          <Text fontSize="xs" color="gray.400" mt={1}>
            Admin URL: https://{shopDomain}/admin
          </Text>
        ) : (
          <Text fontSize="xs" color="gray.400" mt={1}>
            Shopify Dev Dashboard {'>'} Apps {'>'} Develop apps에서 앱 생성 후 확인
          </Text>
        )}
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Client ID <Text as="span" color="gray.400">*</Text>
        </Text>
        <Input
          type="text"
          placeholder="Client ID"
          size="sm"
          {...register('clientId')}
        />
        {errors.clientId && (
          <Text fontSize="xs" color="gray.500" mt={1}>
            {errors.clientId.message}
          </Text>
        )}
        <Text fontSize="xs" color="gray.400" mt={1}>
          앱 {'>'} API credentials 탭에서 확인
        </Text>
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Client Secret <Text as="span" color="gray.400">*</Text>
        </Text>
        <Input
          type="password"
          placeholder="Client Secret"
          size="sm"
          {...register('clientSecret')}
        />
        {errors.clientSecret && (
          <Text fontSize="xs" color="gray.500" mt={1}>
            {errors.clientSecret.message}
          </Text>
        )}
      </Box>

      <Button
        type="submit"
        size="sm"
        mt={1}
        bg="gray.900"
        color="white"
        _hover={{ bg: 'gray.800' }}
        loading={isSubmitting}
      >
        Shopify 인증하기
      </Button>
    </Box>
  );
}
