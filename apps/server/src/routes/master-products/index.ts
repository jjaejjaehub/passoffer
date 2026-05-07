import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MasterProductService } from '../../services/MasterProductService';
import { PLATFORM_CONSTRAINTS, CHANNEL_REQUIRED_FIELDS } from '../../lib/platformFieldConstraints';

const imageSchema = z.object({
  url: z.string().url('유효한 URL을 입력해 주세요'),
  altText: z.string().optional(),
  order: z.number().int().optional(),
});

const masterProductBody = z.object({
  code: z.string().min(1, '상품 코드를 입력해 주세요').max(64),
  title: z.string().min(1, '상품명을 입력해 주세요').max(255),
  descriptionHtml: z.string().optional(),
  brand: z.string().max(128).optional(),
  hsCode: z.string().max(20).optional(),
  countryOfOrigin: z.string().max(64).optional(),
  material: z.string().max(256).optional(),
  weightG: z.number().int().min(0).optional(),
  retailPrice: z.string().optional(),
  images: z.array(imageSchema).optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.unknown()).optional(),
});

const variantOptionValueSchema = z.object({
  groupName: z.string().min(1).max(128),
  value: z.string().min(1).max(128),
});

const variantBody = z.object({
  sku: z.string().min(1, 'SKU를 입력해 주세요').max(128),
  optionValues: z.array(variantOptionValueSchema).optional(),
  price: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  extraAttributes: z.record(z.unknown()).optional(),
});

const optionGroupsBody = z.object({
  groups: z.array(
    z.object({
      name: z.string().min(1, '옵션 그룹명을 입력해 주세요').max(128),
      values: z.array(z.string().min(1).max(128)).min(1, '옵션 값을 1개 이상 입력해 주세요'),
    }),
  ),
});

const linkToChannelBody = z.object({
  channelId: z.string().uuid(),
  channelItemId: z.string().min(1),
  variantLinks: z
    .array(
      z.object({
        masterVariantId: z.string().uuid(),
        channelVariantId: z.string().min(1),
        channelSellerCode: z.string().optional(),
      }),
    )
    .default([]),
});

