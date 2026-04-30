import type { Order } from '@/src/entities/order'
import { subHours, subDays, subMinutes } from 'date-fns'

const now = new Date()

// Helper to create order history
function createHistory(
  status: Order['status'],
  createdAt: Date,
  actor: string = '시스템'
): Order['history'] {
  const history: Order['history'] = []
  const statuses: Order['status'][] = ['신규']

  if (
    ['처리중', '배송준비', '배송중', '완료', '취소', '반품'].includes(status)
  ) {
    statuses.push('처리중')
  }
  if (['배송준비', '배송중', '완료', '반품'].includes(status)) {
    statuses.push('배송준비')
  }
  if (['배송중', '완료', '반품'].includes(status)) {
    statuses.push('배송중')
  }
  if (['완료'].includes(status)) {
    statuses.push('완료')
  }
  if (status === '취소') {
    statuses.push('취소')
  }
  if (status === '반품') {
    statuses.push('반품')
  }

  statuses.forEach((s, i) => {
    history.push({
      id: `hist-${i}`,
      status: s,
      timestamp: new Date(createdAt.getTime() + i * 3600000),
      actor: i === 0 ? '시스템' : actor,
      note: i === 0 ? '주문 접수됨' : undefined,
    })
  })

  return history
}

export const MOCK_ORDERS: Order[] = [
  // 신규 3건 (2건은 3시간 이상 전 - 지연 경고용)
  {
    id: 'ORD-240316-001',
    channelOrderId: 'GQ-20240316-00001',
    channelId: 'qoo10',
    status: '신규',
    items: [
      {
        id: 'item-1',
        productName: '여성 오버핏 후드집업',
        option: '색상: 베이지 / 사이즈: M',
        quantity: 1,
        unitPrice: 45000,
        totalPrice: 45000,
      },
    ],
    totalQuantity: 1,
    subtotal: 45000,
    shippingFee: 3000,
    discount: 0,
    totalAmount: 48000,
    paymentMethod: '신용카드',
    buyer: { name: '김민지', phone: '010-1234-5678', email: 'minji@email.com' },
    shipping: {
      recipient: '김민지',
      phone: '010-1234-5678',
      zipCode: '06234',
      address1: '서울특별시 강남구 테헤란로 123',
      address2: '456호',
      deliveryMemo: '부재 시 경비실에 맡겨주세요',
    },
    history: createHistory('신규', subHours(now, 4), '시스템'),
    createdAt: subHours(now, 4), // 4시간 전 - 지연 경고
    updatedAt: subHours(now, 4),
    assignee: 'kim',
  },
  {
    id: 'ORD-240316-002',
    channelOrderId: 'GQ-20240316-00002',
    channelId: 'qoo10',
    status: '신규',
    items: [
      {
        id: 'item-2',
        productName: '무선 블루투스 이어폰 ANC Pro',
        quantity: 1,
        unitPrice: 89000,
        totalPrice: 89000,
      },
    ],
    totalQuantity: 1,
    subtotal: 89000,
    shippingFee: 0,
    discount: 5000,
    totalAmount: 84000,
    paymentMethod: '카카오페이',
    buyer: { name: '이준혁', phone: '010-2345-6789' },
    shipping: {
      recipient: '이준혁',
      phone: '010-2345-6789',
      zipCode: '13494',
      address1: '경기도 성남시 분당구 판교로 234',
      address2: '판교테크노밸리 A동 1201호',
    },
    history: createHistory('신규', subHours(now, 3), '시스템'),
    createdAt: subHours(now, 3), // 3시간 전 - 지연 경고
    updatedAt: subHours(now, 3),
  },
  {
    id: 'ORD-240316-003',
    channelOrderId: 'GQ-20240316-00003',
    channelId: 'qoo10',
    status: '신규',
    items: [
      {
        id: 'item-3',
        productName: '수분 크림 50ml',
        quantity: 2,
        unitPrice: 32000,
        totalPrice: 64000,
      },
      {
        id: 'item-4',
        productName: '비타민C 세럼 30ml',
        option: '2개 세트',
        quantity: 1,
        unitPrice: 28000,
        totalPrice: 28000,
      },
    ],
    totalQuantity: 3,
    subtotal: 92000,
    shippingFee: 0,
    discount: 10000,
    totalAmount: 82000,
    paymentMethod: '신용카드',
    buyer: { name: '박소연', phone: '010-3456-7890' },
    shipping: {
      recipient: '박소연',
      phone: '010-3456-7890',
      zipCode: '48060',
      address1: '부산광역시 해운대구 마린시티 1로 123',
      address2: '마린파크 1차 1502호',
      deliveryMemo: '문 앞에 놓아주세요',
    },
    history: createHistory('신규', subMinutes(now, 30), '시스템'),
    createdAt: subMinutes(now, 30), // 30분 전 - 신규 표시
    updatedAt: subMinutes(now, 30),
  },

  // 처리중 2건
  {
    id: 'ORD-240315-004',
    channelOrderId: 'GQ-20240315-00004',
    channelId: 'qoo10',
    status: '처리중',
    items: [
      {
        id: 'item-5',
        productName: '남성 린넨 반팔 셔츠',
        option: '색상: 네이비 / 사이즈: L',
        quantity: 1,
        unitPrice: 59000,
        totalPrice: 59000,
      },
    ],
    totalQuantity: 1,
    subtotal: 59000,
    shippingFee: 3000,
    discount: 0,
    totalAmount: 62000,
    paymentMethod: '네이버페이',
    buyer: { name: '최다현', phone: '010-4567-8901' },
    shipping: {
      recipient: '최다현',
      phone: '010-4567-8901',
      zipCode: '41566',
      address1: '대구광역시 북구 대학로 80',
      address2: '경북대학교 기숙사 A동 305호',
    },
    history: createHistory('처리중', subDays(now, 1), '김운영'),
    createdAt: subDays(now, 1),
    updatedAt: subHours(now, 6),
    assignee: 'kim',
  },
  {
    id: 'ORD-240315-005',
    channelOrderId: 'GQ-20240315-00005',
    channelId: 'qoo10',
    status: '처리중',
    items: [
      {
        id: 'item-6',
        productName: '스마트 체중계',
        option: '앱 연동',
        quantity: 1,
        unitPrice: 45000,
        totalPrice: 45000,
      },
    ],
    totalQuantity: 1,
    subtotal: 45000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 45000,
    paymentMethod: '신용카드',
    buyer: { name: '정우성', phone: '010-5678-9012' },
    shipping: {
      recipient: '정우성',
      phone: '010-5678-9012',
      zipCode: '21999',
      address1: '인천광역시 연수구 송도과학로 32',
      address2: '송도자이하버뷰 1103동 2501호',
    },
    history: createHistory('처리중', subDays(now, 1), '이수진'),
    createdAt: subDays(now, 1),
    updatedAt: subHours(now, 4),
    assignee: 'lee',
  },

  // 배송준비 3건
  {
    id: 'ORD-240314-006',
    channelOrderId: 'GQ-20240314-00006',
    channelId: 'qoo10',
    status: '배송준비',
    items: [
      {
        id: 'item-7',
        productName: '천연 라텍스 베개',
        option: '일반형',
        quantity: 2,
        unitPrice: 78000,
        totalPrice: 156000,
      },
    ],
    totalQuantity: 2,
    subtotal: 156000,
    shippingFee: 0,
    discount: 15000,
    totalAmount: 141000,
    paymentMethod: '카카오페이',
    buyer: { name: '한지민', phone: '010-6789-0123' },
    shipping: {
      recipient: '한지민',
      phone: '010-6789-0123',
      zipCode: '06035',
      address1: '서울특별시 강남구 압구정로 29길 32',
      address2: '현대아파트 101동 1801호',
    },
    history: createHistory('배송준비', subDays(now, 2), '박정호'),
    createdAt: subDays(now, 2),
    updatedAt: subHours(now, 12),
    assignee: 'park',
  },
  {
    id: 'ORD-240314-007',
    channelOrderId: 'GQ-20240314-00007',
    channelId: 'qoo10',
    status: '배송준비',
    items: [
      {
        id: 'item-8',
        productName: '스테인리스 텀블러 500ml',
        option: '색상: 블랙',
        quantity: 3,
        unitPrice: 25000,
        totalPrice: 75000,
      },
      {
        id: 'item-9',
        productName: '실리콘 빨대 세트',
        quantity: 1,
        unitPrice: 12000,
        totalPrice: 12000,
      },
    ],
    totalQuantity: 4,
    subtotal: 87000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 87000,
    paymentMethod: '신용카드',
    buyer: { name: '오세진', phone: '010-7890-1234' },
    shipping: {
      recipient: '오세진',
      phone: '010-7890-1234',
      zipCode: '34014',
      address1: '대전광역시 유성구 대학로 99',
      address2: '카이스트 기숙사 나동 412호',
      deliveryMemo: '배송 전 전화 부탁드립니다',
    },
    history: createHistory('배송준비', subDays(now, 2), '김운영'),
    createdAt: subDays(now, 2),
    updatedAt: subHours(now, 8),
    assignee: 'kim',
  },
  {
    id: 'ORD-240314-008',
    channelOrderId: 'GQ-20240314-00008',
    channelId: 'qoo10',
    status: '배송준비',
    items: [
      {
        id: 'item-10',
        productName: '프리미엄 요가 매트 10mm',
        option: '색상: 퍼플',
        quantity: 1,
        unitPrice: 45000,
        totalPrice: 45000,
      },
    ],
    totalQuantity: 1,
    subtotal: 45000,
    shippingFee: 3000,
    discount: 0,
    totalAmount: 48000,
    paymentMethod: '네이버페이',
    buyer: { name: '윤아름', phone: '010-8901-2345' },
    shipping: {
      recipient: '윤아름',
      phone: '010-8901-2345',
      zipCode: '61186',
      address1: '광주광역시 북구 용봉로 77',
      address2: '전남대학교 정문 앞 편의점',
    },
    history: createHistory('배송준비', subDays(now, 2), '이수진'),
    createdAt: subDays(now, 2),
    updatedAt: subHours(now, 10),
    assignee: 'lee',
  },

  // 배송중 4건
  {
    id: 'ORD-240313-009',
    channelOrderId: 'GQ-20240313-00009',
    channelId: 'qoo10',
    status: '배송중',
    items: [
      {
        id: 'item-11',
        productName: '고급 가죽 지갑',
        option: '색상: 브라운',
        quantity: 1,
        unitPrice: 120000,
        totalPrice: 120000,
      },
    ],
    totalQuantity: 1,
    subtotal: 120000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 120000,
    paymentMethod: '신용카드',
    buyer: { name: '김민지', phone: '010-1234-5678' },
    shipping: {
      recipient: '김민지',
      phone: '010-1234-5678',
      zipCode: '06234',
      address1: '서울특별시 강남구 테헤란로 123',
      address2: '456호',
    },
    tracking: {
      carrierId: 'cj',
      carrierName: 'CJ대한통운',
      trackingNumber: '1234-5678-9012',
      registeredAt: subDays(now, 1),
      sentToChannel: true,
    },
    history: createHistory('배송중', subDays(now, 3), '김운영'),
    createdAt: subDays(now, 3),
    updatedAt: subDays(now, 1),
    assignee: 'kim',
  },
  {
    id: 'ORD-240313-010',
    channelOrderId: 'GQ-20240313-00010',
    channelId: 'qoo10',
    status: '배송중',
    items: [
      {
        id: 'item-12',
        productName: '프리미엄 캔들 세트',
        option: '향: 라벤더',
        quantity: 1,
        unitPrice: 65000,
        totalPrice: 65000,
      },
      {
        id: 'item-13',
        productName: '캔들 워머',
        quantity: 1,
        unitPrice: 35000,
        totalPrice: 35000,
      },
    ],
    totalQuantity: 2,
    subtotal: 100000,
    shippingFee: 0,
    discount: 10000,
    totalAmount: 90000,
    paymentMethod: '카카오페이',
    buyer: { name: '이준혁', phone: '010-2345-6789' },
    shipping: {
      recipient: '이준혁',
      phone: '010-2345-6789',
      zipCode: '13494',
      address1: '경기도 성남시 분당구 판교로 234',
      address2: '판교테크노밸리 A동 1201호',
    },
    tracking: {
      carrierId: 'lotte',
      carrierName: '롯데택배',
      trackingNumber: '2345-6789-0123',
      registeredAt: subDays(now, 1),
      sentToChannel: true,
    },
    history: createHistory('배송중', subDays(now, 3), '이수진'),
    createdAt: subDays(now, 3),
    updatedAt: subDays(now, 1),
    assignee: 'lee',
  },
  {
    id: 'ORD-240312-011',
    channelOrderId: 'GQ-20240312-00011',
    channelId: 'qoo10',
    status: '배송중',
    items: [
      {
        id: 'item-14',
        productName: '무선 충전 패드',
        quantity: 1,
        unitPrice: 29000,
        totalPrice: 29000,
      },
    ],
    totalQuantity: 1,
    subtotal: 29000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 29000,
    paymentMethod: '신용카드',
    buyer: { name: '박소연', phone: '010-3456-7890' },
    shipping: {
      recipient: '박소연',
      phone: '010-3456-7890',
      zipCode: '48060',
      address1: '부산광역시 해운대구 마린시티 1로 123',
      address2: '마린파크 1차 1502호',
    },
    tracking: {
      carrierId: 'hanjin',
      carrierName: '한진택배',
      trackingNumber: '3456-7890-1234',
      registeredAt: subDays(now, 2),
      sentToChannel: true,
    },
    history: createHistory('배송중', subDays(now, 4), '박정호'),
    createdAt: subDays(now, 4),
    updatedAt: subDays(now, 2),
    assignee: 'park',
  },
  {
    id: 'ORD-240312-012',
    channelOrderId: 'GQ-20240312-00012',
    channelId: 'qoo10',
    status: '배송중',
    items: [
      {
        id: 'item-15',
        productName: '접이식 노트북 거치대',
        option: '색상: 실버',
        quantity: 1,
        unitPrice: 35000,
        totalPrice: 35000,
      },
    ],
    totalQuantity: 1,
    subtotal: 35000,
    shippingFee: 3000,
    discount: 0,
    totalAmount: 38000,
    paymentMethod: '네이버페이',
    buyer: { name: '최다현', phone: '010-4567-8901' },
    shipping: {
      recipient: '최다현',
      phone: '010-4567-8901',
      zipCode: '41566',
      address1: '대구광역시 북구 대학로 80',
      address2: '경북대학교 기숙사 A동 305호',
    },
    tracking: {
      carrierId: 'epost',
      carrierName: '우체국택배',
      trackingNumber: '4567-8901-2345',
      registeredAt: subDays(now, 2),
      sentToChannel: true,
    },
    history: createHistory('배송중', subDays(now, 4), '김운영'),
    createdAt: subDays(now, 4),
    updatedAt: subDays(now, 2),
    assignee: 'kim',
  },

  // 완료 2건
  {
    id: 'ORD-240310-013',
    channelOrderId: 'GQ-20240310-00013',
    channelId: 'qoo10',
    status: '완료',
    items: [
      {
        id: 'item-16',
        productName: '프리미엄 타월 세트',
        option: '색상: 화이트 / 6장',
        quantity: 1,
        unitPrice: 89000,
        totalPrice: 89000,
      },
    ],
    totalQuantity: 1,
    subtotal: 89000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 89000,
    paymentMethod: '신용카드',
    buyer: { name: '정우성', phone: '010-5678-9012' },
    shipping: {
      recipient: '정우성',
      phone: '010-5678-9012',
      zipCode: '21999',
      address1: '인천광역시 연수구 송도과학로 32',
      address2: '송도자이하버뷰 1103동 2501호',
    },
    tracking: {
      carrierId: 'cj',
      carrierName: 'CJ대한통운',
      trackingNumber: '5678-9012-3456',
      registeredAt: subDays(now, 5),
      sentToChannel: true,
    },
    history: createHistory('완료', subDays(now, 6), '이수진'),
    createdAt: subDays(now, 6),
    updatedAt: subDays(now, 3),
    assignee: 'lee',
  },
  {
    id: 'ORD-240309-014',
    channelOrderId: 'GQ-20240309-00014',
    channelId: 'qoo10',
    status: '완료',
    items: [
      {
        id: 'item-17',
        productName: '고급 선글라스',
        option: '프레임: 골드',
        quantity: 1,
        unitPrice: 340000,
        totalPrice: 340000,
      },
    ],
    totalQuantity: 1,
    subtotal: 340000,
    shippingFee: 0,
    discount: 20000,
    totalAmount: 320000,
    paymentMethod: '카카오페이',
    buyer: { name: '한지민', phone: '010-6789-0123' },
    shipping: {
      recipient: '한지민',
      phone: '010-6789-0123',
      zipCode: '06035',
      address1: '서울특별시 강남구 압구정로 29길 32',
      address2: '현대아파트 101동 1801호',
    },
    tracking: {
      carrierId: 'lotte',
      carrierName: '롯데택배',
      trackingNumber: '6789-0123-4567',
      registeredAt: subDays(now, 6),
      sentToChannel: true,
    },
    history: createHistory('완료', subDays(now, 7), '박정호'),
    createdAt: subDays(now, 7),
    updatedAt: subDays(now, 4),
    assignee: 'park',
  },

  // Rakuten 배송준비 2건 (인라인 입력 테스트용)
  {
    id: 'ORD-240315-016',
    channelOrderId: 'R202401150002',
    channelId: 'rakuten',
    status: '배송준비',
    shipDate: null, // 발송 예정일 미입력 상태 → locked 모드 확인용
    items: [
      {
        id: 'item-19',
        productName: '抹茶キットカット 詰め合わせ',
        option: '24個入り',
        quantity: 2,
        unitPrice: 3500,
        totalPrice: 7000,
      },
    ],
    totalQuantity: 2,
    subtotal: 7000,
    shippingFee: 800,
    discount: 0,
    totalAmount: 7800,
    paymentMethod: 'クレジットカード',
    buyer: { name: '山田太郎', phone: '090-1234-5678' },
    shipping: {
      recipient: '山田太郎',
      phone: '090-1234-5678',
      zipCode: '150-0001',
      address1: '東京都渋谷区神宮前1-2-3',
      address2: 'ABCマンション 101号',
      deliveryMemo: '不在時は宅配ボックスへ',
    },
    history: createHistory('배송준비', subDays(now, 1), '김운영'),
    createdAt: subDays(now, 1),
    updatedAt: subHours(now, 6),
    assignee: 'kim',
  },
  {
    id: 'ORD-240315-017',
    channelOrderId: 'R202401150008',
    channelId: 'rakuten',
    status: '배송준비',
    shipDate: '2024.01.17', // 발송 예정일 입력됨 → editing 모드 확인용
    items: [
      {
        id: 'item-20',
        productName: 'ポケモン ぬいぐるみ ピカチュウ',
        option: 'Lサイズ',
        quantity: 1,
        unitPrice: 4200,
        totalPrice: 4200,
      },
    ],
    totalQuantity: 1,
    subtotal: 4200,
    shippingFee: 500,
    discount: 0,
    totalAmount: 4700,
    paymentMethod: '楽天ペイ',
    buyer: { name: '鈴木花子', phone: '080-9876-5432' },
    shipping: {
      recipient: '鈴木花子',
      phone: '080-9876-5432',
      zipCode: '530-0001',
      address1: '大阪府大阪市北区梅田1-1-1',
      address2: 'グランフロント大阪 タワーA 2501',
    },
    history: createHistory('배송준비', subDays(now, 1), '이수진'),
    createdAt: subDays(now, 1),
    updatedAt: subHours(now, 4),
    assignee: 'lee',
  },

  // 취소 1건
  {
    id: 'ORD-240308-015',
    channelOrderId: 'GQ-20240308-00015',
    channelId: 'qoo10',
    status: '취소',
    items: [
      {
        id: 'item-18',
        productName: '가습기 필터',
        quantity: 5,
        unitPrice: 12000,
        totalPrice: 60000,
      },
    ],
    totalQuantity: 5,
    subtotal: 60000,
    shippingFee: 0,
    discount: 0,
    totalAmount: 60000,
    paymentMethod: '신용카드',
    buyer: { name: '오세진', phone: '010-7890-1234' },
    shipping: {
      recipient: '오세진',
      phone: '010-7890-1234',
      zipCode: '34014',
      address1: '대전광역시 유성구 대학로 99',
      address2: '카이스트 기숙사 나동 412호',
    },
    history: [
      ...createHistory('취소', subDays(now, 8), '고객'),
      {
        id: 'hist-cancel',
        status: '취소',
        timestamp: subDays(now, 7),
        actor: '고객',
        note: '고객 요청으로 취소',
      },
    ],
    createdAt: subDays(now, 8),
    updatedAt: subDays(now, 7),
  },
]

// Status count helper
export function getStatusCounts(
  orders: Order[]
): { status: Order['status'] | '전체' | '취소·반품'; count: number }[] {
  const counts: Record<string, number> = {
    전체: orders.length,
    신규: 0,
    처리중: 0,
    배송준비: 0,
    배송중: 0,
    완료: 0,
    '취소·반품': 0,
  }

  orders.forEach((order) => {
    if (order.status === '취소' || order.status === '반품') {
      counts['취소·반품']++
    } else {
      counts[order.status]++
    }
  })

  return [
    { status: '전체', count: counts['전체'] },
    { status: '신규', count: counts['신규'] },
    { status: '처리중', count: counts['처리중'] },
    { status: '배송준비', count: counts['배송준비'] },
    { status: '배송중', count: counts['배송중'] },
    { status: '완료', count: counts['완료'] },
    { status: '취소·반품', count: counts['취소·반품'] },
  ]
}
