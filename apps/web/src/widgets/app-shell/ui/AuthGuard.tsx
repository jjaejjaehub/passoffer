"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/shared/config";
import { getToken } from "@/entities/auth/model/token";

const PUBLIC_PATHS: readonly string[] = [ROUTES.auth.login, ROUTES.auth.signup];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps): React.JSX.Element | null {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const publicPath = isPublicPath(pathname);

    if (!token && !publicPath) {
      const target = `${ROUTES.auth.login}?from=${encodeURIComponent(pathname ?? "/")}`;
      router.replace(target);
      return;
    }
    if (token && publicPath) {
      const from = searchParams?.get("from");
      router.replace(from && from.startsWith("/") ? from : ROUTES.dashboard);
      return;
    }
    setReady(true);
  }, [pathname, router, searchParams]);

  if (!ready) return null;
  return <>{children}</>;
}
