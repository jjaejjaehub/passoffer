import { Suspense } from "react";
import { ChannelHealthPage } from "@/pages/settings-channels";

export const dynamic = "force-dynamic";

export default function Page(): React.JSX.Element {
  return (
    <Suspense>
      <ChannelHealthPage />
    </Suspense>
  );
}
