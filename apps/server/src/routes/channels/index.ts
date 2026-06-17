import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ChannelService } from '../../services/ChannelService';

const upsertQoo10Body = z.object({
  certKey: z.string().min(1, 'API 키를 입력해 주세요'),
  sellerId: z.string().default(''),
});

export async function channelRoutes(app: FastifyInstance): Promise<void> {
  const getSvc = (userId: string) => new ChannelService(app, userId);

  // GET /api/channels — 전체 채널 목록 (인증 필요)
  app.get('/channels', { preHandler: [app.authenticate] }, async (request) => {
    return getSvc(request.user.userId).listChannels();
  });

  // GET /api/channels/qoo10/credential — Qoo10 인증키 조회 (인증 필요)
  app.get('/channels/qoo10/credential', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await getSvc(request.user.userId).getQoo10Credential();
    if (!result) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Qoo10 채널이 연결되지 않았습니다.' });
    }
    return result;
  });

  // PUT /api/channels/qoo10 — Qoo10 채널 연결/키 갱신 (인증 필요)
  app.put('/channels/qoo10', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = upsertQoo10Body.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    await getSvc(request.user.userId).upsertQoo10(parsed.data.certKey, parsed.data.sellerId);
    return { ok: true };
  });

  // DELETE /api/channels/qoo10 — Qoo10 채널 연결 해제 (인증 필요)
  app.delete('/channels/qoo10', { preHandler: [app.authenticate] }, async (request, reply) => {
    const svc = getSvc(request.user.userId);
    const channel = await svc.findChannelByType('QOO10_JP');
    if (!channel) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Qoo10 채널을 찾을 수 없습니다.' });
    }
    await svc.deleteChannel(channel.id);
    return { ok: true };
  });

  // ─── Shopee 전용 엔드포인트 ──────────────────────────────────────

  const upsertShopeeBody = z.object({
    partnerId: z.string().min(1, 'Partner ID를 입력해 주세요'),
    partnerKey: z.string().min(1, 'Partner Key를 입력해 주세요'),
    shopId: z.string().min(1, 'Shop ID를 입력해 주세요'),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    expireIn: z.number().optional(),
  });

  // GET /api/channels/shopee/credential
  app.get('/channels/shopee/credential', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await getSvc(request.user.userId).getShopeeCredential();
    if (!result) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Shopee 채널이 연결되지 않았습니다.' });
    }
    return result;
  });

  // PUT /api/channels/shopee
  app.put('/channels/shopee', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = upsertShopeeBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    await getSvc(request.user.userId).upsertShopee(parsed.data);
    return { ok: true };
  });

  // DELETE /api/channels/shopee
  app.delete('/channels/shopee', { preHandler: [app.authenticate] }, async (request, reply) => {
    const svc = getSvc(request.user.userId);
    const channel = await svc.findChannelByType('SHOPEE');
    if (!channel) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Shopee 채널을 찾을 수 없습니다.' });
    }
    await svc.deleteChannel(channel.id);
    return { ok: true };
  });

  // ─── Shopify 전용 엔드포인트 ─────────────────────────────────

  const upsertShopifyBody = z.object({
    shopDomain: z
      .string()
      .min(1, '스토어 도메인을 입력해 주세요')
      .transform((v) => v.replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase())
      .pipe(z.string().regex(/^[a-z0-9-]+\.myshopify\.com$/, 'myshopify.com 형식이어야 합니다')),
    clientId: z.string().optional().default(''),
    clientSecret: z.string().optional().default(''),
    accessToken: z.string().min(1, 'Access Token을 입력해 주세요'),
    refreshToken: z.string().optional().default(''),
    expireIn: z.number().optional(),
  });

  // GET /api/channels/shopify/credential
  app.get('/channels/shopify/credential', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await getSvc(request.user.userId).getShopifyCredential();
    if (!result) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Shopify 채널이 연결되지 않았습니다.' });
    }
    return result;
  });

  // PUT /api/channels/shopify — OAuth 완료 후 토큰 저장
  app.put('/channels/shopify', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = upsertShopifyBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }

    const { shopDomain, clientId, clientSecret, accessToken, refreshToken, expireIn } = parsed.data;
    const expireAt = expireIn ? Math.floor(Date.now() / 1000) + expireIn : 0;
    await getSvc(request.user.userId).upsertShopify({ shopDomain, clientId, clientSecret, accessToken, refreshToken, expireAt });
    return { ok: true };
  });

  // DELETE /api/channels/shopify
  app.delete('/channels/shopify', { preHandler: [app.authenticate] }, async (request, reply) => {
    const svc = getSvc(request.user.userId);
    const channel = await svc.findChannelByType('SHOPIFY');
    if (!channel) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Shopify 채널을 찾을 수 없습니다.' });
    }
    await svc.deleteChannel(channel.id);
    return { ok: true };
  });

  // ─── Rakuten 전용 엔드포인트 ─────────────────────────────────

  const upsertRakutenBody = z.object({
    serviceSecret: z.string().min(1, 'Service Secret을 입력해 주세요'),
    licenseKey: z.string().min(1, 'License Key를 입력해 주세요'),
    shopUrl: z.string().min(1, '샵 URL을 입력해 주세요'),
  });

  // GET /api/channels/rakuten/credential
  app.get('/channels/rakuten/credential', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await getSvc(request.user.userId).getRakutenCredential();
    if (!result) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Rakuten 채널이 연결되지 않았습니다.' });
    }
    return result;
  });

  // PUT /api/channels/rakuten
  app.put('/channels/rakuten', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = upsertRakutenBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    await getSvc(request.user.userId).upsertRakuten(parsed.data);
    return { ok: true };
  });

  // DELETE /api/channels/rakuten
  app.delete('/channels/rakuten', { preHandler: [app.authenticate] }, async (request, reply) => {
    const svc = getSvc(request.user.userId);
    const channel = await svc.findChannelByType('RAKUTEN');
    if (!channel) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Rakuten 채널을 찾을 수 없습니다.' });
    }
    await svc.deleteChannel(channel.id);
    return { ok: true };
  });

  // ─── 기존 범용 엔드포인트 (하위 호환) ────────────────────────

  // POST /api/channels
  app.post('/channels', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = z.object({
      channelType: z.enum(['QOO10_JP', 'SHOPEE', 'RAKUTEN', 'CUSTOM']),
      name: z.string().min(1),
      adapterVersion: z.string().optional(),
      certKey: z.string().min(1),
      sellerId: z.string().optional(),
    }).safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: body.error.flatten() });
    }
    const channel = await getSvc(request.user.userId).createChannel(body.data);
    return reply.status(201).send(channel);
  });

  // POST /api/channels/:id/credentials
  app.post<{ Params: { id: string } }>(
    '/channels/:id/credentials',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = z.object({ certKey: z.string().min(1) }).safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      await getSvc(request.user.userId).updateCredential(request.params.id, parsed.data.certKey);
      return { ok: true };
    },
  );

  // POST /api/channels/:id/validate
  app.post<{ Params: { id: string } }>(
    '/channels/:id/validate',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const svc = getSvc(request.user.userId);
        const adapter = await svc.getAdapter(request.params.id);
        const isValid = await adapter.validateCredential();
        if (isValid) {
          await svc.activateChannel(request.params.id);
        }
        return { valid: isValid };
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'Validation failed';
        return reply.status(400).send({ error: 'VALIDATION_FAILED', message });
      }
    },
  );

  // GET /api/channels/:id/health
  app.get<{ Params: { id: string } }>(
    '/channels/:id/health',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const health = await getSvc(request.user.userId).checkHealth(request.params.id);
        return health;
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'Health check failed';
        return reply.status(400).send({ error: 'HEALTH_CHECK_FAILED', message });
      }
    },
  );

  // ─── 채널 상품 실시간 조회 ─────────────────────────────────────

  // GET /api/channels/:id/products — 채널에서 실시간으로 상품 목록을 가져오고 DB 연결 상태를 병합
  app.get<{ Params: { id: string } }>(
    '/channels/:id/products',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const svc = getSvc(request.user.userId);
        const query = request.query as { page?: string; pageSize?: string; status?: string };
        const adapter = await svc.getAdapter(request.params.id);
        if (!adapter.listChannelProducts) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 상품 목록 조회를 지원하지 않습니다.' });
        }
        const result = await adapter.listChannelProducts({
          page: query.page ? Number(query.page) : 1,
          pageSize: query.pageSize ? Number(query.pageSize) : 50,
          status: query.status,
        });

        // DB에서 이 채널의 연결된 listed_products 조회하여 link 상태 병합
        const { listedProducts } = await import('../../db/schema');
        const { eq, and } = await import('drizzle-orm');
        const linkedRows = await app.db
          .select({
            channelItemId: listedProducts.channelItemId,
            id: listedProducts.id,
            masterProductId: listedProducts.masterProductId,
            syncStatus: listedProducts.syncStatus,
          })
          .from(listedProducts)
          .where(and(eq(listedProducts.channelId, request.params.id)));
        const linkedMap = new Map(
          linkedRows.map((r) => [
            r.channelItemId,
            { listedProductId: r.id, masterProductId: r.masterProductId, syncStatus: r.syncStatus },
          ]),
        );

        const itemsWithLinkStatus = result.items.map((item) => ({
          ...item,
          linkStatus: linkedMap.has(item.channelItemId) ? ('linked' as const) : ('unlinked' as const),
          ...(linkedMap.get(item.channelItemId) ?? {}),
        }));

        return { ...result, items: itemsWithLinkStatus };
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : '채널 상품 조회에 실패했습니다.';
        return reply.status(400).send({ error: 'FETCH_FAILED', message });
      }
    },
  );

  // GET /api/channels/:id/products/:itemId — 단일 채널 상품 실시간 조회 (바리에이션 포함) + DB 연결 상태 병합
  app.get<{ Params: { id: string; itemId: string } }>(
    '/channels/:id/products/:itemId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const svc = getSvc(request.user.userId);
        const adapter = await svc.getAdapter(request.params.id);
        if (!adapter.getChannelProduct) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 상품 상세 조회를 지원하지 않습니다.' });
        }
        const product = await adapter.getChannelProduct(request.params.itemId);

        // DB에서 연결 정보 조회
        const { listedProducts, listedProductVariantLinks } = await import('../../db/schema');
        const { eq, and } = await import('drizzle-orm');
        const [linked] = await app.db
          .select()
          .from(listedProducts)
          .where(and(eq(listedProducts.channelId, request.params.id), eq(listedProducts.channelItemId, request.params.itemId)))
          .limit(1);

        let variantLinks: Array<{ channelVariantId: string; masterVariantId: string; channelSellerCode: string | null }> = [];
        if (linked) {
          variantLinks = await app.db
            .select({ channelVariantId: listedProductVariantLinks.channelVariantId, masterVariantId: listedProductVariantLinks.masterVariantId, channelSellerCode: listedProductVariantLinks.channelSellerCode })
            .from(listedProductVariantLinks)
            .where(eq(listedProductVariantLinks.listedProductId, linked.id));
        }

        return {
          ...product,
          linkStatus: linked ? ('linked' as const) : ('unlinked' as const),
          listedProductId: linked?.id ?? null,
          masterProductId: linked?.masterProductId ?? null,
          syncStatus: linked?.syncStatus ?? null,
          variantLinks,
        };
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : '채널 상품 조회에 실패했습니다.';
        return reply.status(400).send({ error: 'FETCH_FAILED', message });
      }
    },
  );

  // POST /api/channels/:id/products/:itemId/update-seller-code — 채널 바리에이션 SKU/SellerCode 업데이트
  app.post<{ Params: { id: string; itemId: string } }>(
    '/channels/:id/products/:itemId/update-seller-code',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = z.object({
        channelVariantId: z.string().min(1),
        newCode: z.string().min(1),
      }).safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      try {
        const svc = getSvc(request.user.userId);
        const adapter = await svc.getAdapter(request.params.id);
        if (!adapter.updateSellerCode) {
          return reply.status(501).send({ error: 'NOT_SUPPORTED', message: '이 채널은 SellerCode 업데이트를 지원하지 않습니다.' });
        }
        const result = await adapter.updateSellerCode(parsed.data.channelVariantId, parsed.data.newCode);
        return result;
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : 'SellerCode 업데이트에 실패했습니다.';
        return reply.status(400).send({ error: 'UPDATE_FAILED', message });
      }
    },
  );

  // POST /channels/:id/products/:itemId/link — 채널 상품을 마스터 상품에 링크
  const linkBody = z.object({
    masterProductId: z.string().uuid(),
    variantMappings: z
      .array(
        z.object({
          masterVariantId: z.string().uuid(),
          channelVariantId: z.string().min(1),
          overrideSellerCode: z.boolean().optional(),
        }),
      )
      .default([]),
  });

  app.post<{ Params: { id: string; itemId: string } }>(
    '/channels/:id/products/:itemId/link',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = linkBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }

      const { masterProductId, variantMappings } = parsed.data;
      const channelId = request.params.id;
      const channelItemId = request.params.itemId;

      try {
        const svc = getSvc(request.user.userId);
        const adapter = await svc.getAdapter(channelId);

        // 채널 상품 재조회 (최신 상태 확인)
        let channelProduct: Awaited<ReturnType<NonNullable<typeof adapter.getChannelProduct>>>;
        if (adapter.getChannelProduct) {
          channelProduct = await adapter.getChannelProduct(channelItemId);
        }

        // 변형 링크 배열 구성 (masterVariantId, channelVariantId, channelSellerCode)
        const { MasterProductService } = await import('../../services/MasterProductService');
        const masterSvc = new MasterProductService(app, request.user.userId);

        const variantLinksForDb = variantMappings.map((vm) => ({
          masterVariantId: vm.masterVariantId,
          channelVariantId: vm.channelVariantId,
        }));

        // DB에 링크 생성
        const listedProduct = await masterSvc.linkToChannel(
          masterProductId,
          channelId,
          channelItemId,
          variantLinksForDb,
        );

        // overrideSellerCode === true인 항목: 마스터 SKU를 채널에 반영
        const sellerCodeUpdates: Array<{ channelVariantId: string; status: string; error?: string }> = [];
        if (adapter.updateSellerCode) {
          const { masterProductVariants } = await import('../../db/schema');
          const { eq } = await import('drizzle-orm');

          for (const vm of variantMappings) {
            if (!vm.overrideSellerCode) continue;
            const [variant] = await app.db
              .select({ sku: masterProductVariants.sku })
              .from(masterProductVariants)
              .where(eq(masterProductVariants.id, vm.masterVariantId))
              .limit(1);

            if (!variant?.sku) {
              sellerCodeUpdates.push({ channelVariantId: vm.channelVariantId, status: 'SKIPPED', error: 'No SKU on master variant' });
              continue;
            }

            const updateResult = await adapter.updateSellerCode(vm.channelVariantId, variant.sku);
            sellerCodeUpdates.push({ channelVariantId: vm.channelVariantId, status: updateResult.status, error: updateResult.error });
          }
        }

        return {
          listedProductId: listedProduct.id,
          linkedVariantCount: variantMappings.length,
          sellerCodeUpdates,
          stockPushStatus: 'PENDING',
        };
      } catch (err: unknown) {
        app.log.error(err);
        const message = err instanceof Error ? err.message : '링크 생성에 실패했습니다.';
        return reply.status(400).send({ error: 'LINK_FAILED', message });
      }
    },
  );
}
