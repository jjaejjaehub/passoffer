import { Suspense } from "react";
import { ChannelsSettingsPage } from "@/pages/settings-channels";

export default function Page(): React.JSX.Element {
  return (
    <Suspense>
      <ChannelsSettingsPage />
    </Suspense>
  );
}
