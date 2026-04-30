import { Suspense } from "react";
import { LoginPage } from "@/pages/auth";

export default function Page(): React.JSX.Element {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
