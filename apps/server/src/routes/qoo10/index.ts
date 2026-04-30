import type { FastifyInstance } from 'fastify';
import { ChannelService } from '../../services/ChannelService';

// ─── Qoo10 API URLs ───────────────────────────────────────────────────────────

const QAPI_BASE = 'https://api.qoo10.jp/GMKT.INC.Front.QAPIService/ebayjapan.qapi';

const QOO10_URLS = {
  getShippingInfo: `${QAPI_BASE}/ShippingBasic.GetShippingInfo_v3`,
  getShippingAndClaimByOrderNo: `${QAPI_BASE}/ShippingBasic.GetShippingAndClaimInfoByOrderNo_V2`,
  setSendingInfo: `${QAPI_BASE}/ShippingBasic.SetSendingInfo`,
  setSellerCheck: `${QAPI_BASE}/ShippingBasic.SetSellerCheckYN_V2`,
  getClaimInfo: `${QAPI_BASE}/ShippingBasic.GetClaimInfo_V3`,
  setCancelProcess: `${QAPI_BASE}/Claim.SetCancelProcess`,
  setClaimAccept: `${QAPI_BASE}/Claim.SetClaimAccept`,
  setClaimRedelivery: `${QAPI_BASE}/Claim.SetClaimRedelivery`,
  getItemDetail: `${QAPI_BASE}/ItemsLookup.GetItemDetailInfo`,
  getGoodsInventory: `${QAPI_BASE}/ItemsLookup.GetGoodsInventoryInfo`,
  editGoodsInventory: `${QAPI_BASE}/ItemsOptions.EditGoodsInventory`,
  getGoodsOption: `${QAPI_BASE}/ItemsLookup.GetGoodsOptionInfo`,
  editGoodsOption: `${QAPI_BASE}/ItemsOptions.EditGoodsOption`,
  editGoodsStatus: `${QAPI_BASE}/ItemsBasic.EditGoodsStatus`,
  editGoodsContents: `${QAPI_BASE}/ItemsContents.EditGoodsContents`,
  editGoodsImage: `${QAPI_BASE}/ItemsContents.EditGoodsImage`,
  updateGoods: `${QAPI_BASE}/ItemsBasic.UpdateGoods`,
  setGoodsPriceQty: `${QAPI_BASE}/ItemsOrder.SetGoodsPriceQty`,
  getAllGoodsInfo: `${QAPI_BASE}/ItemsLookup.GetAllGoodsInfo`,
  setNewGoods: `${QAPI_BASE}/ItemsBasic.SetNewGoods`,
  getCategoryList: `${QAPI_BASE}/CommonInfoLookup.GetCatagoryListAll`,
  searchBrand: `${QAPI_BASE}/CommonInfoLookup.SearchBrand`,
  getShippingTemplates: `${QAPI_BASE}/ItemsLookup.GetSellerDeliveryGroupInfo`,
  getQnaList: `${QAPI_BASE}/CSCenter.GetInquiryMessage`,
  setQnaAnswer: `${QAPI_BASE}/CSCenter.SetInquiryMessage`,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function getNumericResultCode(data: Record<string, unknown>): number | null {
  const raw = data.ResultCode;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function callQoo10Form(
  url: string,
  certKey: string,
  form: URLSearchParams,
  headers?: Record<string, string>,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      GiosisCertificationKey: certKey,
      QAPIVersion: '1.0',
      Accept: 'application/json',
      ...headers,
    },
    body: form.toString(),
  });
  let data: unknown = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text || null; }
  return { ok: res.ok, status: res.status, data };
}

async function callQoo10Json(
  url: string,
  certKey: string,
  payload: unknown,
  certHeader = 'giosiscertificationkey',
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      [certHeader]: certKey,
      QAPIVersion: '1.0',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  let data: unknown = null;
  const jsonBody = await res.text();
  try { data = JSON.parse(jsonBody); } catch { data = jsonBody || null; }
  return { ok: res.ok, status: res.status, data };
}

// Inventory normalizer (replicated from web app)
interface Qoo10GoodsInventoryRow {
  Name1: string; Value1: string;
  Name2: string; Value2: string;
  Name3: string; Value3: string;
  Name4: string; Value4: string;
  Name5: string; Value5: string;
  Price: number; Qty: number; ItemTypeCode: string;
}

