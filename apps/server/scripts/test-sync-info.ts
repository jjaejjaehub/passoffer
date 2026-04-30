import { createSigner } from 'fast-jwt';

const userId = process.argv[2] ?? '178a6913-3cbf-4290-b47b-ab866a92fe14';
const listedProductId = process.argv[3] ?? 'bdb485b7-1d77-4e1e-8c24-9db21bdd8160';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET not set');

const signer = createSigner({ key: secret, expiresIn: 7 * 24 * 60 * 60 * 1000 });
const token = signer({ userId, email: 'tech1@miraise.com', name: 'tester' });

const url = `http://localhost:4000/api/listed-products/${listedProductId}/sync-info`;
console.log('[POST]', url);

const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
const body = await res.text();
console.log('[status]', res.status);
console.log('[body]', body);
