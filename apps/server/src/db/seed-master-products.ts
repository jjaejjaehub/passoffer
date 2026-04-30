/**
 * 마스터 상품 샘플 데이터 시드
 *   cd apps/server && bunx tsx src/db/seed-master-products.ts
 *
 * Qoo10 필드 주의사항:
 *   - SecondSubCat: 실제 카테고리 코드는 Qoo10 GetCategoryListAll API로 조회 필요
 *   - BrandNo: 실제 브랜드 번호는 Qoo10 GetBrandList API로 조회 필요 (0=미지정)
 *   - ShippingNo: 실제 배송 템플릿 번호는 Qoo10 GetShippingInfo API로 조회 필요 (0=무료배송)
 *   - AvailableDateType=0 → AvailableDateValue=1~3 (영업일 수)
 *   - AvailableDateType=1 → AvailableDateValue=4~14 (준비일 수)
 *   - AvailableDateType=2 → AvailableDateValue=YYYY/MM/DD (출시일)
 *   - AvailableDateType=3 → AvailableDateValue=HH:MM (당일발송 마감)
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { masterProducts, masterProductVariants } from './schema';

const USER_ID = '178a6913-3cbf-4290-b47b-ab866a92fe14';

// 공통 Qoo10 기본값 (GetSellerDeliveryGroupInfo API로 확인된 실제 값)
const QOO10_DEFAULTS = {
  BrandNo: '0',            // 미지정
  ShippingNo: '806130',    // TracX Logis 무료배송 (실제 배송 템플릿)
  AvailableDateType: '0',  // 영업일 기준 발송
  AvailableDateValue: '2', // 2영업일
  TaxRate: '10',
  AdultYN: 'N',
  ProductionPlaceType: '1' as const, // 1=국내
  ProductionPlace: '대한민국',
};

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // 기존 데이터 전체 삭제
    await db.delete(masterProductVariants);
    await db.delete(masterProducts);
    console.log('✓ 기존 마스터 상품 및 변형 삭제 완료\n');

    // ── 1. 유니섹스 베이직 티셔츠 (옵션 없음) ──────────────────────
    const [tshirt] = await db.insert(masterProducts).values({
      userId: USER_ID,
      code: 'MP-001',
      title: '유니섹스 베이직 코튼 티셔츠',
      descriptionHtml: '<p>고품질 100% 순면 소재의 베이직 티셔츠입니다. 남녀 공용으로 편안한 핏을 제공합니다.</p>',
      brand: 'BASIC LABEL',
      hsCode: '6109.10',
      countryOfOrigin: '대한민국',
      material: '면 100%',
      weightG: 250,
      retailPrice: '29000',
      images: [
        { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', altText: '화이트 티셔츠 정면', order: 0 },
        { url: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800', altText: '화이트 티셔츠 후면', order: 1 },
      ],
      tags: ['티셔츠', '베이직', '유니섹스', '면'],
      attributes: {
        qoo10: {
          SecondSubCat: '300003249', // メンズファッション > トップス > Tシャツ
          BrandNo: QOO10_DEFAULTS.BrandNo,
          ShippingNo: QOO10_DEFAULTS.ShippingNo,
          ItemPrice: '2900',
          ItemQty: '100',
          AvailableDateType: QOO10_DEFAULTS.AvailableDateType,
          AvailableDateValue: QOO10_DEFAULTS.AvailableDateValue,
          TaxRate: QOO10_DEFAULTS.TaxRate,
          AdultYN: QOO10_DEFAULTS.AdultYN,
          ProductionPlaceType: QOO10_DEFAULTS.ProductionPlaceType,
          ProductionPlace: QOO10_DEFAULTS.ProductionPlace,
          Weight: '250',
          Material: '면 100%',
          Keyword: '티셔츠,베이직,면100%,유니섹스',
          ItemDescription: '<p>고품질 100% 순면 소재의 베이직 티셔츠입니다. 남녀 공용으로 편안한 핏을 제공합니다.</p>',
        },
        shopify: {
          status: 'DRAFT',
          vendor: 'BASIC LABEL',
          productType: 'Apparel',
          variantDefaults: {
            inventoryPolicy: 'DENY',
            weightUnit: 'GRAMS',
          },
        },
      },
    }).returning();

    console.log(`✓ 마스터 상품 생성: ${tshirt!.id} — ${tshirt!.title}`);

    // ── 2. 오버사이즈 후드 스웨트셔츠 (색상 × 사이즈 옵션) ──────────
    const [hoodie] = await db.insert(masterProducts).values({
      userId: USER_ID,
      code: 'MP-002',
      title: '오버사이즈 후드 스웨트셔츠',
      descriptionHtml: '<p>두툼한 기모 안감으로 겨울에도 따뜻한 오버사이즈 후드티입니다. 세 가지 색상으로 구성되어 있습니다.</p>',
      brand: 'COZY FIT',
      hsCode: '6110.20',
      countryOfOrigin: '대한민국',
      material: '면 80%, 폴리에스터 20%',
      weightG: 600,
      retailPrice: '59000',
      images: [
        { url: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800', altText: '후드티 블랙', order: 0 },
        { url: 'https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=800', altText: '후드티 그레이', order: 1 },
      ],
      tags: ['후드티', '오버사이즈', '기모', '겨울'],
      attributes: {
        qoo10: {
          SecondSubCat: '300002279', // メンズファッション > アウター > パーカー・トレーナー
          BrandNo: QOO10_DEFAULTS.BrandNo,
          ShippingNo: QOO10_DEFAULTS.ShippingNo,
          ItemPrice: '5900',
          ItemQty: '0',
          AvailableDateType: QOO10_DEFAULTS.AvailableDateType,
          AvailableDateValue: QOO10_DEFAULTS.AvailableDateValue,
          TaxRate: QOO10_DEFAULTS.TaxRate,
          AdultYN: QOO10_DEFAULTS.AdultYN,
          ProductionPlaceType: QOO10_DEFAULTS.ProductionPlaceType,
          ProductionPlace: QOO10_DEFAULTS.ProductionPlace,
          Weight: '600',
          Material: '면 80%, 폴리에스터 20%',
          Keyword: '후드티,오버사이즈,기모,겨울',
          ItemDescription: '<p>두툼한 기모 안감으로 겨울에도 따뜻한 오버사이즈 후드티입니다. 세 가지 색상으로 구성되어 있습니다.</p>',
        },
        shopify: {
          status: 'DRAFT',
          vendor: 'COZY FIT',
          productType: 'Apparel',
          variantDefaults: {
            inventoryPolicy: 'DENY',
            weightUnit: 'GRAMS',
          },
        },
      },
    }).returning();

    console.log(`✓ 마스터 상품 생성: ${hoodie!.id} — ${hoodie!.title}`);

    // 후드티 변형 (색상 × 사이즈)
    const hoodieVariants = [
      { color: '블랙', size: 'M', sku: 'MP-002-BLK-M', price: '59000', stock: 30 },
      { color: '블랙', size: 'L', sku: 'MP-002-BLK-L', price: '59000', stock: 25 },
      { color: '블랙', size: 'XL', sku: 'MP-002-BLK-XL', price: '59000', stock: 20 },
      { color: '그레이', size: 'M', sku: 'MP-002-GRY-M', price: '59000', stock: 20 },
      { color: '그레이', size: 'L', sku: 'MP-002-GRY-L', price: '59000', stock: 15 },
      { color: '아이보리', size: 'M', sku: 'MP-002-IVR-M', price: '59000', stock: 10 },
      { color: '아이보리', size: 'L', sku: 'MP-002-IVR-L', price: '59000', stock: 10 },
    ];

    await db.insert(masterProductVariants).values(
      hoodieVariants.map((v) => ({
        masterProductId: hoodie!.id,
        sku: v.sku,
        optionName: `색상:${v.color}`,
        optionValue: v.size,
        price: v.price,
        stock: v.stock,
        extraAttributes: { color: v.color, size: v.size },
      })),
    );
    console.log(`  └ 변형 ${hoodieVariants.length}개 생성`);

    // ── 3. 히알루론산 수분 앰플 (단품) ────────────────────────────
    const [skincare] = await db.insert(masterProducts).values({
      userId: USER_ID,
      code: 'MP-003',
      title: '히알루론산 수분 앰플 50ml',
      descriptionHtml: '<p>고농도 히알루론산 성분으로 피부 깊숙이 수분을 공급하는 앰플입니다. 자극 없는 순한 포뮬라.</p>',
      brand: 'PURE SKIN LAB',
      hsCode: '3304.99',
      countryOfOrigin: '대한민국',
      material: null,
      weightG: 120,
      retailPrice: '45000',
      images: [
        { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800', altText: '히알루론산 앰플', order: 0 },
      ],
      tags: ['스킨케어', '앰플', '수분', '히알루론산', '민감성'],
      attributes: {
        qoo10: {
          SecondSubCat: '320001623', // スキンケア > 基礎化粧品 > 美容液
          BrandNo: QOO10_DEFAULTS.BrandNo,
          ShippingNo: QOO10_DEFAULTS.ShippingNo,
          ItemPrice: '4500',
          ItemQty: '200',
          AvailableDateType: QOO10_DEFAULTS.AvailableDateType,
          AvailableDateValue: QOO10_DEFAULTS.AvailableDateValue,
          TaxRate: '8', // 화장품 경감세율 8%
          AdultYN: QOO10_DEFAULTS.AdultYN,
          ProductionPlaceType: QOO10_DEFAULTS.ProductionPlaceType,
          ProductionPlace: QOO10_DEFAULTS.ProductionPlace,
          Weight: '120',
          Keyword: '앰플,수분,히알루론산,스킨케어',
          ItemDescription: '<p>고농도 히알루론산 성분으로 피부 깊숙이 수분을 공급하는 앰플입니다. 자극 없는 순한 포뮬라.</p>',
        },
        shopify: {
          status: 'DRAFT',
          vendor: 'PURE SKIN LAB',
          productType: 'Skincare',
          variantDefaults: {
            inventoryPolicy: 'DENY',
          },
        },
      },
    }).returning();

    console.log(`✓ 마스터 상품 생성: ${skincare!.id} — ${skincare!.title}`);

    // ── 4. 완전 무선 블루투스 이어폰 (단품) ───────────────────────
    const [earphones] = await db.insert(masterProducts).values({
      userId: USER_ID,
      code: 'MP-004',
      title: '완전 무선 블루투스 이어폰 TWS-Pro',
      descriptionHtml: '<p>액티브 노이즈 캔슬링(ANC) 탑재, 최대 28시간 연속 사용 가능한 프리미엄 TWS 이어폰입니다.</p>',
      brand: 'SONIQ',
      hsCode: '8518.30',
      countryOfOrigin: '중국',
      material: null,
      weightG: 58,
      retailPrice: '89000',
      images: [
        { url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800', altText: '무선 이어폰', order: 0 },
        { url: 'https://images.unsplash.com/photo-1605464315542-bda3e2f4e605?w=800', altText: '이어폰 케이스', order: 1 },
      ],
      tags: ['이어폰', '블루투스', 'ANC', '무선', 'TWS'],
      attributes: {
        qoo10: {
          SecondSubCat: '320002463', // イヤホン・ヘッドホン > イヤホン > ワイヤレスイヤホン
          BrandNo: QOO10_DEFAULTS.BrandNo,
          ShippingNo: QOO10_DEFAULTS.ShippingNo,
          ItemPrice: '8900',
          ItemQty: '50',
          AvailableDateType: QOO10_DEFAULTS.AvailableDateType,
          AvailableDateValue: QOO10_DEFAULTS.AvailableDateValue,
          TaxRate: QOO10_DEFAULTS.TaxRate,
          AdultYN: QOO10_DEFAULTS.AdultYN,
          ProductionPlaceType: '2' as const, // 2=해외
          ProductionPlace: '중국',
          Weight: '58',
          Keyword: '이어폰,블루투스,노이즈캔슬링,ANC,TWS',
          ItemDescription: '<p>액티브 노이즈 캔슬링(ANC) 탑재, 최대 28시간 연속 사용 가능한 프리미엄 TWS 이어폰입니다.</p>',
        },
        shopify: {
          status: 'DRAFT',
          vendor: 'SONIQ',
          productType: 'Electronics',
          variantDefaults: {
            inventoryPolicy: 'DENY',
            weightUnit: 'GRAMS',
          },
        },
      },
    }).returning();

    console.log(`✓ 마스터 상품 생성: ${earphones!.id} — ${earphones!.title}`);

    // ── 5. 스테인리스 진공 보온 텀블러 (용량 옵션) ────────────────
    const [tumbler] = await db.insert(masterProducts).values({
      userId: USER_ID,
      code: 'MP-005',
      title: '스테인리스 진공 보온 텀블러',
      descriptionHtml: '<p>이중 진공 단열 구조로 12시간 보온·보냉이 가능한 스테인리스 텀블러입니다. 리크프루프 뚜껑 적용.</p>',
      brand: 'KEEPWARM',
      hsCode: '7323.93',
      countryOfOrigin: '중국',
      material: '스테인리스 304',
      weightG: 340,
      retailPrice: '35000',
      images: [
        { url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800', altText: '스테인리스 텀블러', order: 0 },
      ],
      tags: ['텀블러', '보온', '보냉', '스테인리스', '친환경'],
      attributes: {
        qoo10: {
          SecondSubCat: '320000794', // キッチン用品 > キッチン雑貨 > 水筒・マグボトル
          BrandNo: QOO10_DEFAULTS.BrandNo,
          ShippingNo: QOO10_DEFAULTS.ShippingNo,
          ItemPrice: '3500',
          ItemQty: '0',
          AvailableDateType: QOO10_DEFAULTS.AvailableDateType,
          AvailableDateValue: QOO10_DEFAULTS.AvailableDateValue,
          TaxRate: QOO10_DEFAULTS.TaxRate,
          AdultYN: QOO10_DEFAULTS.AdultYN,
          ProductionPlaceType: '2' as const, // 2=해외
          ProductionPlace: '중국',
          Weight: '340',
          Material: '스테인리스 304',
          Keyword: '텀블러,보온,보냉,스테인리스,친환경',
          ItemDescription: '<p>이중 진공 단열 구조로 12시간 보온·보냉이 가능한 스테인리스 텀블러입니다. 리크프루프 뚜껑 적용.</p>',
        },
        shopify: {
          status: 'DRAFT',
          vendor: 'KEEPWARM',
          productType: 'Kitchen',
          variantDefaults: {
            inventoryPolicy: 'DENY',
            weightUnit: 'GRAMS',
          },
        },
      },
    }).returning();

    console.log(`✓ 마스터 상품 생성: ${tumbler!.id} — ${tumbler!.title}`);

    // 텀블러 변형 (용량)
    await db.insert(masterProductVariants).values([
      { masterProductId: tumbler!.id, sku: 'MP-005-350', optionName: '용량', optionValue: '350ml', price: '32000', stock: 40 },
      { masterProductId: tumbler!.id, sku: 'MP-005-500', optionName: '용량', optionValue: '500ml', price: '35000', stock: 50 },
      { masterProductId: tumbler!.id, sku: 'MP-005-700', optionName: '용량', optionValue: '700ml', price: '39000', stock: 30 },
    ]);
    console.log('  └ 변형 3개 생성');

    console.log('\n=== 시드 완료: 마스터 상품 5개 생성 ===');
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('시드 실패:', err);
  process.exit(1);
});
