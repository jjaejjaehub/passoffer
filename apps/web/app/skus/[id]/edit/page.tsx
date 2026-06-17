import { SkuFormPage } from "@/pages/skus";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props): Promise<React.JSX.Element> {
  const { id } = await params;
  return <SkuFormPage id={id} />;
}
