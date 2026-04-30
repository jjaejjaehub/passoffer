import { MasterProductFormPage } from "@/pages/master-products";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props): Promise<React.JSX.Element> {
  const { id } = await params;
  return <MasterProductFormPage id={id} />;
}
