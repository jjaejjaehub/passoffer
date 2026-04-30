import { WarehouseDetailPage } from "@/pages/warehouses";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <WarehouseDetailPage id={id} />;
}