export async function masterProductRoutes(app: FastifyInstance): Promise<void> {
  const getSvc = (userId: string) => new MasterProductService(app, userId);

  // ─── 플랫폼 제약 메타 ───────────────────────────────────────

  app.get('/platform-constraints', async () => {
    return { constraints: PLATFORM_CONSTRAINTS, requiredFields: CHANNEL_REQUIRED_FIELDS };
  });

  // ─── 마스터 상품 CRUD ───────────────────────────────────────

  app.get('/master-products', { preHandler: [app.authenticate] }, async (request) => {
    const query = request.query as { search?: string; page?: string; pageSize?: string };
    return getSvc(request.user.userId).listMasterProducts({
      search: query.search,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  });

  app.get<{ Params: { id: string } }>(
    '/master-products/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const product = await getSvc(request.user.userId).getMasterProduct(request.params.id);
      if (!product) return reply.status(404).send({ error: 'NOT_FOUND', message: '마스터 상품을 찾을 수 없습니다.' });
      return product;
    },
  );

  app.post('/master-products', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = masterProductBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    const created = await getSvc(request.user.userId).createMasterProduct(parsed.data);
    return reply.status(201).send(created);
  });

  app.put<{ Params: { id: string } }>(
    '/master-products/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = masterProductBody.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      const updated = await getSvc(request.user.userId).updateMasterProduct(request.params.id, parsed.data);
      if (!updated) return reply.status(404).send({ error: 'NOT_FOUND' });
      return updated;
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/master-products/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const deleted = await getSvc(request.user.userId).deleteMasterProduct(request.params.id);
      if (!deleted) return reply.status(404).send({ error: 'NOT_FOUND' });
      return { ok: true };
    },
  );

  // ─── 옵션 그룹 (다축 옵션) 일괄 설정 ────────────────────────

  app.put<{ Params: { id: string } }>(
    '/master-products/:id/option-groups',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = optionGroupsBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      try {
        const result = await getSvc(request.user.userId).setOptionGroups(request.params.id, parsed.data.groups);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '옵션 그룹 설정에 실패했습니다.';
        return reply.status(400).send({ error: 'SET_OPTION_GROUPS_FAILED', message: msg });
      }
    },
  );

  // ─── 변형 CRUD ──────────────────────────────────────────────

  app.get<{ Params: { id: string } }>(
    '/master-products/:id/variants',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const product = await getSvc(request.user.userId).getMasterProduct(request.params.id);
      if (!product) return reply.status(404).send({ error: 'NOT_FOUND' });
      return product.variants;
    },
  );

  app.post<{ Params: { id: string } }>(
    '/master-products/:id/variants',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = variantBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      try {
        const created = await getSvc(request.user.userId).addVariant(request.params.id, parsed.data);
        return reply.status(201).send(created);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '오류가 발생했습니다.';
        return reply.status(404).send({ error: 'NOT_FOUND', message: msg });
      }
    },
  );

  app.put<{ Params: { id: string; vid: string } }>(
    '/master-products/:id/variants/:vid',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = variantBody.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      try {
        const updated = await getSvc(request.user.userId).updateVariant(
          request.params.id,
          request.params.vid,
          parsed.data,
        );
        if (!updated) return reply.status(404).send({ error: 'NOT_FOUND' });
        return updated;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '오류가 발생했습니다.';
        return reply.status(404).send({ error: 'NOT_FOUND', message: msg });
      }
    },
  );

  app.delete<{ Params: { id: string; vid: string } }>(
    '/master-products/:id/variants/:vid',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        await getSvc(request.user.userId).deleteVariant(request.params.id, request.params.vid);
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : '오류가 발생했습니다.';
        return reply.status(404).send({ error: 'NOT_FOUND', message: msg });
      }
    },
  );

  // ─── 채널 연결 / 해제 ───────────────────────────────────────

  // POST /api/master-products/:id/link
  app.post<{ Params: { id: string } }>(
    '/master-products/:id/link',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = linkToChannelBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      try {
        const result = await getSvc(request.user.userId).linkToChannel(
          request.params.id,
          parsed.data.channelId,
          parsed.data.channelItemId,
          parsed.data.variantLinks,
        );
        return reply.status(201).send(result);
      } catch (err) {
        app.log.error(err);
        const msg = err instanceof Error ? err.message : '채널 연결에 실패했습니다.';
        return reply.status(400).send({ error: 'LINK_FAILED', message: msg });
      }
    },
  );

  // POST /api/master-products/:id/list  — 채널에 신규 등록
  app.post<{ Params: { id: string } }>(
    '/master-products/:id/list',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = z
        .object({
          channelId: z.string().uuid(),
          overrides: z.record(z.unknown()).optional(),
        })
        .safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
      }
      try {
        const result = await getSvc(request.user.userId).registerToChannel(
          request.params.id,
          parsed.data.channelId,
          parsed.data.overrides ?? {},
        );
        return reply.status(201).send(result);
      } catch (err) {
        app.log.error(err);
        const msg = err instanceof Error ? err.message : '채널 등록에 실패했습니다.';
        return reply.status(400).send({ error: 'LIST_FAILED', message: msg });
      }
    },
  );

  // DELETE /api/listed-products/:id (unlink)
  app.delete<{ Params: { id: string } }>(
    '/listed-products/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        await getSvc(request.user.userId).unlinkFromChannel(request.params.id);
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : '연결 해제에 실패했습니다.';
        return reply.status(404).send({ error: 'NOT_FOUND', message: msg });
      }
    },
  );

  // ─── 판매 상품 목록 / 상세 ──────────────────────────────────

  app.get('/listed-products', { preHandler: [app.authenticate] }, async (request) => {
    const query = request.query as {
      channelId?: string;
      masterProductId?: string;
      page?: string;
      pageSize?: string;
    };
    return getSvc(request.user.userId).listListedProducts({
      channelId: query.channelId,
      masterProductId: query.masterProductId,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  });

  app.get('/listed-products/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return getSvc(request.user.userId).getListedProduct(id);
  });

  // ─── 판매 동기화 ────────────────────────────────────────────

  app.post<{ Params: { id: string } }>(
    '/listed-products/:id/pull-sales',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const result = await getSvc(request.user.userId).pullSalesFromChannel(request.params.id);
        return result;
      } catch (err) {
        app.log.error(err);
        const msg = err instanceof Error ? err.message : '판매 동기화에 실패했습니다.';
        return reply.status(400).send({ error: 'PULL_SALES_FAILED', message: msg });
      }
    },
  );

  // ─── 마스터 전체 채널 재고 동기화 ──────────────────────────

  app.post<{ Params: { id: string } }>(
    '/master-products/:id/pull-sales',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const result = await getSvc(request.user.userId).pullSalesFromAllChannels(request.params.id);
        return result;
      } catch (err) {
        app.log.error(err);
        const msg = err instanceof Error ? err.message : '주문 집계에 실패했습니다.';
        return reply.status(400).send({ error: 'PULL_SALES_FAILED', message: msg });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/master-products/:id/push-stock',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const result = await getSvc(request.user.userId).pushMasterStockToAllChannels(request.params.id);
        return result;
      } catch (err) {
        app.log.error(err);
        const msg = err instanceof Error ? err.message : '재고 동기화에 실패했습니다.';
        return reply.status(400).send({ error: 'PUSH_STOCK_FAILED', message: msg });
      }
    },
  );

  // ─── 재고 동기화 (listed product 단건) ──────────────────────

  app.post<{ Params: { id: string } }>(
    '/listed-products/:id/push-stock',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const result = await getSvc(request.user.userId).pushStockToChannel(request.params.id);
        return result;
      } catch (err) {
        app.log.error(err);
        const msg = err instanceof Error ? err.message : '재고 동기화에 실패했습니다.';
        return reply.status(400).send({ error: 'PUSH_STOCK_FAILED', message: msg });
      }
    },
  );

  // ─── 상품 정보 동기화 (master → channel) ────────────────────

  app.post<{ Params: { id: string } }>(
    '/listed-products/:id/sync-info',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const result = await getSvc(request.user.userId).syncProductInfoToChannel(request.params.id);
        return result;
      } catch (err) {
        app.log.error(err);
        const msg = err instanceof Error ? err.message : '상품 정보 동기화에 실패했습니다.';
        return reply.status(400).send({ error: 'SYNC_INFO_FAILED', message: msg });
      }
    },
  );
}
