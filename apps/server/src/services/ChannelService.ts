import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { channels, channelCredentials } from '../db/schema';
import type { ChannelType, IChannelAdapter } from '@oms/types';

const ALGORITHM = 'aes-256-gcm';

export class ChannelService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly userId?: string,
  ) {}

  // ─── 암호화 ───────────────────────────────────────────────────

  encrypt(plainText: string): string {
    const key = Buffer.from(this.app.config.ENCRYPTION_SECRET, 'utf8').subarray(0, 32);
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    // iv:authTag:encrypted (hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(cipherText: string): string {
    const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid ciphertext format');
    }
    const key = Buffer.from(this.app.config.ENCRYPTION_SECRET, 'utf8').subarray(0, 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(Buffer.from(encryptedHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
  }

  // ─── 채널 조회 ────────────────────────────────────────────────

  async getChannel(channelId: string) {
    const condition = this.userId
      ? and(eq(channels.id, channelId), eq(channels.userId, this.userId))
      : eq(channels.id, channelId);
    const [channel] = await this.app.db
      .select()
      .from(channels)
      .where(condition)
      .limit(1);
    return channel ?? null;
  }

  async listChannels() {
    if (this.userId) {
      return this.app.db.select().from(channels).where(eq(channels.userId, this.userId));
    }
    return this.app.db.select().from(channels);
  }

  // ─── 채널 생성 ────────────────────────────────────────────────

  async createChannel(data: {
    channelType: ChannelType;
    name: string;
    adapterVersion?: string;
    certKey: string;
    sellerId?: string;
  }) {
    const [channel] = await this.app.db
      .insert(channels)
      .values({
        userId: this.userId ?? null,
        channelType: data.channelType,
        name: data.name,
        adapterVersion: data.adapterVersion ?? '1.0.0',
      })
      .returning();

    if (!channel) throw new Error('Failed to create channel');

    const credJson = JSON.stringify({ certificationKey: data.certKey, sellerId: data.sellerId ?? '' });
    await this.app.db.insert(channelCredentials).values({
      channelId: channel.id,
      credentialType: 'API_KEY',
      encryptedValue: this.encrypt(credJson),
    });

    return channel;
  }

  // ─── Qoo10 전용 upsert ────────────────────────────────────────

  async upsertQoo10(certKey: string, sellerId: string): Promise<void> {
    const existing = await this.findChannelByType('QOO10_JP');

    if (!existing) {
      await this.createChannel({
        channelType: 'QOO10_JP',
        name: 'Qoo10 Japan',
        certKey,
        sellerId,
      });
      return;
    }

    // 채널은 있으므로 인증키만 갱신
    const credJson = JSON.stringify({ certificationKey: certKey, sellerId });
    const [existingCred] = await this.app.db
      .select()
      .from(channelCredentials)
      .where(eq(channelCredentials.channelId, existing.id))
      .limit(1);

    if (existingCred) {
      await this.app.db
        .update(channelCredentials)
        .set({ encryptedValue: this.encrypt(credJson), updatedAt: new Date() })
        .where(eq(channelCredentials.channelId, existing.id));
    } else {
      await this.app.db.insert(channelCredentials).values({
        channelId: existing.id,
        credentialType: 'API_KEY',
        encryptedValue: this.encrypt(credJson),
      });
    }

    await this.app.db
      .update(channels)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(channels.id, existing.id));
  }

  async findChannelByType(channelType: ChannelType) {
    const condition = this.userId
      ? and(eq(channels.channelType, channelType), eq(channels.userId, this.userId))
      : eq(channels.channelType, channelType);
    const [channel] = await this.app.db
      .select()
      .from(channels)
      .where(condition)
      .limit(1);
    return channel ?? null;
  }

  // channels + channelCredentials를 JOIN한 단일 쿼리로 암호화된 값을 반환한다.
  // 2회 SELECT → 1회 SELECT로 DB 왕복 절감
  private async findCredentialByChannelType(channelType: ChannelType): Promise<{
    channelId: string;
    status: string;
    encryptedValue: string;
  } | null> {
    const condition = this.userId
      ? and(eq(channels.channelType, channelType), eq(channels.userId, this.userId))
      : eq(channels.channelType, channelType);
    const [row] = await this.app.db
      .select({
        channelId: channels.id,
        status: channels.status,
        encryptedValue: channelCredentials.encryptedValue,
      })
      .from(channels)
      .innerJoin(channelCredentials, eq(channelCredentials.channelId, channels.id))
      .where(condition)
      .limit(1);
    return row ?? null;
  }

  // ─── Shopee 전용 upsert ───────────────────────────────────────────

  async upsertShopee(opts: {
    partnerId: string;
    partnerKey: string;
    shopId: string;
    accessToken?: string;
    refreshToken?: string;
    expireIn?: number;
  }): Promise<void> {
    const existing = await this.findChannelByType('SHOPEE');

    const credJson = JSON.stringify({
      partnerId: opts.partnerId,
      partnerKey: opts.partnerKey,
      shopId: opts.shopId,
      accessToken: opts.accessToken ?? '',
      refreshToken: opts.refreshToken ?? '',
      expireIn: opts.expireIn ?? 0,
    });

    if (!existing) {
      const [channel] = await this.app.db
        .insert(channels)
        .values({ userId: this.userId ?? null, channelType: 'SHOPEE', name: 'Shopee', adapterVersion: '1.0.0' })
        .returning();
      if (!channel) throw new Error('Failed to create Shopee channel');

      await this.app.db.insert(channelCredentials).values({
        channelId: channel.id,
        credentialType: 'API_KEY',
        encryptedValue: this.encrypt(credJson),
      });
      return;
    }

    const [existingCred] = await this.app.db
      .select()
      .from(channelCredentials)
      .where(eq(channelCredentials.channelId, existing.id))
      .limit(1);

    if (existingCred) {
      await this.app.db
        .update(channelCredentials)
        .set({ encryptedValue: this.encrypt(credJson), updatedAt: new Date() })
        .where(eq(channelCredentials.channelId, existing.id));
    } else {
      await this.app.db.insert(channelCredentials).values({
        channelId: existing.id,
        credentialType: 'API_KEY',
        encryptedValue: this.encrypt(credJson),
      });
    }

    await this.app.db
      .update(channels)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(channels.id, existing.id));
  }

  async getShopeeCredential(): Promise<{
    channelId: string;
    status: string;
    partnerId: string;
    partnerKey: string;
    shopId: string;
    accessToken: string;
    refreshToken: string;
    expireIn: number;
  } | null> {
    const row = await this.findCredentialByChannelType('SHOPEE');
    if (!row) return null;

    const decrypted = this.decrypt(row.encryptedValue);
    try {
      const parsed = JSON.parse(decrypted) as {
        partnerId?: string;
        partnerKey?: string;
        shopId?: string;
        accessToken?: string;
        refreshToken?: string;
        expireIn?: number;
      };
      return {
        channelId: row.channelId,
        status: row.status,
        partnerId: parsed.partnerId ?? '',
        partnerKey: parsed.partnerKey ?? '',
        shopId: parsed.shopId ?? '',
        accessToken: parsed.accessToken ?? '',
        refreshToken: parsed.refreshToken ?? '',
        expireIn: parsed.expireIn ?? 0,
      };
    } catch {
      return null;
    }
  }

  async getQoo10Credential(): Promise<{ channelId: string; status: string; certificationKey: string; sellerId: string } | null> {
    const row = await this.findCredentialByChannelType('QOO10_JP');
    if (!row) return null;

    const decrypted = this.decrypt(row.encryptedValue);
    let certificationKey = decrypted;
    let sellerId = '';

    try {
      const parsed = JSON.parse(decrypted) as { certificationKey?: string; sellerId?: string };
      certificationKey = parsed.certificationKey ?? decrypted;
      sellerId = parsed.sellerId ?? '';
    } catch {
      // 구버전 평문 certKey 그대로 사용
    }

    return { channelId: row.channelId, status: row.status, certificationKey, sellerId };
  }

  async deleteChannel(channelId: string): Promise<void> {
    const condition = this.userId
      ? and(eq(channels.id, channelId), eq(channels.userId, this.userId))
      : eq(channels.id, channelId);
    await this.app.db.delete(channels).where(condition);
  }

  // ─── 인증키 갱신 ──────────────────────────────────────────────

  async updateCredential(channelId: string, certKey: string) {
    if (this.userId) {
      const [owned] = await this.app.db
        .select({ id: channels.id })
        .from(channels)
        .where(and(eq(channels.id, channelId), eq(channels.userId, this.userId)))
        .limit(1);
      if (!owned) throw new Error('Channel not found or access denied');
    }

    const [existing] = await this.app.db
      .select()
      .from(channelCredentials)
      .where(eq(channelCredentials.channelId, channelId))
      .limit(1);

    if (existing) {
      await this.app.db
        .update(channelCredentials)
        .set({
          encryptedValue: this.encrypt(certKey),
          updatedAt: new Date(),
        })
        .where(eq(channelCredentials.channelId, channelId));
    } else {
      await this.app.db.insert(channelCredentials).values({
        channelId,
        credentialType: 'API_KEY',
        encryptedValue: this.encrypt(certKey),
      });
    }
  }

  // ─── 채널 활성화 ──────────────────────────────────────────────

  async activateChannel(channelId: string) {
    const condition = this.userId
      ? and(eq(channels.id, channelId), eq(channels.userId, this.userId))
      : eq(channels.id, channelId);
    await this.app.db
      .update(channels)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(condition);
  }

  // ─── Shopify 전용 upsert ─────────────────────────────────────

  async upsertShopify(opts: {
    shopDomain: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
    expireAt: number;
  }): Promise<void> {
    const existing = await this.findChannelByType('SHOPIFY');

    const credJson = JSON.stringify({
      shopDomain: opts.shopDomain,
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      accessToken: opts.accessToken,
      refreshToken: opts.refreshToken,
      expireAt: opts.expireAt,
    });

    if (!existing) {
      const [channel] = await this.app.db
        .insert(channels)
        .values({ userId: this.userId ?? null, channelType: 'SHOPIFY', name: 'Shopify', adapterVersion: '1.0.0' })
        .returning();
      if (!channel) throw new Error('Failed to create Shopify channel');

      await this.app.db.insert(channelCredentials).values({
        channelId: channel.id,
        credentialType: 'OAUTH',
        encryptedValue: this.encrypt(credJson),
        expiresAt: opts.expireAt ? new Date(opts.expireAt * 1000) : null,
      });
      return;
    }

    const [existingCred] = await this.app.db
      .select()
      .from(channelCredentials)
      .where(eq(channelCredentials.channelId, existing.id))
      .limit(1);

    if (existingCred) {
      await this.app.db
        .update(channelCredentials)
        .set({
          encryptedValue: this.encrypt(credJson),
          expiresAt: opts.expireAt ? new Date(opts.expireAt * 1000) : null,
          updatedAt: new Date(),
        })
        .where(eq(channelCredentials.channelId, existing.id));
    } else {
      await this.app.db.insert(channelCredentials).values({
        channelId: existing.id,
        credentialType: 'OAUTH',
        encryptedValue: this.encrypt(credJson),
        expiresAt: opts.expireAt ? new Date(opts.expireAt * 1000) : null,
      });
    }

    await this.app.db
      .update(channels)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(channels.id, existing.id));
  }

  async getShopifyCredential(): Promise<{
    channelId: string;
    status: string;
    shopDomain: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
    expireAt: number;
  } | null> {
    const row = await this.findCredentialByChannelType('SHOPIFY');
    if (!row) return null;

    const decrypted = this.decrypt(row.encryptedValue);
    try {
      const parsed = JSON.parse(decrypted) as {
        shopDomain?: string;
        clientId?: string;
        clientSecret?: string;
        accessToken?: string;
        refreshToken?: string;
        expireAt?: number;
      };
      return {
        channelId: row.channelId,
        status: row.status,
        shopDomain: parsed.shopDomain ?? '',
        clientId: parsed.clientId ?? '',
        clientSecret: parsed.clientSecret ?? '',
        accessToken: parsed.accessToken ?? '',
        refreshToken: parsed.refreshToken ?? '',
        expireAt: parsed.expireAt ?? 0,
      };
    } catch {
      return null;
    }
  }

  // ─── Rakuten 전용 upsert ─────────────────────────────────────

  async upsertRakuten(opts: {
    serviceSecret: string;
    licenseKey: string;
    shopUrl: string;
  }): Promise<void> {
    const existing = await this.findChannelByType('RAKUTEN');

    const credJson = JSON.stringify({
      serviceSecret: opts.serviceSecret,
      licenseKey: opts.licenseKey,
      shopUrl: opts.shopUrl,
    });

    if (!existing) {
      const [channel] = await this.app.db
        .insert(channels)
        .values({ userId: this.userId ?? null, channelType: 'RAKUTEN', name: 'Rakuten', adapterVersion: '1.0.0' })
        .returning();
      if (!channel) throw new Error('Failed to create Rakuten channel');

      await this.app.db.insert(channelCredentials).values({
        channelId: channel.id,
        credentialType: 'API_KEY',
        encryptedValue: this.encrypt(credJson),
      });
      return;
    }

    const [existingCred] = await this.app.db
      .select()
      .from(channelCredentials)
      .where(eq(channelCredentials.channelId, existing.id))
      .limit(1);

    if (existingCred) {
      await this.app.db
        .update(channelCredentials)
        .set({ encryptedValue: this.encrypt(credJson), updatedAt: new Date() })
        .where(eq(channelCredentials.channelId, existing.id));
    } else {
      await this.app.db.insert(channelCredentials).values({
        channelId: existing.id,
        credentialType: 'API_KEY',
        encryptedValue: this.encrypt(credJson),
      });
    }

    await this.app.db
      .update(channels)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(channels.id, existing.id));
  }

  async getRakutenCredential(): Promise<{
    channelId: string;
    status: string;
    serviceSecret: string;
    licenseKey: string;
    shopUrl: string;
  } | null> {
    const row = await this.findCredentialByChannelType('RAKUTEN');
    if (!row) return null;

    const decrypted = this.decrypt(row.encryptedValue);
    try {
      const parsed = JSON.parse(decrypted) as {
        serviceSecret?: string;
        licenseKey?: string;
        shopUrl?: string;
      };
      return {
        channelId: row.channelId,
        status: row.status,
        serviceSecret: parsed.serviceSecret ?? '',
        licenseKey: parsed.licenseKey ?? '',
        shopUrl: parsed.shopUrl ?? '',
      };
    } catch {
      return null;
    }
  }

  // ─── 어댑터 인스턴스 반환 ─────────────────────────────────────

  async getAdapter(channelId: string): Promise<IChannelAdapter> {
    const channel = await this.getChannel(channelId);
    if (!channel) throw new Error(`Channel not found: ${channelId}`);

    const [cred] = await this.app.db
      .select()
      .from(channelCredentials)
      .where(eq(channelCredentials.channelId, channelId))
      .limit(1);

    if (!cred) throw new Error(`No credentials for channel: ${channelId}`);

    const decrypted = this.decrypt(cred.encryptedValue);

    if (channel.channelType === 'QOO10_JP') {
      let certKey = decrypted;
      try {
        const parsed = JSON.parse(decrypted) as { certificationKey?: string };
        certKey = parsed.certificationKey ?? decrypted;
      } catch { /* 구버전 평문 */ }
      const { Qoo10Adapter } = await import('../adapters/qoo10/Qoo10Adapter');
      return new Qoo10Adapter(channelId, certKey);
    }

    if (channel.channelType === 'SHOPIFY') {
      const parsed = JSON.parse(decrypted) as {
        shopDomain?: string;
        accessToken?: string;
      };
      const { ShopifyAdapter } = await import('../adapters/shopify/ShopifyAdapter');
      return new ShopifyAdapter({
        shopDomain: parsed.shopDomain ?? '',
        accessToken: parsed.accessToken ?? '',
      });
    }

    if (channel.channelType === 'SHOPEE') {
      const parsed = JSON.parse(decrypted) as {
        partnerId?: string;
        partnerKey?: string;
        shopId?: string;
        accessToken?: string;
      };
      const { ShopeeAdapter } = await import('../adapters/shopee/ShopeeAdapter');
      return new ShopeeAdapter({
        channelId,
        partnerId: parsed.partnerId ?? '',
        partnerKey: parsed.partnerKey ?? '',
        shopId: parsed.shopId ?? '',
        accessToken: parsed.accessToken ?? '',
      });
    }

    if (channel.channelType === 'RAKUTEN') {
      const parsed = JSON.parse(decrypted) as {
        serviceSecret?: string;
        licenseKey?: string;
        shopUrl?: string;
      };
      const { RakutenAdapter } = await import('../adapters/rakuten/RakutenAdapter');
      return new RakutenAdapter({
        serviceSecret: parsed.serviceSecret ?? '',
        licenseKey: parsed.licenseKey ?? '',
      });
    }

    throw new Error(`Unsupported channel type: ${channel.channelType}`);
  }

  async checkHealth(channelId: string) {
    const adapter = await this.getAdapter(channelId);
    return adapter.testConnection();
  }
}
