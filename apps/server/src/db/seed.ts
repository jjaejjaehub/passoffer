/**
 * 실행 방법:
 *   CERT_KEY="실제qoo10인증키" tsx src/db/seed.ts
 *
 * 사전 조건:
 *   - apps/server/.env 파일에 DATABASE_URL, ENCRYPTION_SECRET 설정
 *   - pnpm drizzle-kit migrate 실행 완료
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { channels, channelCredentials } from './schema';
import { createCipheriv, randomBytes } from 'node:crypto';

const certKey = process.env.CERT_KEY ?? '';
if (!certKey) {
  console.error('CERT_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const encryptionSecret = process.env.ENCRYPTION_SECRET ?? '';
if (encryptionSecret.length < 32) {
  console.error('ENCRYPTION_SECRET 환경변수가 32자 이상이어야 합니다.');
  process.exit(1);
}

function encrypt(plainText: string, secret: string): string {
  const key = Buffer.from(secret, 'utf8').subarray(0, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // 1. Qoo10 JP 채널 INSERT
    const [channel] = await db
      .insert(channels)
      .values({
        channelType: 'QOO10_JP',
        name: 'Qoo10 JP',
        adapterVersion: '1.0.0',
        status: 'PENDING',
      })
      .returning();

    if (!channel) throw new Error('채널 생성 실패');
    console.log(`✓ 채널 생성: ${channel.id}`);

    // 2. 인증키 암호화 저장
    await db.insert(channelCredentials).values({
      channelId: channel.id,
      credentialType: 'API_KEY',
      encryptedValue: encrypt(certKey, encryptionSecret),
    });
    console.log('✓ 인증키 저장 완료');

    // 3. 인증키 검증 (OMS 서버 via fetch)
    const serverUrl = process.env.OMS_SERVER_URL ?? 'http://localhost:4000';
    try {
      const res = await fetch(`${serverUrl}/api/channels/${channel.id}/validate`, {
        method: 'POST',
      });
      const result = (await res.json()) as { valid: boolean };
      if (result.valid) {
        console.log('✓ 인증키 검증 성공 → ACTIVE');
      } else {
        console.warn('⚠ 인증키 검증 실패 (서버가 실행 중인지 확인하세요)');
      }
    } catch {
      console.warn('⚠ OMS 서버 검증 스킵 (서버 미실행)');
    }

    console.log('');
    console.log('=== 채널 등록 완료 ===');
    console.log(`Channel ID: ${channel.id}`);
    console.log('이 ID를 apps/web .env.local의 NEXT_PUBLIC_QOO10_CHANNEL_ID에 설정하세요.');
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed 실패:', err);
  process.exit(1);
});
