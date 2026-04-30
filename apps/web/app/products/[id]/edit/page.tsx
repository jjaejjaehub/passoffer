import { ShopifyProductEditForm } from "@/pages/product-edit";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductEditPage({ params }: Props): Promise<React.JSX.Element> {
  const { id } = await params;
  // URL 파라미터(숫자 ID)를 Shopify GID로 복원
  const productGid = `gid://shopify/Product/${id}`;
  return <ShopifyProductEditForm productId={productGid} />;
}