function readTextField(r: Record<string, unknown>, k: string): string {
  const v = r[k];
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

function readIntField(r: Record<string, unknown>, k: string): number {
  const v = r[k];
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return 0;
}

function readDecimalField(r: Record<string, unknown>, k: string): number {
  const v = r[k];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeInventoryRows(value: unknown): Qoo10GoodsInventoryRow[] {
  if (!Array.isArray(value)) return [];
  const out: Qoo10GoodsInventoryRow[] = [];
  for (const el of value) {
    if (!isRecord(el)) continue;
    out.push({
      Name1: readTextField(el, 'Name1'), Value1: readTextField(el, 'Value1'),
      Name2: readTextField(el, 'Name2'), Value2: readTextField(el, 'Value2'),
      Name3: readTextField(el, 'Name3'), Value3: readTextField(el, 'Value3'),
      Name4: readTextField(el, 'Name4'), Value4: readTextField(el, 'Value4'),
      Name5: readTextField(el, 'Name5'), Value5: readTextField(el, 'Value5'),
      Price: readDecimalField(el, 'Price'),
      Qty: readIntField(el, 'Qty'),
      ItemTypeCode: readTextField(el, 'ItemTypeCode'),
    });
  }
  return out;
}

const QOO10_GET_ALL_GOODS_ITEM_STATUSES = ['S1', 'S2', 'S3', 'U1', 'R1'];

// ─── Route Registration ───────────────────────────────────────────────────────

export async function qoo10Routes(app: FastifyInstance): Promise<void> {
  /** 공통 인증키 획득 — 없으면 throw */
  async function getCertKey(userId?: string): Promise<string> {
    const svc = new ChannelService(app, userId);
    const cred = await svc.getQoo10Credential();
    if (!cred) {
      const err = new Error('Qoo10 API 키가 없습니다.');
      (err as Error & { statusCode: number }).statusCode = 401;
      throw err;
    }
    return cred.certificationKey;
  }

  // ─── 배송 조회 (GetShippingInfo_v3) ────────────────────────────────────────

  app.post('/qoo10/shipping', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as Record<string, unknown>;

    const form = new URLSearchParams();
    form.set('ShippingStatus', String(body.ShippingStatus ?? ''));
    form.set('SearchStartDate', String(body.SearchStartDate ?? ''));
    form.set('SearchEndDate', String(body.SearchEndDate ?? ''));
    form.set('SearchCondition', String(body.SearchCondition ?? '1'));
    form.set('returnType', 'json');

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.getShippingInfo, certKey, form, {
      giosiscertificationkey: certKey,
      GiosisCertificationKey: certKey,
    });

    if (!ok) return reply.status(502).send({ error: 'QOO10_HTTP_ERROR', message: `Qoo10 HTTP ${status}` });
    return reply.send(data);
  });

  // ─── 주문 상세 (GetShippingAndClaimInfoByOrderNo_V2) ───────────────────────

  app.get('/qoo10/shipping/:orderNo', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const { orderNo } = req.params as { orderNo: string };

    if (!orderNo || !/^\d{9,}$/.test(orderNo)) {
      return reply.status(400).send({ error: 'INVALID_ORDER_NO', message: '주문번호 형식이 올바르지 않습니다.' });
    }

    const form = new URLSearchParams();
    form.set('OrderNo', orderNo);
    form.set('returnType', 'json');

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.getShippingAndClaimByOrderNo, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'QOO10_HTTP_ERROR', message: `Qoo10 HTTP ${status}` });
    return reply.send(data);
  });

  // ─── 발송 처리 (SetSendingInfo) ────────────────────────────────────────────

  app.post('/qoo10/shipping/send', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { orderNo?: string; shippingCorp?: string; trackingNo?: string };

    if (!body.orderNo || !body.shippingCorp || !body.trackingNo) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'orderNo, shippingCorp, trackingNo가 필요합니다.' });
    }

    const form = new URLSearchParams();
    form.set('OrderNo', body.orderNo);
    form.set('ShippingCorp', body.shippingCorp);
    form.set('TrackingNo', body.trackingNo);
    form.set('returnType', 'json');

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.setSendingInfo, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });

    const d = data as { ResultCode: number; ResultMsg: string };
    if (d.ResultCode !== 0) return reply.status(400).send({ error: 'API_ERROR', code: d.ResultCode, message: d.ResultMsg });
    return reply.send({ ok: true });
  });

  // ─── 발송예정일/배송준비 (SetSellerCheckYN_V2) ─────────────────────────────

  app.post('/qoo10/shipping/seller-check', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { orderNo?: string; estShipDt?: string; delayType?: string; delayMemo?: string };

    if (!body.orderNo) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'orderNo가 필요합니다.' });
    }

    const form = new URLSearchParams();
    form.set('OrderNo', body.orderNo);
    if (body.estShipDt) form.set('EstShipDt', body.estShipDt);
    if (body.delayType) form.set('DelayType', body.delayType);
    if (body.delayMemo) form.set('DelayMemo', body.delayMemo);
    form.set('returnType', 'json');

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.setSellerCheck, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });

    const d = data as { ResultCode: number; ResultMsg: string };
    if (d.ResultCode !== 0) return reply.status(400).send({ error: 'API_ERROR', code: d.ResultCode, message: d.ResultMsg });
    return reply.send({ ok: true });
  });

  // ─── 클레임 조회 (GetClaimInfo_V3) ────────────────────────────────────────

  app.post('/qoo10/claim', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { ClaimStat?: string; search_Sdate: string; search_Edate: string; search_condition?: string };

    const form = new URLSearchParams();
    form.set('ClaimStat', body.ClaimStat ?? '');
    form.set('search_Sdate', body.search_Sdate);
    form.set('search_Edate', body.search_Edate);
    form.set('search_condition', body.search_condition ?? '2');
    form.set('returnType', 'json');

    const res = await fetch(QOO10_URLS.getClaimInfo, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        giosiscertificationkey: certKey,
        QAPIVersion: '1.0',
        Accept: 'application/json',
      },
      body: form.toString(),
    });

    if (!res.ok) return reply.status(502).send({ error: 'QOO10_HTTP_ERROR', message: `Qoo10 HTTP ${res.status}` });
    let data: unknown;
    try { data = await res.json(); } catch { return reply.status(502).send({ error: 'INVALID_RESPONSE', message: 'Qoo10 응답을 파싱할 수 없습니다.' }); }
    return reply.send(data);
  });

  // ─── 취소 처리 (SetCancelProcess) ─────────────────────────────────────────

  app.post('/qoo10/claim/cancel', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { contrNo?: string; cancelReason?: string; sellerMemo?: string };

    if (!body.contrNo) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'contrNo(주문번호)가 필요합니다.' });
    }

    const form = new URLSearchParams();
    form.set('ContrNo', body.contrNo);
    form.set('returnType', 'json');
    if (body.cancelReason) form.set('CancelReason', body.cancelReason);
    if (body.sellerMemo) form.set('SellerMemo', body.sellerMemo);

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.setCancelProcess, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });

    const d = data as { ResultCode: number; ResultMsg: string };
    if (d.ResultCode !== 0) return reply.status(400).send({ error: 'API_ERROR', code: d.ResultCode, message: d.ResultMsg });
    return reply.send({ ok: true });
  });

  // ─── 클레임 승인 (SetClaimAccept) ─────────────────────────────────────────

  app.post('/qoo10/claim/accept', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { orderNo?: string; sellerName?: string; sellerZipCode?: string; sellerFrontAddress?: string; sellerBackAddress?: string; sellerHpNo?: string; sellerTelNo?: string };

    if (!body.orderNo) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'orderNo(주문번호)가 필요합니다.' });
    }

    const form = new URLSearchParams();
    form.set('orderNo', body.orderNo);
    form.set('returnType', 'json');
    if (body.sellerName) form.set('seller_name', body.sellerName);
    if (body.sellerZipCode) form.set('seller_zip_code', body.sellerZipCode);
    if (body.sellerFrontAddress) form.set('seller_front_address', body.sellerFrontAddress);
    if (body.sellerBackAddress) form.set('seller_back_address', body.sellerBackAddress);
    if (body.sellerHpNo) form.set('seller_hp_no', body.sellerHpNo);
    if (body.sellerTelNo) form.set('seller_tel_no', body.sellerTelNo);

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.setClaimAccept, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });

    const d = data as { ResultCode: number; ResultMsg: string };
    if (d.ResultCode !== 0) return reply.status(400).send({ error: 'API_ERROR', code: d.ResultCode, message: d.ResultMsg });
    return reply.send({ ok: true });
  });

  // ─── 재배송 처리 (SetClaimRedelivery) ─────────────────────────────────────

  app.post('/qoo10/claim/redelivery', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { orderNo?: string; redeliveryDate?: string; invoiceNo?: string; delCompanyName?: string; rcvName?: string; rcvZipCode?: string; rcvFrontAddress?: string; rcvBackAddress?: string; rcvHpNo?: string; rcvTelNo?: string };

    if (!body.orderNo || !body.redeliveryDate) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'orderNo(주문번호), redeliveryDate(재발송일)가 필요합니다.' });
    }

    const form = new URLSearchParams();
    form.set('orderNo', body.orderNo);
    form.set('redelivery_date', body.redeliveryDate);
    form.set('returnType', 'json');
    if (body.invoiceNo) form.set('invoice_no', body.invoiceNo);
    if (body.delCompanyName) form.set('del_comapny_name', body.delCompanyName);
    if (body.rcvName) form.set('rcv_name', body.rcvName);
    if (body.rcvZipCode) form.set('rcv_zip_code', body.rcvZipCode);
    if (body.rcvFrontAddress) form.set('rcv_front_address', body.rcvFrontAddress);
    if (body.rcvBackAddress) form.set('rcv_back_address', body.rcvBackAddress);
    if (body.rcvHpNo) form.set('rcv_hp_no', body.rcvHpNo);
    if (body.rcvTelNo) form.set('rcv_tel_no', body.rcvTelNo);

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.setClaimRedelivery, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });

    const d = data as { ResultCode: number; ResultMsg: string };
    if (d.ResultCode !== 0) return reply.status(400).send({ error: 'API_ERROR', code: d.ResultCode, message: d.ResultMsg });
    return reply.send({ ok: true });
  });

  // ─── 상품 상세 (GetItemDetailInfo) ────────────────────────────────────────

  app.get('/qoo10/items/:itemCode', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const { itemCode: rawItemCode } = req.params as { itemCode: string };
    const itemCode = decodeURIComponent(rawItemCode);
    const { sellerCode = '' } = req.query as { sellerCode?: string };

    const form = new URLSearchParams();
    form.set('returnType', 'json');
    form.set('ItemCode', itemCode);
    if (sellerCode.trim()) form.set('SellerCode', sellerCode.trim());

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.getItemDetail, certKey, form, { QAPIVersion: '1.2' });
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });
    if (!isRecord(data)) return reply.status(502).send({ error: 'INVALID_SHAPE' });

    const rc = getNumericResultCode(data);
    if (rc !== 0) return reply.status(400).send({ error: 'API_ERROR', code: rc, message: data.ResultMsg });
    return reply.send(data);
  });

  // ─── 재고 조회/수정 (GetGoodsInventoryInfo / EditGoodsInventory) ───────────

  app.get('/qoo10/items/:itemCode/inventory', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const { itemCode: rawItemCode } = req.params as { itemCode: string };
    const itemCode = decodeURIComponent(rawItemCode).trim();
    const { sellerCode = '' } = req.query as { sellerCode?: string };

    const { ok, status, data } = await callQoo10Json(
      QOO10_URLS.getGoodsInventory,
      certKey,
      { returnType: 'json', ItemCode: itemCode, SellerCode: sellerCode.trim() },
    );
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });
    if (!isRecord(data)) return reply.status(502).send({ error: 'INVALID_SHAPE' });

    const rc = getNumericResultCode(data);
    if (rc !== 0) return reply.status(400).send({ error: 'API_ERROR', code: rc, message: data.ResultMsg });

    const rows = normalizeInventoryRows(data.ResultObject);
    if (rows.length === 0) return reply.send({ type: 'none' });
    return reply.send({ type: 'inventory', items: rows });
  });

  app.put('/qoo10/items/:itemCode/inventory', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const { itemCode: rawItemCode } = req.params as { itemCode: string };
    const itemCode = decodeURIComponent(rawItemCode).trim();
    const body = req.body as { InventoryInfo?: string };

    if (!body.InventoryInfo) {
      return reply.status(400).send({ error: '옵션 데이터가 없습니다.' });
    }

    const { ok, status, data } = await callQoo10Json(
      QOO10_URLS.editGoodsInventory,
      certKey,
      { returnType: 'json', ItemCode: itemCode, SellerCode: '', InventoryInfo: body.InventoryInfo },
      'GIOSISCertificationKey',
    );
    if (!ok) return reply.status(502).send({ error: `Qoo10 서버 오류: HTTP ${status}` });
    if (!isRecord(data)) return reply.status(502).send({ error: 'Qoo10 응답 형식 오류' });

    const rc = getNumericResultCode(data);
    const msg = typeof data.ResultMsg === 'string' ? data.ResultMsg : String(data.ResultMsg ?? '');
    if (rc !== 0) return reply.status(400).send({ error: `Qoo10 오류 (${rc}): ${msg}` });
    return reply.send({ success: true });
  });

  // ─── 옵션 조회/수정 (GetGoodsOptionInfo / EditGoodsOption) ────────────────

  app.post('/qoo10/items/:itemCode/options', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const { itemCode: rawItemCode } = req.params as { itemCode: string };
    const itemCode = decodeURIComponent(rawItemCode).trim();

    const { ok, status, data } = await callQoo10Json(
      QOO10_URLS.getGoodsOption,
      certKey,
      { returnType: 'json', ItemCode: itemCode, SellerCode: '' },
      'GIOSISCertificationKey',
    );
    if (!ok) return reply.status(502).send({ error: 'NETWORK_ERROR', code: status });
    if (!isRecord(data)) return reply.status(502).send({ error: 'INVALID_SHAPE' });

    const rc = getNumericResultCode(data);
    if (rc !== 0) return reply.status(400).send({ error: 'API_ERROR', code: rc, message: data.ResultMsg });

    const items = normalizeSimpleOptions(data.ResultObject);
    if (items.length === 0) return reply.send({ type: 'none' });
    return reply.send({ type: 'simple', items });
  });

  app.put('/qoo10/items/:itemCode/options', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const { itemCode: rawItemCode } = req.params as { itemCode: string };
    const itemCode = decodeURIComponent(rawItemCode).trim();
    const body = req.body as { AdditionalOption?: string };

    if (!body.AdditionalOption) {
      return reply.status(400).send({ error: '옵션 데이터가 없습니다.' });
    }

    const { ok, status, data } = await callQoo10Json(
      QOO10_URLS.editGoodsOption,
      certKey,
      { returnType: 'json', ItemCode: itemCode, SellerCode: '', AdditionalOption: body.AdditionalOption },
      'GIOSISCertificationKey',
    );
    if (!ok) return reply.status(502).send({ error: `Qoo10 서버 오류: HTTP ${status}` });
    if (!isRecord(data)) return reply.status(502).send({ error: 'Qoo10 응답 형식 오류' });

    const rc = getNumericResultCode(data);
    const msg = typeof data.ResultMsg === 'string' ? data.ResultMsg : String(data.ResultMsg ?? '');
    if (rc !== 0) return reply.status(400).send({ error: `Qoo10 오류 (${rc}): ${msg}` });
    return reply.send({ success: true });
  });

  // ─── 거래상태 변경 (EditGoodsStatus) ──────────────────────────────────────

  app.post('/qoo10/items/edit-status', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { ItemCode?: string; Status?: string };

    if (!body.ItemCode?.trim() || !['1', '2', '3'].includes(body.Status ?? '')) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'ItemCode와 Status(1|2|3)가 필요합니다.' });
    }

    const form = new URLSearchParams();
    form.set('returnType', 'json');
    form.set('ItemCode', body.ItemCode.trim());
    form.set('Status', body.Status!);

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.editGoodsStatus, certKey, form, { QAPIVersion: '1.1' });
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });
    if (!isRecord(data)) return reply.status(502).send({ error: 'INVALID_SHAPE' });

    const rc = getNumericResultCode(data);
    const msg = typeof data.ResultMsg === 'string' ? data.ResultMsg : '';
    if (rc !== 0) return reply.status(400).send({ error: 'API_ERROR', code: rc, message: msg || '거래상태 변경에 실패했습니다.' });
    return reply.send(data);
  });

  // ─── 상품 설명 수정 (EditGoodsContents) ───────────────────────────────────

  app.post('/qoo10/items/edit-contents', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { ItemCode?: string; SellerCode?: string; Contents?: string };

    if (!body.ItemCode?.trim() || !body.Contents?.trim()) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'ItemCode, Contents는 필수입니다.' });
    }

    const form = new URLSearchParams();
    form.set('returnType', 'json');
    form.set('ItemCode', body.ItemCode.trim());
    form.set('Contents', body.Contents);
    if (body.SellerCode?.trim()) form.set('SellerCode', body.SellerCode.trim());

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.editGoodsContents, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });
    if (!isRecord(data)) return reply.status(502).send({ error: 'INVALID_SHAPE' });

    const rc = typeof data.ResultCode === 'number' ? data.ResultCode : null;
    const msg = typeof data.ResultMsg === 'string' ? data.ResultMsg : '';
    if (rc === null || rc !== 0) return reply.status(400).send({ error: 'API_ERROR', code: rc, message: msg || '상품 상세 내용 수정에 실패했습니다.' });
    return reply.send(data);
  });

  // ─── 대표 이미지 수정 (EditGoodsImage) ────────────────────────────────────

  app.post('/qoo10/items/edit-image', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { ItemCode?: string; SellerCode?: string; StandardImage?: string; VideoURL?: string };

    if (!body.ItemCode?.trim() || !body.StandardImage?.trim()) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'ItemCode, StandardImage는 필수입니다.' });
    }

    const form = new URLSearchParams();
    form.set('returnType', 'json');
    form.set('ItemCode', body.ItemCode.trim());
    form.set('StandardImage', body.StandardImage.trim());
    if (body.SellerCode?.trim()) form.set('SellerCode', body.SellerCode.trim());
    if (body.VideoURL?.trim()) form.set('VideoURL', body.VideoURL.trim());

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.editGoodsImage, certKey, form, { QAPIVersion: '1.1' });
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });
    if (!isRecord(data)) return reply.status(502).send({ error: 'INVALID_SHAPE' });

    const rc = typeof data.ResultCode === 'number' ? data.ResultCode : null;
    const msg = typeof data.ResultMsg === 'string' ? data.ResultMsg : '';
    if (rc === null || rc !== 0) return reply.status(400).send({ error: 'API_ERROR', code: rc, message: msg || '대표 이미지 수정에 실패했습니다.' });
    return reply.send(data);
  });

  // ─── 상품 기본정보 수정 (UpdateGoods) ─────────────────────────────────────

  app.post('/qoo10/items/update', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as Record<string, string | undefined>;

    const required = ['ItemCode', 'SecondSubCat', 'ItemTitle', 'ProductionPlaceType', 'AdultYN', 'AvailableDateType', 'AvailableDateValue'];
    for (const key of required) {
      if (!body[key]?.trim()) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', message: `${key}가 필요합니다.` });
      }
    }

    const form = new URLSearchParams();
    form.set('returnType', 'json');
    for (const key of required) form.set(key, body[key]!.trim());

    const optionals = ['Drugtype', 'PromotionName', 'SellerCode', 'IndustrialCodeType', 'IndustrialCode', 'BrandNo', 'ManufactureDate', 'ModelNm', 'Material', 'ProductionPlace', 'RetailPrice', 'ContactInfo', 'ShippingNo', 'OptionShippingNo1', 'OptionShippingNo2', 'Weight', 'DesiredShippingDate', 'Keyword', 'ItemQty'];
    for (const key of optionals) {
      const v = body[key];
      if (v?.trim()) form.set(key, v.trim());
    }

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.updateGoods, certKey, form, { QAPIVersion: '1.1' });
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });
    if (!isRecord(data)) return reply.status(502).send({ error: 'INVALID_SHAPE' });

    if (typeof data.ResultCode === 'number' && data.ResultCode !== 0) {
      return reply.status(400).send({ error: 'API_ERROR', code: data.ResultCode, message: data.ResultMsg || 'Qoo10 상품 수정에 실패했습니다.' });
    }
    return reply.send(data);
  });

  // ─── 가격/수량 수정 (SetGoodsPriceQty) ────────────────────────────────────

  app.post('/qoo10/items/price-qty', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { itemCode?: string; sellerCode?: string; itemPrice?: number; itemQty?: number; taxRate?: string; expireDate?: string };

    if (!body.itemCode || typeof body.itemQty !== 'number') {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'itemCode, itemQty가 필요합니다.' });
    }

    // itemPrice가 없거나 0이면 현재 가격을 상품 상세에서 조회
    let resolvedPrice = body.itemPrice ?? 0;
    if (!resolvedPrice) {
      const detailForm = new URLSearchParams();
      detailForm.set('returnType', 'json');
      detailForm.set('ItemCode', body.itemCode);
      if (body.sellerCode?.trim()) detailForm.set('SellerCode', body.sellerCode.trim());
      const detailRes = await callQoo10Form(QOO10_URLS.getItemDetail, certKey, detailForm, { QAPIVersion: '1.2' });
      if (detailRes.ok && isRecord(detailRes.data)) {
        const raw = detailRes.data as { ResultObject?: Array<{ ItemPrice?: string }> };
        const itemPrice = raw.ResultObject?.[0]?.ItemPrice;
        if (itemPrice) resolvedPrice = parseFloat(itemPrice) || 0;
      }
      if (!resolvedPrice) {
        return reply.status(400).send({ error: 'INVALID_REQUEST', message: '상품 가격을 확인할 수 없습니다.' });
      }
    }

    const form = new URLSearchParams();
    form.set('ItemCode', body.itemCode);
    form.set('Price', String(resolvedPrice));
    form.set('Qty', String(body.itemQty));
    form.set('returnType', 'json');
    if (body.sellerCode) form.set('SellerCode', body.sellerCode);
    if (body.taxRate) form.set('TaxRate', body.taxRate);
    if (body.expireDate) form.set('ExpireDate', body.expireDate);

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.setGoodsPriceQty, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });

    const d = data as { ResultCode: number; ResultMsg: string };
    if (d.ResultCode !== 0) return reply.status(400).send({ error: 'API_ERROR', code: d.ResultCode, message: d.ResultMsg });
    return reply.send({ ok: true });
  });

  // ─── 재고 배치 조회 (inventory-meta-batch) ─────────────────────────────────

  app.post('/qoo10/items/inventory-meta-batch', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { items?: Array<{ itemCode: string; sellerCode: string }> };

    if (!Array.isArray(body.items)) {
      return reply.status(400).send({ error: 'INVALID_REQUEST' });
    }

    const items = body.items;

    const inventoryResults = await Promise.allSettled(
      items.map(async (item) => {
        const res = await callQoo10Json(
          QOO10_URLS.getGoodsInventory, certKey,
          { returnType: 'json', ItemCode: item.itemCode, SellerCode: item.sellerCode.trim() },
        );
        if (!res.ok || !isRecord(res.data)) return 'none' as const;
        const rc = getNumericResultCode(res.data);
        if (rc !== 0) return 'none' as const;
        const rows = normalizeInventoryRows(res.data.ResultObject);
        return rows.length > 0 ? 'combo' as const : 'none' as const;
      }),
    );

    const needsDetail: number[] = [];
    inventoryResults.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value === 'none') needsDetail.push(idx);
    });

    const detailResults = await Promise.allSettled(
      needsDetail.map(async (idx) => {
        const item = items[idx];
        const form = new URLSearchParams({ returnType: 'json', ItemCode: item.itemCode });
        if (item.sellerCode.trim()) form.set('SellerCode', item.sellerCode.trim());
        const res = await callQoo10Form(QOO10_URLS.getItemDetail, certKey, form, { QAPIVersion: '1.1' });
        if (!res.ok || !isRecord(res.data)) return null;
        const rc = getNumericResultCode(res.data);
        if (rc !== 0) return null;
        const raw = res.data as { ResultObject?: Array<{ ItemQty?: number | string; ItemTitle?: string }> };
        const first = raw.ResultObject?.[0];
        if (!first) return null;
        return {
          qty: typeof first.ItemQty === 'number' ? first.ItemQty : Number(first.ItemQty ?? 0),
          title: typeof first.ItemTitle === 'string' ? first.ItemTitle : '',
        };
      }),
    );

    const results: Record<string, unknown> = {};
    inventoryResults.forEach((r, idx) => {
      const itemCode = items[idx].itemCode;
      if (r.status === 'rejected') { results[itemCode] = { optionType: 'none' }; return; }
      if (r.value === 'combo') results[itemCode] = { optionType: 'combo' };
    });

    detailResults.forEach((r, i) => {
      const idx = needsDetail[i];
      const itemCode = items[idx].itemCode;
      if (r.status === 'fulfilled' && r.value) {
        results[itemCode] = { optionType: 'simple', qty: r.value.qty, title: r.value.title };
      } else {
        results[itemCode] = { optionType: 'simple', qty: 0, title: '' };
      }
    });

    return reply.send({ results });
  });

  // ─── 상품 목록/등록 (GetAllGoodsInfo / SetNewGoods) ───────────────────────

  app.post('/qoo10/products', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as unknown;

    // 등록
    if (isQoo10RegisterProductParams(body)) {
      const form = new URLSearchParams();
      form.set('SecondSubCat', String(body.SecondSubCat));
      form.set('ItemTitle', String(body.ItemTitle));
      form.set('ItemPrice', String(body.ItemPrice));
      form.set('ItemQty', String(body.ItemQty));
      form.set('AvailableDateType', String(body.AvailableDateType));
      form.set('AvailableDateValue', String(body.AvailableDateValue));
      form.set('returnType', 'json');

      const optFields = ['OuterSecondSubCat', 'Drugtype', 'BrandNo', 'PromotionName', 'SellerCode', 'IndustrialCodeType', 'IndustrialCode', 'ModelNM', 'ManufactureDate', 'ProductionPlaceType', 'ProductionPlace', 'Weight', 'Material', 'AdultYN', 'ContactInfo', 'StandardImage', 'VideoURL', 'ItemDescription', 'AdditionalOption', 'ItemType', 'RetailPrice', 'TaxRate', 'ExpireDate', 'ShippingNo', 'Keyword'];
      for (const f of optFields) {
        const v = body[f];
        if (v !== undefined && v !== null && String(v).trim() !== '') form.set(f, String(v));
      }

      const { ok, status, data } = await callQoo10Form(QOO10_URLS.setNewGoods, certKey, form, { QAPIVersion: '1.1' });
      if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });
      if (!isRecord(data)) return reply.status(502).send({ error: 'INVALID_SHAPE' });

      const rc = typeof data.ResultCode === 'number' ? data.ResultCode : null;
      if (rc === null || rc !== 0) return reply.status(400).send({ error: 'API_ERROR', code: rc, message: data.ResultMsg ?? '상품 등록에 실패했습니다.' });
      return reply.send(data);
    }

    // 전체 상태 병합 조회
    if (!isRecord(body)) {
      return reply.status(400).send({ error: 'INVALID_REQUEST' });
    }
    if (body.mergeAll === true) {
      const pageStr = typeof body.Page === 'string' && body.Page.trim() ? body.Page.trim() : '1';
      const safePresentPage = Math.max(1, Math.trunc(Number(pageStr)) || 1);

      try {
        const mergedItems: unknown[] = [];
        let totalItemsSum = 0;
        let maxTotalPages = 0;
        const statusTotals: Record<string, number> = {};

        const results = await Promise.allSettled(
          QOO10_GET_ALL_GOODS_ITEM_STATUSES.map((st) => fetchProductList(certKey, st, pageStr)),
        );

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const st = QOO10_GET_ALL_GOODS_ITEM_STATUSES[i];
          if (r.status === 'fulfilled') {
            mergedItems.push(...r.value.Items);
            statusTotals[st] = r.value.TotalItems;
            totalItemsSum += r.value.TotalItems;
            if (r.value.TotalPages > maxTotalPages) maxTotalPages = r.value.TotalPages;
          } else if (r.reason instanceof Qoo10AuthError) {
            throw r.reason;
          }
        }

        return reply.send({
          ResultCode: 0,
          ResultMsg: 'SUCCESS',
          ResultObject: {
            TotalItems: totalItemsSum,
            TotalPages: maxTotalPages > 0 ? maxTotalPages : 1,
            PresentPage: safePresentPage,
            Items: mergedItems,
            statusTotals,
          },
        });
      } catch (err) {
        if (err instanceof Qoo10AuthError) {
          return reply.status(400).send({ error: 'API_ERROR', code: err.resultCode, message: err.message });
        }
        const errMsg = err instanceof Error ? err.message : String(err);
        app.log.error({ err }, 'fetchProductList (mergeAll) failed');
        return reply.status(400).send({ error: 'API_ERROR', message: errMsg });
      }
    }

    // 단일 상태 조회
    if (typeof body.ItemStatus !== 'string' || typeof body.Page !== 'string') {
      return reply.status(400).send({ error: 'INVALID_REQUEST' });
    }

    try {
      const resultObject = await fetchProductList(certKey, body.ItemStatus, body.Page);
      return reply.send({ ResultCode: 0, ResultMsg: 'SUCCESS', ResultObject: resultObject });
    } catch (err) {
      if (err instanceof Qoo10AuthError) {
        return reply.status(400).send({ error: 'API_ERROR', code: err.resultCode, message: err.message });
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      app.log.error({ err }, 'fetchProductList failed');
      return reply.status(400).send({ error: 'API_ERROR', message: errMsg });
    }
  });

  // ─── 카테고리 목록 (GetCatagoryListAll) ───────────────────────────────────

  app.get('/qoo10/categories', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const { lang = 'ja' } = req.query as { lang?: string };

    const form = new URLSearchParams();
    form.set('returnType', 'json');
    form.set('lang_cd', lang);

    const res = await fetch(QOO10_URLS.getCategoryList, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        GiosisCertificationKey: certKey,
        QAPIVersion: '1.0',
        Accept: 'application/json',
      },
      body: form.toString(),
    });

    if (!res.ok) return reply.status(502).send({ error: 'API_ERROR', code: res.status });
    let data: unknown;
    try { data = await res.json(); } catch { return reply.status(502).send({ error: 'INVALID_RESPONSE', message: 'Qoo10 응답을 파싱할 수 없습니다.' }); }
    void reply.header('Cache-Control', 'public, max-age=3600');
    return reply.send(data);
  });

  // ─── 브랜드 검색 (SearchBrand) ────────────────────────────────────────────

  app.get('/qoo10/brands', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const { keyword = '' } = req.query as { keyword?: string };

    if (!keyword.trim()) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: '검색어(keyword)가 필요합니다.' });
    }

    const form = new URLSearchParams();
    form.set('returnType', 'json');
    form.set('keyword', keyword);

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.searchBrand, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });
    return reply.send(data);
  });

  // ─── 배송 그룹 목록 (ItemsLookup.GetSellerDeliveryGroupInfo) ────────────

  app.get('/qoo10/shipping-templates', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);

    const form = new URLSearchParams();
    form.set('returnType', 'json');

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.getShippingTemplates, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });
    void reply.header('Cache-Control', 'private, max-age=300');
    return reply.send(data);
  });

  // ─── 상품 문의 (CSCenter.GetInquiryMessage) ──────────────────────────────

  app.get('/qoo10/inquiry', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const { startDt, endDt, procStatus } = req.query as { startDt?: string; endDt?: string; procStatus?: string };

    if (!startDt || !endDt) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'startDt(조회시작일자), endDt(조회종료일자)가 필요합니다.' });
    }

    const form = new URLSearchParams();
    form.set('search_start_dt', startDt);
    form.set('search_end_dt', endDt);
    form.set('returnType', 'json');
    if (procStatus) form.set('proc_status', procStatus);

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.getQnaList, certKey, form);
    if (!ok || !isRecord(data)) {
      const msg = typeof data === 'string' ? data : `HTTP ${status}`;
      return reply.status(502).send({ error: 'API_ERROR', message: msg });
    }

    const rc = getNumericResultCode(data);
    const msg = typeof data.ResultMsg === 'string' ? data.ResultMsg : 'UNKNOWN';
    if (rc === null || rc !== 0) return reply.status(400).send({ error: 'API_ERROR', code: rc, message: msg });

    return reply.send({
      items: Array.isArray(data.ResultObject) ? data.ResultObject : [],
    });
  });

  // ─── 문의 답변 (CSCenter.SetInquiryMessage) ──────────────────────────────

  app.post('/qoo10/inquiry/reply', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const certKey = await getCertKey(req.user?.userId);
    const body = req.body as { inqType?: string; questionNo?: string; seqNo?: string; contents?: string };

    if (!body.inqType || !body.questionNo || !body.seqNo) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: 'inqType, questionNo, seqNo가 필요합니다.' });
    }

    const form = new URLSearchParams();
    form.set('inq_type', body.inqType);
    form.set('question_no', body.questionNo);
    form.set('seq_no', body.seqNo);
    form.set('returnType', 'json');
    if (body.contents) form.set('contents', body.contents);

    const { ok, status, data } = await callQoo10Form(QOO10_URLS.setQnaAnswer, certKey, form);
    if (!ok) return reply.status(502).send({ error: 'API_ERROR', code: status });

    const d = data as { ResultCode: number; ResultMsg: string };
    if (d.ResultCode !== 0) return reply.status(400).send({ error: 'API_ERROR', code: d.ResultCode, message: d.ResultMsg });
    return reply.send({ ok: true });
  });
}

