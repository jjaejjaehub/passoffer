/**
 * Phase 1 다축 옵션 roundtrip 검증.
 *
 *   1) 테스트 계정 signup-or-login → JWT 확보
 *   2) 마스터 상품 생성
 *   3) 옵션 그룹(2축: 색상 × 사이즈) 일괄 등록
 *   4) cartesian variant 4개 등록 (red/S, red/M, blue/S, blue/M)
 *   5) 상세 조회 → optionGroups & variants[].options[] 형상 검증
 *   6) 정리(삭제)
 *
 *   사용:
 *     bun run apps/server/scripts/roundtrip-multi-axis.ts
 */
const baseUrl = process.env.API_BASE ?? 'http://localhost:4000';
const testEmail = process.env.ROUNDTRIP_EMAIL ?? 'roundtrip@test.local';
const testPassword = process.env.ROUNDTRIP_PASSWORD ?? 'roundtrip-pass-1234';

let token = '';

async function rawCall(method: string, path: string, body?: unknown, useAuth = true): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (useAuth) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function loginOrSignup(): Promise<void> {
  // 먼저 로그인 시도
  let res = await rawCall('POST', '/api/auth/login', { email: testEmail, password: testPassword }, false);
  if (res.status === 401) {
    // 없으면 signup
    res = await rawCall(
      'POST',
      '/api/auth/signup',
      { email: testEmail, password: testPassword, name: 'roundtrip' },
      false,
    );
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`auth 실패 (${res.status}): ${txt}`);
  }
  const json = (await res.json()) as { token: string };
  token = json.token;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[${method} ${path}] ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`);
}

interface OptionGroup {
  id: string;
  name: string;
  position: number;
  values: Array<{ id: string; value: string; position: number }>;
}
interface VariantOpt {
  groupName: string;
  value: string;
  groupPosition: number;
  valuePosition: number;
}
interface Variant {
  id: string;
  sku: string;
  stock: number;
  price?: string;
  options: VariantOpt[];
  optionLabel: string;
}
interface MasterDetail {
  id: string;
  code: string;
  optionGroups: OptionGroup[];
  variants: Variant[];
}

console.log('▶ auth as', testEmail);
await loginOrSignup();

const code = `RT-MULTI-${Date.now()}`;
console.log('▶ create master product:', code);

const created = await call<{ id: string; code: string }>('POST', '/api/master-products', {
  code,
  title: '다축 옵션 roundtrip 테스트',
  brand: 'TEST',
  retailPrice: '12000',
});
const masterId = created.id;
console.log('  ↳ id:', masterId);

try {
  console.log('▶ put option groups: 색상 × 사이즈');
  await call<OptionGroup[]>('PUT', `/api/master-products/${masterId}/option-groups`, {
    groups: [
      { name: '색상', values: ['red', 'blue'] },
      { name: '사이즈', values: ['S', 'M'] },
    ],
  });

  console.log('▶ post 4 variants (cartesian)');
  const cartesian = [
    { sku: `${code}-red-S`, color: 'red', size: 'S', stock: 11 },
    { sku: `${code}-red-M`, color: 'red', size: 'M', stock: 12 },
    { sku: `${code}-blue-S`, color: 'blue', size: 'S', stock: 21 },
    { sku: `${code}-blue-M`, color: 'blue', size: 'M', stock: 22 },
  ];
  for (const v of cartesian) {
    await call<Variant>('POST', `/api/master-products/${masterId}/variants`, {
      sku: v.sku,
      stock: v.stock,
      optionValues: [
        { groupName: '색상', value: v.color },
        { groupName: '사이즈', value: v.size },
      ],
    });
  }

  console.log('▶ get detail & assert');
  const detail = await call<MasterDetail>('GET', `/api/master-products/${masterId}`);

  // optionGroups 검증
  assert(detail.optionGroups.length === 2, `optionGroups 길이=2, got ${detail.optionGroups.length}`);
  const [g0, g1] = [...detail.optionGroups].sort((a, b) => a.position - b.position);
  assert(g0.name === '색상' && g1.name === '사이즈', `옵션 그룹 순서 mismatch: ${g0.name}, ${g1.name}`);
  assert(
    g0.values.map((v) => v.value).join(',') === 'red,blue',
    `색상 values mismatch: ${g0.values.map((v) => v.value).join(',')}`,
  );
  assert(
    g1.values.map((v) => v.value).join(',') === 'S,M',
    `사이즈 values mismatch: ${g1.values.map((v) => v.value).join(',')}`,
  );

  // variants 검증
  assert(detail.variants.length === 4, `variants 길이=4, got ${detail.variants.length}`);
  for (const v of detail.variants) {
    assert(v.options.length === 2, `${v.sku} 옵션 2개여야 함, got ${v.options.length}`);
    const byGroup: Record<string, string> = {};
    for (const o of v.options) byGroup[o.groupName] = o.value;
    assert(byGroup['색상'] !== undefined, `${v.sku} 색상 누락`);
    assert(byGroup['사이즈'] !== undefined, `${v.sku} 사이즈 누락`);
    assert(
      v.optionLabel.includes(byGroup['색상']!) && v.optionLabel.includes(byGroup['사이즈']!),
      `${v.sku} optionLabel 형상 이상: ${v.optionLabel}`,
    );
  }

  // SKU별 옵션 매칭 검증
  const bySku = new Map(detail.variants.map((v) => [v.sku, v]));
  for (const expected of cartesian) {
    const v = bySku.get(expected.sku);
    assert(v, `${expected.sku} 누락`);
    const map: Record<string, string> = {};
    for (const o of v.options) map[o.groupName] = o.value;
    assert(map['색상'] === expected.color, `${expected.sku} 색상=${expected.color}, got ${map['색상']}`);
    assert(map['사이즈'] === expected.size, `${expected.sku} 사이즈=${expected.size}, got ${map['사이즈']}`);
    assert(v.stock === expected.stock, `${expected.sku} stock=${expected.stock}, got ${v.stock}`);
  }

  console.log('✓ 다축 옵션 roundtrip 통과');
} finally {
  console.log('▶ cleanup: delete master product');
  await call<{ ok: true }>('DELETE', `/api/master-products/${masterId}`);
  console.log('  ↳ deleted');
}
