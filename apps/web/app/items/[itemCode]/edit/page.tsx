import dynamic from "next/dynamic";
import PageSkeleton from "@/shared/ui/PageSkeleton";

const ItemEditPage = dynamic(
  () => import("@/pages/item-edit").then((module) => module.ItemEditPage),
  {
    loading: () => <PageSkeleton />,
  },
);

export default ItemEditPage;