// ─── Product List Helpers (used inside qoo10Routes closure) ──────────────────

class Qoo10AuthError extends Error {
  readonly resultCode: number;
  constructor(resultCode: number, message: string) {
    super(message);
    this.name = 'Qoo10AuthError';
    this.resultCode = resultCode;
  }
}

const QOO10_AUTH_CODES = new Set([10003, 10005, 10006, 10007, 10010, 10011]);

interface ProductListResult {
  TotalItems: number;
  TotalPages: number;
  PresentPage: number;
  Items: unknown[];
}

async function fetchProductList(
  certKey: string,
  itemStatus: string,
  page: string,
): Promise<ProductListResult> {
  const safePresentPage = Math.max(1, Math.trunc(Number(page)) || 1);

  const form = new URLSearchParams({
    ItemStatus: itemStatus,
    Page: String(safePresentPage),
    returnType: 'json',
  });
  const { ok, status: httpStatus, data } = await callQoo10Form(
    QOO10_URLS.getAllGoodsInfo,
    certKey,
    form,
  );

  if (!ok) throw new Error(`QOO10_HTTP_${httpStatus}`);
  if (!isRecord(data)) throw new Error('INVALID_QOO10_JSON');

  const rc = getNumericResultCode(data);
  const msg = typeof data.ResultMsg === 'string' ? data.ResultMsg : 'UNKNOWN';

  if (rc === null) throw new Error('INVALID_QOO10_RESULT_CODE');
  if (rc !== 0) {
    if (QOO10_AUTH_CODES.has(rc)) throw new Qoo10AuthError(rc, msg);
    return { TotalItems: 0, TotalPages: 0, PresentPage: safePresentPage, Items: [] };
  }

  const obj = data.ResultObject;
  if (!isRecord(obj)) return { TotalItems: 0, TotalPages: 0, PresentPage: safePresentPage, Items: [] };

  const rawItems = obj.Items;
  const items = Array.isArray(rawItems) ? rawItems : [];
  const totalItems = typeof obj.TotalItems === 'number' ? obj.TotalItems : items.length;
  const totalPages = typeof obj.TotalPages === 'number' ? obj.TotalPages : (totalItems > 0 ? 1 : 0);
  const presentPage = typeof obj.PresentPage === 'number' ? obj.PresentPage : safePresentPage;

  return { TotalItems: totalItems, TotalPages: totalPages, PresentPage: presentPage, Items: items };
}

function isQoo10RegisterProductParams(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const availableTypes = ['0', '1', '2', '3'];
  return (
    typeof value.SecondSubCat === 'string' &&
    typeof value.ItemTitle === 'string' &&
    typeof value.ItemPrice === 'number' &&
    typeof value.ItemQty === 'number' &&
    typeof value.AvailableDateValue === 'string' &&
    typeof value.AvailableDateType === 'string' &&
    availableTypes.includes(value.AvailableDateType)
  );
}

interface SimpleOptionItem {
  Name: string;
  Value: string;
  Price: number;
  OptionCode: string;
}

function normalizeSimpleOptions(value: unknown): SimpleOptionItem[] {
  if (!Array.isArray(value)) return [];
  const rows: SimpleOptionItem[] = [];
  for (const row of value) {
    if (!isRecord(row)) continue;
    rows.push({
      Name: readTextField(row, 'Name'),
      Value: readTextField(row, 'Value'),
      Price: readDecimalField(row, 'Price'),
      OptionCode: readTextField(row, 'OptionCode'),
    });
  }
  return rows;
}
