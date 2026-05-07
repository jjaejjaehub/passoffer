/**
 * 더미 마스터 상품 1개 생성
 *   - 색상(블랙/화이트/네이비) × 사이즈(S/M/L/XL) = 12 variants
 *
 * 사용:
 *   bun run apps/server/scripts/seed-dummy-product.ts
 */
const baseUrl = process.env.API_BASE ?? 'http://localhost:4000';
const email = process.env.SEED_EMAIL ?? 'roundtrip@test.local';
const password = process.env.SEED_PASSWORD ?? 'roundtrip-pass-1234';

let token = '';

async function rawPost(path: string, body: unknown, auth = true): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

async function loginOrSignup(): Promise<void> {
  let res = await rawPost('/api/auth/login', { email, password }, false);
  if (res.status === 401) {
    res = await rawPost('/api/auth/signup', { email, password, name: 'seed' }, false);
  }
  if (!res.ok) throw new Error(`auth 실패 (${res.status}): ${await res.text()}`);
  token = ((await res.json()) as { token: string }).token;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${path}`, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${method} ${path}] ${res.status}: ${text}`);
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

await loginOrSignup();
console.log('✓ 로그인:', email);

const code = `DUMMY-${Date.now()}`;
const master = await call<{ id: string; code: string }>('POST', '/api/master-products', {
  code,
  title: '테스트 티셔츠 (더미)',
  brand: 'DUMMY BRAND',
  retailPrice: '29000',
  tags: ['더미', '테스트'],
});
console.log('✓ 마스터 상품 생성:', master.code, '/', master.id);

const colors = ['블랙', '화이트', '네이비'];
const sizes = ['S', 'M', 'L', 'XL'];

await call('PUT', `/api/master-products/${master.id}/option-groups`, {
  groups: [
    { name: '색상', values: colors },
    { name: '사이즈', values: sizes },
  ],
});
console.log('✓ 옵션 그룹 등록: 색상×사이즈');

let stockSeed = 10;
for (const color of colors) {
  for (const size of sizes) {
    const sku = `${code}-${color}-${size}`;
    await call('POST', `/api/master-products/${master.id}/variants`, {
      sku,
      stock: stockSeed,
      optionValues: [
        { groupName: '색상', value: color },
        { groupName: '사이즈', value: size },
      ],
    });
    process.stdout.write(`  variant ${sku} (stock ${stockSeed})\n`);
    stockSeed += 3;
  }
}

console.log(`\n✓ 완료 — 마스터 상품 ID: ${master.id}`);
