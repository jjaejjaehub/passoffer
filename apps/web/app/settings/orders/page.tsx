import { Suspense } from "react";
import { OrderSettingsPage } from "@/pages/settings-orders";

export default function Page(): React.JSX.Element {
  return (
    <Suspense>
      <OrderSettingsPage />
    </Suspense>
  );
}
