export interface Qoo10ApiKeys {
  certificationKey: string;
  sellerId?: string;
}

export interface RakutenApiKeys {
  serviceSecret: string;
  licenseKey: string;
  shopUrl: string;
}

export interface ShopeeApiKeys {
  partnerId: string;
  partnerKey: string;
  shopId: string;
  accessToken: string;
  refreshToken: string;
  expireAt: number;
}

export interface ShopifyApiKeys {
  shopDomain: string;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expireAt: number;
}

export type ChannelApiKeys = {
  qoo10?: Qoo10ApiKeys;
  rakuten?: RakutenApiKeys;
  shopee?: ShopeeApiKeys;
  shopify?: ShopifyApiKeys;
};
